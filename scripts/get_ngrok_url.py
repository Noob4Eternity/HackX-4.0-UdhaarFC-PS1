"""Fetch the public ngrok HTTPS URL from the local ngrok API."""

from __future__ import annotations

import sys

import httpx


def main() -> None:
    try:
        resp = httpx.get("http://localhost:4040/api/tunnels", timeout=5)
        resp.raise_for_status()
        tunnels = resp.json().get("tunnels", [])

        for t in tunnels:
            if t.get("proto") == "https":
                print(f"🌐 ngrok URL: {t['public_url']}")
                return

        # Fallback — print first tunnel
        if tunnels:
            print(f"🌐 ngrok URL: {tunnels[0]['public_url']}")
        else:
            print("⚠️  No active ngrok tunnels found.")
            sys.exit(1)

    except httpx.ConnectError:
        print("⚠️  ngrok is not running (could not connect to localhost:4040)")
        sys.exit(1)
    except Exception as exc:
        print(f"⚠️  Error fetching ngrok URL: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
