"""Webhook route — receives GitHub App pull_request events."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from backend.services import repo_cloner, scan_runner
from backend.state import SCAN_STATUS
from github.app import get_installation_client

logger = logging.getLogger("backend.routes.webhook")

router = APIRouter()

FAIL_UNDER_SCORE = int(os.getenv("FAIL_UNDER_SCORE", "70"))


def _verify_signature(payload: bytes, signature: str | None) -> None:
    """Verify HMAC-SHA256 webhook signature."""
    secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping verification")
        return

    if not signature:
        raise HTTPException(status_code=401, detail="Missing X-Hub-Signature-256")

    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


@router.post("/webhook")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle GitHub App webhook events.

    Only processes ``pull_request`` events with action ``opened`` or
    ``synchronize``. Returns 200 immediately and runs the scan in the
    background.
    """
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    _verify_signature(payload, signature)

    event = request.headers.get("X-GitHub-Event", "")
    if event != "pull_request":
        return {"status": "ignored", "event": event}

    data = await request.json()
    action = data.get("action", "")
    if action not in ("opened", "synchronize"):
        return {"status": "ignored", "action": action}

    repo_full = data["repository"]["full_name"]
    pr_number = data["pull_request"]["number"]
    pr_sha = data["pull_request"]["head"]["sha"]
    installation_id = data["installation"]["id"]
    scan_id = str(uuid.uuid4())

    SCAN_STATUS[scan_id] = {
        "status": "pending",
        "progress": ["Webhook received, cloning repository..."],
        "report_id": None,
        "error": None,
    }

    background_tasks.add_task(
        _handle_pr_scan,
        repo_full=repo_full,
        pr_number=pr_number,
        pr_sha=pr_sha,
        installation_id=installation_id,
        scan_id=scan_id,
    )

    return {"status": "processing", "scan_id": scan_id}


async def _handle_pr_scan(
    *,
    repo_full: str,
    pr_number: int,
    pr_sha: str,
    installation_id: int,
    scan_id: str,
) -> None:
    """Background task: clone → scan → post PR comment → set status."""
    repo_path: str | None = None
    client = None

    try:
        # 1. Get authenticated client
        client, token = await get_installation_client(installation_id)

        # 2. Set commit status → pending
        await client.post(
            f"https://api.github.com/repos/{repo_full}/statuses/{pr_sha}",
            json={
                "state": "pending",
                "description": "VibeAudit scan in progress…",
                "context": "vibeaudit",
            },
        )

        # 3. Clone the repository
        clone_url = f"https://x-access-token:{token}@github.com/{repo_full}.git"
        repo_path = await repo_cloner.clone_from_url(clone_url)

        # 4. Run scan
        await scan_runner.run_scan(repo_path, scan_id, trigger_source="webhook")

        # 5. Import result for the PR comment
        from vibe_check.models.result import ScanResult
        # Re-read status to check for errors
        status = SCAN_STATUS.get(scan_id, {})
        if status.get("status") == "error":
            raise RuntimeError(status.get("error", "Scan failed"))

        # Re-run a lightweight report generation for PR comment
        # (the full result was already saved by scan_runner)
        # For PR comments we re-import and use the markdown output
        from vibe_check.utils.config import load_config
        from vibe_check.core.orchestrator import Orchestrator
        from vibe_check.analyzers.secrets import SecretsAnalyzer
        from vibe_check.analyzers.sast import SASTAnalyzer
        from vibe_check.analyzers.dependencies import DependencyAnalyzer
        from vibe_check.analyzers.hallucination import HallucinationDetector
        from vibe_check.analyzers.compliance import ComplianceAnalyzer
        from vibe_check.analyzers.prompt_injection import PromptInjectionAnalyzer
        from vibe_check.analyzers.llm_summarizer import LLMSummarizer

        config = load_config(repo_path)
        analyzers = [
            SecretsAnalyzer(), SASTAnalyzer(), DependencyAnalyzer(),
            HallucinationDetector(), ComplianceAnalyzer(),
            PromptInjectionAnalyzer(), LLMSummarizer(),
        ]
        orchestrator = Orchestrator(analyzers=analyzers, config=config)
        result = await orchestrator.run(repo_path)

        # 5. Post PR comment
        await client.post(
            f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments",
            json={"body": result.to_markdown()},
        )

        # 6. Set commit status
        passed = result.score >= FAIL_UNDER_SCORE
        await client.post(
            f"https://api.github.com/repos/{repo_full}/statuses/{pr_sha}",
            json={
                "state": "success" if passed else "failure",
                "description": f"Score: {result.score:.0f}/100 — {'GO' if passed else 'NO-GO'}",
                "context": "vibeaudit",
            },
        )
        logger.info(
            "PR #%d on %s — score=%.1f, %s",
            pr_number, repo_full, result.score, "PASS" if passed else "FAIL",
        )

    except Exception as exc:
        logger.error("Webhook scan failed for %s PR#%d: %s", repo_full, pr_number, exc, exc_info=True)
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(exc)

        # Try to set commit status to error
        if client:
            try:
                await client.post(
                    f"https://api.github.com/repos/{repo_full}/statuses/{pr_sha}",
                    json={
                        "state": "error",
                        "description": f"Scan failed: {str(exc)[:100]}",
                        "context": "vibeaudit",
                    },
                )
            except Exception:
                pass

    finally:
        if repo_path:
            repo_cloner.cleanup(repo_path)
        if client:
            await client.aclose()
