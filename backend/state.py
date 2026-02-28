"""Shared scan state — in-memory progress tracking for active scans."""

from __future__ import annotations

from typing import Any

# Global mutable dict used by scan_runner (writer) and audit.py SSE (reader).
# Keys: scan_id (str)
# Values: {
#     "status":    "pending" | "scanning" | "complete" | "error",
#     "progress":  list[str],     # ordered progress messages
#     "report_id": str | None,    # set on completion
#     "error":     str | None,    # set on failure
# }
SCAN_STATUS: dict[str, dict[str, Any]] = {}
