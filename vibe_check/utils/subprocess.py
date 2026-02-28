"""Cross-platform async subprocess helper.

``asyncio.create_subprocess_exec`` raises ``NotImplementedError`` on Windows
when uvicorn uses ``SelectorEventLoop``. This module provides a drop-in
replacement that runs ``subprocess.run`` in a thread via ``asyncio.to_thread``.
"""

from __future__ import annotations

import asyncio
import subprocess
from dataclasses import dataclass
from typing import Optional


@dataclass
class CompletedProcess:
    """Minimal result matching the fields callers expect."""
    returncode: int
    stdout: bytes
    stderr: bytes


async def run(
    *args: str,
    cwd: Optional[str] = None,
    timeout: Optional[float] = None,
) -> CompletedProcess:
    """Run a command asynchronously (Windows-safe).

    Returns a ``CompletedProcess`` with stdout/stderr as bytes.
    """
    def _run() -> CompletedProcess:
        proc = subprocess.run(
            list(args),
            capture_output=True,
            cwd=cwd,
            timeout=timeout,
        )
        return CompletedProcess(
            returncode=proc.returncode,
            stdout=proc.stdout,
            stderr=proc.stderr,
        )

    return await asyncio.to_thread(_run)
