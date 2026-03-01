"""Shared scan state — in-memory progress tracking for active scans."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# Global mutable dict used by scan_runner (writer) and audit.py SSE (reader).
# Keys: scan_id (str)
# Values: {
#     "status":    "pending" | "scanning" | "complete" | "error",
#     "progress":  list[dict],    # structured progress events
#         # Each dict: {
#         #     "message":   str,       # human-readable log line
#         #     "phase":     str,       # e.g. "clone", "secrets", "sast", "saving"
#         #     "type":      str,       # "start" | "complete" | "error" | "info"
#         #     "timestamp": str,       # ISO 8601 UTC timestamp
#         #     "findings":  int|None,  # finding count (on "complete" type only)
#         # }
#     "report_id": str | None,
#     "error":     str | None,
# }
SCAN_STATUS: dict[str, dict[str, Any]] = {}


def emit_progress(
    scan_id: str,
    message: str,
    phase: str,
    type_: str,
    findings: int | None = None,
) -> None:
    """Append a structured progress event to SCAN_STATUS[scan_id]."""
    entry: dict[str, Any] = {
        "message": message,
        "phase": phase,
        "type": type_,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if findings is not None:
        entry["findings"] = findings
    SCAN_STATUS[scan_id]["progress"].append(entry)
