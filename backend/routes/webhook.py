"""Webhook route — receives GitHub App pull_request events."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import uuid

from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

# Load .env.local first (project convention), fall back to .env
_backend_dir = Path(__file__).resolve().parent.parent
_env_local = _backend_dir / ".env.local"
if _env_local.exists():
    load_dotenv(_env_local)
else:
    load_dotenv()

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
    """Handle GitHub App webhook events."""
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    _verify_signature(payload, signature)

    event = request.headers.get("X-GitHub-Event", "")
    logger.info("📩 Webhook received — event=%s", event)

    if event != "pull_request":
        logger.info("⏭️  Ignoring non-PR event: %s", event)
        return {"status": "ignored", "event": event}

    data = await request.json()
    action = data.get("action", "")
    logger.info("📩 PR event — action=%s", action)

    if action not in ("opened", "synchronize"):
        logger.info("⏭️  Ignoring PR action: %s", action)
        return {"status": "ignored", "action": action}

    repo_full = data["repository"]["full_name"]
    pr_number = data["pull_request"]["number"]
    pr_sha = data["pull_request"]["head"]["sha"]
    installation_id = data["installation"]["id"]
    scan_id = str(uuid.uuid4())

    logger.info(
        "🚀 Starting webhook scan — repo=%s, PR=#%d, sha=%s, scan_id=%s",
        repo_full, pr_number, pr_sha[:8], scan_id,
    )

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
        logger.info("[%s] 🔑 Getting installation token (installation_id=%d)...", scan_id[:8], installation_id)
        client, token = await get_installation_client(installation_id)
        logger.info("[%s] ✅ Got installation token", scan_id[:8])

        # 2. Set commit status → pending
        logger.info("[%s] 📝 Setting commit status to 'pending'...", scan_id[:8])
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full}/statuses/{pr_sha}",
            json={
                "state": "pending",
                "description": "VibeAudit scan in progress…",
                "context": "vibeaudit",
            },
        )
        logger.info("[%s] ✅ Commit status set (HTTP %d)", scan_id[:8], resp.status_code)

        # 3. Clone the repository
        logger.info("[%s] 📦 Cloning %s...", scan_id[:8], repo_full)
        clone_url = f"https://x-access-token:{token}@github.com/{repo_full}.git"
        repo_path = await repo_cloner.clone_from_url(clone_url)
        logger.info("[%s] ✅ Clone complete → %s", scan_id[:8], repo_path)

        # 4. Run scan (single run — produces the full result)
        logger.info("[%s] 🔍 Running vibe_check scan...", scan_id[:8])

        from vibe_check.analyzers.secrets import SecretsAnalyzer
        from vibe_check.analyzers.sast import SASTAnalyzer
        from vibe_check.analyzers.dependencies import DependencyAnalyzer
        from vibe_check.analyzers.hallucination import HallucinationDetector
        from vibe_check.analyzers.compliance import ComplianceAnalyzer
        from vibe_check.analyzers.prompt_injection import PromptInjectionAnalyzer
        from vibe_check.analyzers.llm_summarizer import LLMSummarizer
        from vibe_check.utils.config import load_config
        from vibe_check.core.orchestrator import Orchestrator

        config = load_config(repo_path)
        analyzers = [
            SecretsAnalyzer(), SASTAnalyzer(), DependencyAnalyzer(),
            HallucinationDetector(), ComplianceAnalyzer(),
            PromptInjectionAnalyzer(), LLMSummarizer(),
        ]
        orchestrator = Orchestrator(analyzers=analyzers, config=config)
        result = await orchestrator.run(repo_path)

        logger.info(
            "[%s] ✅ Scan complete — score=%.1f, grade=%s, findings=%d",
            scan_id[:8], result.score, result.grade, len(result.findings),
        )

        # 5. Save to database
        logger.info("[%s] 💾 Saving to database...", scan_id[:8])
        verdict = "GO" if result.score >= FAIL_UNDER_SCORE else "NO-GO"
        from backend import database
        await database.save_scan(scan_id, result, "webhook", verdict)
        logger.info("[%s] ✅ Saved (verdict=%s)", scan_id[:8], verdict)

        # Update SCAN_STATUS
        SCAN_STATUS[scan_id]["status"] = "complete"
        SCAN_STATUS[scan_id]["report_id"] = scan_id

        # 6. Post PR comment
        logger.info("[%s] 💬 Posting PR comment on #%d...", scan_id[:8], pr_number)
        markdown = result.to_markdown()
        logger.info("[%s]    Comment length: %d chars", scan_id[:8], len(markdown))
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments",
            json={"body": markdown},
        )
        logger.info("[%s] ✅ PR comment posted (HTTP %d)", scan_id[:8], resp.status_code)
        if resp.status_code >= 400:
            logger.error("[%s] ❌ PR comment failed: %s", scan_id[:8], resp.text)

        # 7. Set commit status
        passed = result.score >= FAIL_UNDER_SCORE
        logger.info("[%s] 📝 Setting commit status to '%s'...", scan_id[:8], "success" if passed else "failure")
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full}/statuses/{pr_sha}",
            json={
                "state": "success" if passed else "failure",
                "description": f"Score: {result.score:.0f}/100 — {'GO' if passed else 'NO-GO'}",
                "context": "vibeaudit",
            },
        )
        logger.info("[%s] ✅ Commit status set (HTTP %d)", scan_id[:8], resp.status_code)
        logger.info(
            "[%s] 🎉 Done — PR #%d on %s — score=%.1f, %s",
            scan_id[:8], pr_number, repo_full, result.score, "PASS" if passed else "FAIL",
        )

    except Exception as exc:
        logger.error(
            "[%s] ❌ Webhook scan FAILED for %s PR#%d: %s",
            scan_id[:8], repo_full, pr_number, exc, exc_info=True,
        )
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
            logger.info("[%s] 🧹 Cleaning up %s", scan_id[:8], repo_path)
            repo_cloner.cleanup(repo_path)
        if client:
            await client.aclose()
