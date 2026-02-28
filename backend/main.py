"""FastAPI application — CORS, startup, auth routes, router mounting."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend import database
from backend.routes import audit, report, webhook
from github.oauth import exchange_code_for_token, get_oauth_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-28s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("backend.main")


# ── Lifespan ────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VibeAudit API starting up…")
    await database.init_db()
    logger.info("Database initialized.")
    yield
    logger.info("VibeAudit API shutting down…")


# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(
    title="VibeAudit API",
    description="Security auditor for vibe-coded repos",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — allow everything for dev (ngrok + localhost + prod) ──────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Include routers ─────────────────────────────────────────────────
app.include_router(webhook.router)
app.include_router(audit.router)
app.include_router(report.router)


# ── Health check ────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Auth routes ─────────────────────────────────────────────────────


@app.get("/auth/github/url")
async def auth_github_url():
    """Return a GitHub OAuth authorize URL + CSRF state."""
    url, state = await get_oauth_url()
    return {"url": url, "state": state}


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str


@app.post("/auth/github/callback")
async def auth_github_callback(body: OAuthCallbackRequest):
    """Exchange an OAuth authorization code for an access token."""
    try:
        access_token = await exchange_code_for_token(body.code, body.state)
        return {"access_token": access_token}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("OAuth callback failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail="GitHub OAuth exchange failed")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
