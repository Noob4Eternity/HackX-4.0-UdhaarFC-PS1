"""Report routes — fetch scan reports and summaries from Supabase."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import database

router = APIRouter()


@router.get("/report/{scan_id}")
async def get_report(scan_id: str):
    """Fetch a full scan report by ID."""
    report = await database.get_scan(scan_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return report


@router.get("/reports")
async def list_reports(limit: int = 20):
    """List the most recent scans."""
    return await database.get_recent_scans(limit)
