"""GitHub OAuth — authorize URL generation and code-for-token exchange."""

from __future__ import annotations

import os
import secrets

from dotenv import load_dotenv
import httpx

load_dotenv()


async def get_oauth_url() -> tuple[str, str]:
    """Generate a GitHub OAuth authorize URL with CSRF state.

    Returns ``(url, state)`` where *state* is a random hex string.
    Scope: ``repo`` (read private repos).
    """
    client_id = os.environ["GITHUB_OAUTH_CLIENT_ID"]
    state = secrets.token_hex(16)

    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&scope=repo"
        f"&state={state}"
    )
    return url, state


async def exchange_code_for_token(code: str, state: str) -> str:
    """Exchange an OAuth authorization code for an access token.

    POSTs to ``github.com/login/oauth/access_token`` with
    ``GITHUB_OAUTH_CLIENT_ID`` and ``GITHUB_OAUTH_CLIENT_SECRET``.
    Returns the ``access_token`` string.
    """
    client_id = os.environ["GITHUB_OAUTH_CLIENT_ID"]
    client_secret = os.environ["GITHUB_OAUTH_CLIENT_SECRET"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

        if "error" in data:
            raise ValueError(f"GitHub OAuth error: {data['error_description']}")

        return data["access_token"]
