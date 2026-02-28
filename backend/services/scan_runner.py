"""Scan runner — bridge between the vibe_check engine and the backend."""

from __future__ import annotations

import logging
import os
import traceback

from backend import database
from backend.state import SCAN_STATUS

logger = logging.getLogger("backend.services.scan_runner")

FAIL_UNDER_SCORE = int(os.getenv("FAIL_UNDER_SCORE", "70"))


async def run_scan(
    repo_path: str,
    scan_id: str,
    trigger_source: str = "url",
) -> None:
    """Run the full vibe_check analysis pipeline on *repo_path*.

    Updates ``SCAN_STATUS[scan_id]`` throughout, and persists the result
    via ``database.save_scan()`` on completion.
    """
    try:
        # ── Mark scanning ───────────────────────────────────────────
        SCAN_STATUS[scan_id]["status"] = "scanning"
        SCAN_STATUS[scan_id]["progress"].append("Scanning repository...")

        # ── Build analyzer list ─────────────────────────────────────
        from vibe_check.analyzers.secrets import SecretsAnalyzer
        from vibe_check.analyzers.sast import SASTAnalyzer
        from vibe_check.analyzers.dependencies import DependencyAnalyzer
        from vibe_check.analyzers.hallucination import HallucinationDetector
        from vibe_check.analyzers.compliance import ComplianceAnalyzer
        from vibe_check.analyzers.prompt_injection import PromptInjectionAnalyzer
        from vibe_check.analyzers.llm_summarizer import LLMSummarizer

        analyzers = [
            SecretsAnalyzer(),
            SASTAnalyzer(),
            DependencyAnalyzer(),
            HallucinationDetector(),
            ComplianceAnalyzer(),
            PromptInjectionAnalyzer(),
            LLMSummarizer(),
        ]

        # ── Load config (handles .vibecheck.yml + excludes) ─────────
        from vibe_check.utils.config import load_config

        config = load_config(repo_path)

        # ── Create orchestrator and run ─────────────────────────────
        from vibe_check.core.orchestrator import Orchestrator

        orchestrator = Orchestrator(analyzers=analyzers, config=config)
        result = await orchestrator.run(repo_path)

        SCAN_STATUS[scan_id]["progress"].append(
            "Analysis complete, saving results..."
        )

        # ── Map verdict ─────────────────────────────────────────────
        verdict = "GO" if result.score >= FAIL_UNDER_SCORE else "NO-GO"

        # ── Persist to database ─────────────────────────────────────
        await database.save_scan(scan_id, result, trigger_source, verdict)

        # ── Mark complete ───────────────────────────────────────────
        SCAN_STATUS[scan_id]["status"] = "complete"
        SCAN_STATUS[scan_id]["report_id"] = scan_id
        logger.info(
            "Scan %s complete — score=%.1f, verdict=%s, findings=%d",
            scan_id, result.score, verdict, len(result.findings),
        )

    except Exception as exc:
        logger.error("Scan %s failed: %s", scan_id, exc, exc_info=True)
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(exc)
