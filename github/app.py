"""GitHub App JWT authentication and installation token management."""

from __future__ import annotations

import os
import time

import httpx
import jwt


async def get_jwt_token() -> str:
    """Generate a JWT for authenticating as the GitHub App.

    Uses GITHUB_APP_ID and GITHUB_PRIVATE_KEY env vars.
    JWT is valid for 10 minutes, issued at (now - 60s) to handle clock skew.
    """
    app_id = os.environ["GITHUB_APP_ID"]
    private_key = os.environ["GITHUB_PRIVATE_KEY"]

    now = int(time.time())
    payload = {
        "iat": now - 60,       # Issued at — 60s in the past for clock drift
        "exp": now + (10 * 60),  # Expires in 10 minutes
        "iss": int(app_id),
    }

    return jwt.encode(payload, private_key, algorithm="RS256")


async def get_installation_token(installation_id: int) -> str:
    """Exchange the App JWT for an installation access token.

    POSTs to /app/installations/{id}/access_tokens on api.github.com.
    Returns the token string.
    """
    token = await get_jwt_token()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()["token"]


async def get_installation_client(
    installation_id: int,
) -> tuple[httpx.AsyncClient, str]:
    """Return an authenticated async HTTP client + installation token.

    The client has the ``Authorization: token {installation_token}`` header
    pre-set so callers can make GitHub API requests directly.
    """
    token = await get_installation_token(installation_id)

    client = httpx.AsyncClient(
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    return client, token
