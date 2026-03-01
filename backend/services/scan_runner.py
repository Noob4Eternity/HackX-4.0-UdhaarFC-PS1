"""Scan runner — bridge between the vibe_check engine and the backend."""

from __future__ import annotations

import logging
import os
import traceback

from dotenv import load_dotenv

load_dotenv()

from backend import database
from backend.state import SCAN_STATUS, emit_progress

logger = logging.getLogger("backend.services.scan_runner")

FAIL_UNDER_SCORE = int(os.getenv("FAIL_UNDER_SCORE", "70"))


async def run_scan(
    repo_path: str,
    scan_id: str,
    trigger_source: str = "url",
    display_name: str | None = None,
) -> None:
    """Run the full vibe_check analysis pipeline on *repo_path*.

    Updates ``SCAN_STATUS[scan_id]`` throughout, and persists the result
    via ``database.save_scan()`` on completion.
    """
    try:
        # ── Mark scanning ───────────────────────────────────────────
        SCAN_STATUS[scan_id]["status"] = "scanning"
        emit_progress(scan_id, "Starting analysis...", "clone", "complete")

        # ── Build analyzer list ─────────────────────────────────────
        from vibe_check.analyzers.secrets import SecretsAnalyzer
        from vibe_check.analyzers.sast import SASTAnalyzer
        from vibe_check.analyzers.dependencies import DependencyAnalyzer
        from vibe_check.analyzers.hallucination import HallucinationDetector
        from vibe_check.analyzers.compliance import ComplianceAnalyzer
        from vibe_check.analyzers.prompt_injection import PromptInjectionAnalyzer
        from vibe_check.analyzers.cost import CostAnalyzer
        from vibe_check.analyzers.nextjs import NextJSAnalyzer
        from vibe_check.analyzers.llm_summarizer import LLMSummarizer

        analyzers = [
            SecretsAnalyzer(),
            SASTAnalyzer(),
            DependencyAnalyzer(),
            HallucinationDetector(),
            CostAnalyzer(),
            ComplianceAnalyzer(),
            PromptInjectionAnalyzer(),
            CostAnalyzer(),
            NextJSAnalyzer(),
            LLMSummarizer(),
        ]

        # ── Load config (handles .vibecheck.yml + excludes) ─────────
        from vibe_check.utils.config import load_config

        config = load_config(repo_path)

        # ── Build progress callback bound to this scan_id ───────────
        def on_progress(message: str, phase: str, type_: str, findings: int | None) -> None:
            emit_progress(scan_id, message, phase, type_, findings)

        # ── Create orchestrator and run ─────────────────────────────
        from vibe_check.core.orchestrator import Orchestrator

        orchestrator = Orchestrator(
            analyzers=analyzers, config=config, progress_callback=on_progress
        )
        result = await orchestrator.run(repo_path)

        emit_progress(scan_id, "Analysis complete, saving results...", "saving", "start")

        # ── Override repo_path with friendly display name ────────────
        if display_name:
            result.repo_path = display_name

        # ── Map verdict ─────────────────────────────────────────────
        verdict = "GO" if result.score >= FAIL_UNDER_SCORE else "NO-GO"

        # ── Persist to database ─────────────────────────────────────
        await database.save_scan(scan_id, result, trigger_source, verdict)
        emit_progress(scan_id, "Results saved", "saving", "complete")

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
