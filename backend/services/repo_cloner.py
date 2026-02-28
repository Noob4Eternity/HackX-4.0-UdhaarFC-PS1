"""Repo cloner — clone from URL, extract ZIP uploads, clean up."""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

from fastapi import UploadFile

logger = logging.getLogger("backend.services.repo_cloner")

MAX_ZIP_SIZE = 50 * 1024 * 1024   # 50 MB
MAX_ZIP_FILES = 1000


async def clone_from_url(url: str, target_dir: str | None = None) -> str:
    """Shallow-clone a git repository from *url*.

    If *target_dir* is ``None``, a temporary directory is created.
    Returns the path to the cloned repo on disk.
    """
    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="vibeaudit_")

    logger.info("Cloning %s → %s", url, target_dir)
    proc = await asyncio.create_subprocess_exec(
        "git", "clone", "--depth", "1", url, target_dir,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        err_msg = stderr.decode().strip() or stdout.decode().strip()
        cleanup(target_dir)
        raise RuntimeError(f"git clone failed (exit {proc.returncode}): {err_msg}")

    logger.info("Clone complete: %s", target_dir)
    return target_dir


async def extract_zip(zip_file: UploadFile, target_dir: str | None = None) -> str:
    """Extract an uploaded ZIP file safely.

    Validates:
      - Total uncompressed size ≤ 50 MB
      - Total file count ≤ 1 000
      - No path-traversal (``..`` components)

    Returns the path to the extracted directory.
    """
    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="vibeaudit_zip_")

    # Save upload to a temporary file first
    tmp_zip = os.path.join(target_dir, "_upload.zip")
    content = await zip_file.read()

    if len(content) > MAX_ZIP_SIZE:
        cleanup(target_dir)
        raise ValueError(f"ZIP file too large ({len(content)} bytes, max {MAX_ZIP_SIZE})")

    with open(tmp_zip, "wb") as f:
        f.write(content)

    try:
        with zipfile.ZipFile(tmp_zip, "r") as zf:
            # Security checks
            members = zf.infolist()

            if len(members) > MAX_ZIP_FILES:
                raise ValueError(
                    f"ZIP contains too many files ({len(members)}, max {MAX_ZIP_FILES})"
                )

            total_size = sum(m.file_size for m in members)
            if total_size > MAX_ZIP_SIZE:
                raise ValueError(
                    f"ZIP uncompressed size too large ({total_size} bytes, max {MAX_ZIP_SIZE})"
                )

            for member in members:
                # Path traversal check
                member_path = Path(target_dir) / member.filename
                if ".." in member.filename or member_path.resolve().parts[
                    : len(Path(target_dir).resolve().parts)
                ] != Path(target_dir).resolve().parts:
                    raise ValueError(
                        f"Path traversal detected in ZIP: {member.filename}"
                    )

            zf.extractall(target_dir)

    except (zipfile.BadZipFile, ValueError):
        cleanup(target_dir)
        raise
    finally:
        # Remove the temporary ZIP file
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)

    # If the ZIP contains a single root directory, return that instead
    entries = [
        e for e in os.listdir(target_dir)
        if not e.startswith("_") and not e.startswith(".")
    ]
    if len(entries) == 1:
        single = os.path.join(target_dir, entries[0])
        if os.path.isdir(single):
            return single

    logger.info("ZIP extracted to %s (%d files)", target_dir, len(members))
    return target_dir


def cleanup(repo_path: str) -> None:
    """Remove the cloned/extracted repo directory."""
    shutil.rmtree(repo_path, ignore_errors=True)
    logger.info("Cleaned up %s", repo_path)
