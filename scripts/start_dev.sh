#!/bin/bash
# ── VibeAudit dev server launcher ──────────────────────────────────
# Starts uvicorn (FastAPI) and optionally an ngrok tunnel for webhook
# testing.

set -e

echo "🚀 Starting VibeAudit dev server..."
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
echo "✅ Backend running on http://localhost:8000"

echo ""
echo "Starting ngrok tunnel..."
ngrok http 8000 &
sleep 2

python scripts/get_ngrok_url.py

echo ""
echo "📌 Update your GitHub App webhook URL to the ngrok URL + /webhook"
echo "   e.g. https://xxxx.ngrok-free.app/webhook"

wait $SERVER_PID
