"""Audit routes — trigger scans and stream progress via SSE."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from backend.services import repo_cloner, scan_runner
from backend.state import SCAN_STATUS

logger = logging.getLogger("backend.routes.audit")

router = APIRouter()


@router.post("/audit")
async def start_audit(
    background_tasks: BackgroundTasks,
    repo_url: Optional[str] = Form(None),
    github_token: Optional[str] = Form(None),
    repo_name: Optional[str] = Form(None),
    zip_file: Optional[UploadFile] = File(None),
):
    """Start a new security audit.

    Accepts ``multipart/form-data`` with exactly one of:
    - ``repo_url``: public GitHub URL
    - ``github_token`` + ``repo_name``: private repo via OAuth
    - ``zip_file``: uploaded ``.zip`` archive

    Returns immediately with ``{scan_id, stream_url}``.
    """
    scan_id = str(uuid.uuid4())

    # Initialize scan status
    SCAN_STATUS[scan_id] = {
        "status": "pending",
        "progress": [],
        "report_id": None,
        "error": None,
    }

    # Determine scan mode
    if repo_url:
        SCAN_STATUS[scan_id]["progress"].append("Cloning repository...")
        background_tasks.add_task(_scan_from_url, scan_id, repo_url)

    elif github_token and repo_name:
        SCAN_STATUS[scan_id]["progress"].append("Cloning private repository...")
        background_tasks.add_task(
            _scan_from_oauth, scan_id, github_token, repo_name
        )

    elif zip_file:
        SCAN_STATUS[scan_id]["progress"].append("Extracting uploaded archive...")
        # Read file content before the request ends
        zip_content = await zip_file.read()
        background_tasks.add_task(
            _scan_from_zip, scan_id, zip_content, zip_file.filename or "upload.zip"
        )

    else:
        del SCAN_STATUS[scan_id]
        raise HTTPException(
            status_code=400,
            detail="Provide one of: repo_url, github_token+repo_name, or zip_file",
        )

    return {
        "scan_id": scan_id,
        "stream_url": f"/audit/{scan_id}/stream",
    }


@router.get("/audit/{scan_id}/stream")
async def audit_stream(scan_id: str):
    """SSE endpoint — streams scan progress to the frontend.

    Polls ``SCAN_STATUS[scan_id]`` every 0.5 s and emits:
    - ``event: progress`` with ``{"message": "..."}``
    - ``event: complete`` with ``{"report_id": "..."}``
    - ``event: error``   with ``{"message": "..."}``
    """
    if scan_id not in SCAN_STATUS:
        raise HTTPException(status_code=404, detail="Scan not found")

    return StreamingResponse(
        _sse_generator(scan_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _sse_generator(scan_id: str):
    """Yield SSE events until the scan completes or errors."""
    last_progress_idx = 0

    while True:
        status = SCAN_STATUS.get(scan_id)
        if status is None:
            yield _sse_event("scan_error", {"message": "Scan not found"})
            return

        # Emit any new progress messages
        progress = status.get("progress", [])
        while last_progress_idx < len(progress):
            yield _sse_event("progress", {"message": progress[last_progress_idx]})
            last_progress_idx += 1

        # Check terminal states
        if status["status"] == "complete":
            yield _sse_event("complete", {"report_id": status["report_id"]})
            return

        if status["status"] == "error":
            yield _sse_event("scan_error", {"message": status.get("error", "Unknown error")})
            return

        await asyncio.sleep(0.5)


def _sse_event(event: str, data: dict) -> str:
    """Format an SSE event string."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Background scan tasks ──────────────────────────────────────────


async def _scan_from_url(scan_id: str, repo_url: str) -> None:
    """Clone a public repo and run scan."""
    repo_path: str | None = None
    try:
        repo_path = await repo_cloner.clone_from_url(repo_url)
        await scan_runner.run_scan(repo_path, scan_id, trigger_source="url")
    except Exception as exc:
        logger.error("URL scan %s failed: %s", scan_id, exc, exc_info=True)
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(exc) or f"{type(exc).__name__}: {exc!r}"
    finally:
        if repo_path:
            repo_cloner.cleanup(repo_path)


async def _scan_from_oauth(
    scan_id: str, github_token: str, repo_name: str
) -> None:
    """Clone a private repo using an OAuth token and run scan."""
    repo_path: str | None = None
    try:
        SCAN_STATUS[scan_id]["progress"].append(f"Cloning {repo_name}...")
        clone_url = f"https://x-access-token:{github_token}@github.com/{repo_name}.git"
        repo_path = await repo_cloner.clone_from_url(clone_url)
        SCAN_STATUS[scan_id]["progress"].append("Clone complete, starting scan...")
        await scan_runner.run_scan(repo_path, scan_id, trigger_source="oauth")
    except Exception as exc:
        logger.error("OAuth scan %s failed: %s", scan_id, exc, exc_info=True)
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(exc) or f"{type(exc).__name__}: {exc!r}"
    finally:
        if repo_path:
            repo_cloner.cleanup(repo_path)


async def _scan_from_zip(
    scan_id: str, zip_content: bytes, filename: str
) -> None:
    """Extract a ZIP upload and run scan."""
    import tempfile
    import os

    repo_path: str | None = None
    tmp_dir: str | None = None
    try:
        # Write content to temp file for extraction
        tmp_dir = tempfile.mkdtemp(prefix="vibeaudit_zip_")
        tmp_zip = os.path.join(tmp_dir, filename)
        with open(tmp_zip, "wb") as f:
            f.write(zip_content)

        # Create a fake UploadFile to reuse extract_zip logic
        import zipfile
        from pathlib import Path

        MAX_ZIP_SIZE = 50 * 1024 * 1024
        MAX_ZIP_FILES = 1000

        if len(zip_content) > MAX_ZIP_SIZE:
            raise ValueError(f"ZIP file too large ({len(zip_content)} bytes)")

        with zipfile.ZipFile(tmp_zip, "r") as zf:
            members = zf.infolist()
            if len(members) > MAX_ZIP_FILES:
                raise ValueError(f"Too many files ({len(members)})")
            total_size = sum(m.file_size for m in members)
            if total_size > MAX_ZIP_SIZE:
                raise ValueError(f"Uncompressed size too large ({total_size} bytes)")

            for member in members:
                member_path = Path(tmp_dir) / member.filename
                if ".." in member.filename:
                    raise ValueError(f"Path traversal: {member.filename}")

            zf.extractall(tmp_dir)

        os.remove(tmp_zip)

        # If single root directory, use that
        entries = [e for e in os.listdir(tmp_dir) if not e.startswith(".")]
        if len(entries) == 1:
            single = os.path.join(tmp_dir, entries[0])
            if os.path.isdir(single):
                repo_path = single
            else:
                repo_path = tmp_dir
        else:
            repo_path = tmp_dir

        await scan_runner.run_scan(repo_path, scan_id, trigger_source="zip")

    except Exception as exc:
        logger.error("ZIP scan %s failed: %s", scan_id, exc, exc_info=True)
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(exc)
    finally:
        if tmp_dir:
            repo_cloner.cleanup(tmp_dir)
