"""Supabase database implementation.

Implements the persistence layer for VibeAudit using the supabase-py client.
Tables: scans, findings — per phase2.md Contract 1.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env.local first (project convention), fall back to .env
_backend_dir = Path(__file__).resolve().parent
_env_local = _backend_dir / ".env.local"
_env_default = _backend_dir / ".env"

if _env_local.exists():
    load_dotenv(_env_local)
elif _env_default.exists():
    load_dotenv(_env_default)
else:
    load_dotenv()  # walk up to find any .env

logger = logging.getLogger("backend.database")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client | None = None


async def init_db() -> None:
    """Initialize the Supabase client.

    Tables are created via the Supabase dashboard.
    This function is kept for interface compatibility.
    """
    global supabase
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — database not initialized.")
        return
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", e)


async def save_scan(scan_id: str, result: Any, source: str, verdict: str) -> str:
    """Persist a ScanResult to the scans + findings tables.

    Args:
        scan_id: UUID for this scan (also becomes scans.id)
        result: ScanResult instance from the vibe_check engine
        source: trigger source — 'webhook' | 'url' | 'oauth' | 'zip'
        verdict: 'GO' | 'NO-GO' (pre-mapped by scan_runner)

    Returns:
        scan_id on success or failure.
    """
    if not supabase:
        logger.error("Database not initialized — scan %s not persisted.", scan_id)
        return scan_id

    try:
        # ── Insert scan row ──────────────────────────────────────────────────
        scan_row = {
            "id": scan_id,
            "repo_name": result.repo_path,
            "trigger_source": source,
            "verdict": verdict,
            "total_score": result.score,
            "category_scores_json": result.category_scores,  # dict → JSONB
            "finding_count": len(result.findings),
            "report_json": json.loads(result.to_json()),      # str → dict → JSONB
        }
        supabase.table("scans").insert(scan_row).execute()
        logger.info("Saved scan %s (verdict=%s, score=%.1f)", scan_id, verdict, result.score)

        # ── Insert findings rows ─────────────────────────────────────────────
        if result.findings:
            finding_rows = [
                {
                    "id": finding.id,
                    "scan_id": scan_id,
                    "title": finding.title,
                    "severity": finding.severity.value,
                    "category": finding.category.value,
                    "file_path": finding.file,
                    "line_number": finding.line,
                    "description": finding.description,
                    "remediation": finding.remediation,
                    "ai_prompt": finding.ai_prompt,
                    "tool": finding.tool,
                }
                for finding in result.findings
            ]
            supabase.table("findings").insert(finding_rows).execute()
            logger.info("Saved %d findings for scan %s", len(finding_rows), scan_id)

    except Exception as e:
        logger.error("Error saving scan %s: %s", scan_id, e)

    return scan_id


async def get_scan(scan_id: str) -> dict | None:
    """Fetch a full scan report by ID, including its findings.

    Returns a dict matching the GET /report/{id} response shape, or None.
    """
    if not supabase:
        logger.error("Database not initialized.")
        return None

    try:
        scan_res = (
            supabase.table("scans")
            .select("*")
            .eq("id", scan_id)
            .single()
            .execute()
        )
        if not scan_res.data:
            return None

        row = scan_res.data

        findings_res = (
            supabase.table("findings")
            .select("*")
            .eq("scan_id", scan_id)
            .execute()
        )

        # Extract extra metadata from the full report JSON
        report_json = row.get("report_json") or {}

        # Enrich findings with extra fields from report_json if available
        db_findings = findings_res.data or []
        rj_findings = report_json.get("findings", [])

        # Build a lookup of report_json findings by id for enrichment
        rj_lookup: dict[str, dict] = {}
        for rf in rj_findings:
            fid = rf.get("id")
            if fid:
                rj_lookup[fid] = rf

        enriched_findings = []
        for f in db_findings:
            fid = f.get("id", "")
            rj = rj_lookup.get(fid, {})
            # Add fields that may not be in the DB table
            f.setdefault("cwe", rj.get("cwe"))
            f.setdefault("confidence", rj.get("confidence"))
            f.setdefault("compliance_ref", rj.get("compliance_ref"))
            enriched_findings.append(f)

        return {
            "id": row["id"],
            "repo_name": row["repo_name"],
            "verdict": row["verdict"],
            "total_score": row["total_score"],
            "category_scores": row["category_scores_json"],
            "finding_count": row["finding_count"],
            "findings": enriched_findings,
            "trigger_source": row["trigger_source"],
            "scanned_at": row["scanned_at"],
            # Extra metadata from report_json
            "grade": report_json.get("grade"),
            "languages_detected": report_json.get("languages_detected", []),
            "files_scanned": report_json.get("files_scanned"),
            "scan_time": report_json.get("scan_time"),
            "tokens_used": report_json.get("tokens_used"),
        }

    except Exception as e:
        logger.error("Error fetching scan %s: %s", scan_id, e)
        return None


async def get_recent_scans(limit: int = 20) -> list[dict]:
    """Fetch the most recent scan summaries (no findings detail).

    Returns a list of dicts for GET /reports.
    """
    if not supabase:
        logger.error("Database not initialized.")
        return []

    try:
        res = (
            supabase.table("scans")
            .select("id, repo_name, verdict, total_score, finding_count, scanned_at, trigger_source")
            .order("scanned_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []

    except Exception as e:
        logger.error("Error fetching recent scans: %s", e)
        return []
