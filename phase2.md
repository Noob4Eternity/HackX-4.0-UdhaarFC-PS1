# Phase 2 — Web Application Layer

The `vibe_check/` CLI engine is complete — 9 analyzers, scoring, LLM integration, Semgrep rules, all tested and published on PyPI (`vibe-check-cli v0.1.5`). This phase wraps it in a **FastAPI backend + Next.js frontend** with GitHub App integration.

---

## Team Split

| Member      | Responsibility                                            | Key Files                                                |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------- |
| **A (You)** | FastAPI server + GitHub App + Webhook + SSE streaming     | `backend/`, `github/`, `scripts/`                        |
| **B**       | Database (Supabase) + Report API endpoints + .env docs    | `backend/database.py`, `backend/routes/report.py`        |
| **C**       | Next.js frontend + GitHub OAuth flow + Input UI           | `frontend/app/`, `frontend/components/`, `frontend/lib/` |
| **D**       | Next.js frontend + Report UI + Radar chart + SSE progress | `frontend/components/`, `frontend/app/report/`           |

**Why this split:** A owns the server glue — every request enters through your routes. B owns persistence — `save_scan()` is the single write path, `GET /report` is the single read path. C owns auth — token never touches disk. D owns visualization — the demo-wow factor.

---

## What's Already Done (DO NOT REBUILD)

The `vibe_check/` directory IS the complete analysis engine. The backend layer **imports and calls** it:

```python
from vibe_check.core.orchestrator import Orchestrator
from vibe_check.utils.config import load_config
from vibe_check.models.result import ScanResult

config = load_config(repo_path)
orchestrator = Orchestrator(analyzers=analyzers, config=config)
result: ScanResult = await orchestrator.run(repo_path)

# result.score         → float (0-100)
# result.grade         → str ("A+", "B", "F", etc.)
# result.verdict       → str ("PRODUCTION READY" | "NEEDS REMEDIATION" | "NOT PRODUCTION READY" | "CRITICAL — DO NOT DEPLOY")
# result.findings      → List[Finding]
# result.category_scores → dict with keys: "secrets", "dependencies", "sast", "compliance", "prompt_injection", "code_quality", "iac_security", "llm_review"
# result.to_json()     → full JSON string
# result.to_markdown() → GitHub PR comment markdown
```

### Existing File Structure (read-only reference)

```
vibe_check/
├── __init__.py
├── cli.py                           # Typer CLI — scan, score, init
├── analyzers/
│   ├── base.py                      # BaseAnalyzer ABC
│   ├── secrets.py                   # detect-secrets
│   ├── sast.py                      # Bandit + Semgrep
│   ├── dependencies.py              # Registry checks + pip-audit
│   ├── hallucination.py             # Hallucinated package detection
│   ├── nextjs.py                    # Next.js-specific
│   ├── compliance.py                # GDPR/SOC2
│   ├── prompt_injection.py          # Prompt injection
│   └── llm_summarizer.py           # Executive summary via LLM
├── core/
│   ├── orchestrator.py              # Runs analyzers in parallel
│   ├── scorer.py                    # Weighted scoring + grades
│   └── report.py                    # Terminal + markdown output
├── models/
│   ├── finding.py                   # Finding dataclass
│   └── result.py                    # ScanResult with to_json(), to_markdown()
├── prompts/                         # LLM prompt templates
├── rules/                           # Semgrep YAML rules
└── utils/
    ├── llm_client.py                # Multi-provider (Gemini/OpenAI/Anthropic)
    ├── config.py                    # Config loading (.vibecheck.yml)
    ├── git_utils.py                 # Git-aware file discovery
    └── registry.py                  # Package registry lookups
```

---

## What Needs to Be Built

```
project-root/
├── vibe_check/                      # ✅ DONE — copied from engine repo
├── github/                          # Member A
│   ├── __init__.py
│   ├── app.py                       # JWT token, installation client
│   └── oauth.py                     # OAuth URL + code exchange
├── backend/                         # Members A + B
│   ├── __init__.py
│   ├── main.py                      # FastAPI app, CORS, startup
│   ├── state.py                     # SCAN_STATUS shared dict
│   ├── database.py                  # Supabase client + queries
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── webhook.py               # POST /webhook
│   │   ├── audit.py                 # POST /audit + GET /audit/{id}/stream
│   │   └── report.py               # GET /report/{id} + GET /reports
│   └── services/
│       ├── __init__.py
│       ├── repo_cloner.py           # clone, extract ZIP, cleanup
│       └── scan_runner.py           # run orchestrator, update status
├── frontend/                        # Members C + D
│   ├── package.json
│   ├── next.config.js
│   ├── app/
│   │   ├── layout.tsx               # root layout
│   │   ├── page.tsx                 # landing (3 input tabs)
│   │   ├── auth/callback/page.tsx   # OAuth callback
│   │   ├── scan/[scanId]/page.tsx   # SSE progress
│   │   └── report/[id]/page.tsx     # full report
│   ├── components/                  # All UI components
│   ├── context/AuthContext.tsx       # In-memory token store
│   └── lib/api.ts                   # All fetch calls
├── scripts/
│   ├── start_dev.sh                 # uvicorn + ngrok launcher
│   └── get_ngrok_url.py             # ngrok URL helper
├── .env.example                     # Documented env vars
└── pyproject.toml                   # Add fastapi, uvicorn, supabase
```

---

## Shared Contracts

### Contract 1: Database Schema (Supabase / PostgreSQL)

> **IMPORTANT:** Column names must match what `ScanResult` and `Finding` actually produce. The values below are verified against the source code. Create these tables in your Supabase dashboard (SQL Editor) or via migrations.

**Table: `scans`**

```sql
CREATE TABLE scans (
    id TEXT PRIMARY KEY,
    repo_name TEXT NOT NULL,
    trigger_source TEXT NOT NULL,       -- 'webhook' | 'url' | 'oauth' | 'zip'
    verdict TEXT NOT NULL,              -- 'GO' | 'NO-GO'
    total_score REAL NOT NULL,          -- 0-100
    category_scores_json JSONB,         -- result.category_scores dict
    finding_count INTEGER NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    report_json JSONB                   -- result.to_json() full backup
);
```

**Verdict mapping** (since `result.verdict` uses long strings):

```python
verdict = "GO" if result.score >= FAIL_UNDER_SCORE else "NO-GO"
# FAIL_UNDER_SCORE = int(os.getenv("FAIL_UNDER_SCORE", "70"))
```

**`category_scores` actual keys** (from `scorer.py`):

```python
# result.category_scores is a dict like:
{
    "secrets": 85.0,
    "dependencies": 90.0,
    "sast": 70.0,
    "compliance": 65.0,
    "prompt_injection": 80.0,
    "code_quality": 100.0,
    "iac_security": 100.0,
    "llm_review": 100.0
}
# Only keys with findings appear. Missing = 100 (no issues found).
```

**Table: `findings`**

```sql
CREATE TABLE findings (
    id TEXT PRIMARY KEY,                -- from finding.id (auto-generated VA-XXXXXXXX)
    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,             -- 'critical' | 'high' | 'medium' | 'low' | 'info'
    category TEXT NOT NULL,             -- 'secret' | 'sast' | 'compliance_gdpr' etc.
    file_path TEXT,                     -- nullable
    line_number INTEGER,                -- nullable
    description TEXT NOT NULL,
    remediation TEXT NOT NULL,
    ai_prompt TEXT,                     -- copy-paste prompt for Cursor/Copilot
    tool TEXT NOT NULL                  -- which analyzer found this
);
```

> **Supabase note:** Use JSONB for `category_scores_json` and `report_json` — Supabase/PostgreSQL handles JSON natively, so you can query into the JSON fields if needed.

---

### Contract 2: API Endpoints

| Method | Endpoint                  | Description                          | Owner |
| ------ | ------------------------- | ------------------------------------ | ----- |
| GET    | `/health`                 | `{"status": "ok"}`                   | A     |
| POST   | `/webhook`                | GitHub App webhook — PR events       | A     |
| POST   | `/audit`                  | Start scan → `{scan_id, stream_url}` | A     |
| GET    | `/audit/{scan_id}/stream` | SSE progress stream                  | A     |
| GET    | `/report/{id}`            | Full report JSON                     | B     |
| GET    | `/reports`                | Last 20 scans summary                | B     |
| GET    | `/auth/github/url`        | OAuth URL + CSRF state               | A     |
| POST   | `/auth/github/callback`   | Exchange code → access_token         | A     |

**POST /audit** accepts `multipart/form-data`. Exactly one field required:

- `repo_url` (public URL) OR
- `github_token` + `repo_name` (private OAuth) OR
- `zip_file` (upload)

Returns immediately: `{"scan_id": "...", "stream_url": "/audit/{scan_id}/stream"}`

**GET /report/{id}** returns:

```json
{
  "id": "...",
  "repo_name": "...",
  "verdict": "GO",
  "total_score": 78.5,
  "category_scores": {
    "secrets": 85,
    "dependencies": 90,
    "sast": 70,
    "compliance": 65,
    "prompt_injection": 80
  },
  "findings": [
    {
      "id": "VA-A1B2C3D4",
      "title": "...",
      "severity": "high",
      "category": "sast",
      "file_path": "app.py",
      "line_number": 42,
      "description": "...",
      "remediation": "...",
      "ai_prompt": "...",
      "tool": "bandit"
    }
  ],
  "trigger_source": "url",
  "scanned_at": "2026-02-28T..."
}
```

**SSE stream events:**

```
event: progress
data: {"message": "Scanning repository..."}

event: progress
data: {"message": "Analysis complete, saving results..."}

event: complete
data: {"report_id": "abc123"}

event: error
data: {"message": "Clone failed: repository not found"}
```

---

### Contract 3: SCAN_STATUS dict (state.py)

```python
SCAN_STATUS: dict[str, dict] = {}

# Shape per entry:
SCAN_STATUS[scan_id] = {
    "status": "pending" | "scanning" | "complete" | "error",
    "progress": ["Cloning repository...", "Scanning repository...", "Analysis complete, saving results..."],
    "report_id": str | None,
    "error": str | None
}
```

> **Note:** The orchestrator runs all analyzers in parallel — you cannot get per-analyzer progress callbacks. Keep progress messages simple: "Cloning...", "Scanning...", "Saving...".

---

## Detailed Prompts Per Member

### Member A — FastAPI Server + GitHub App + Webhook

#### Prompt 1: `github/app.py`

```
Build github/app.py for a GitHub App integration:
- get_jwt_token() -> str: Generates JWT using GITHUB_APP_ID and
  GITHUB_PRIVATE_KEY env vars. Uses PyJWT with RS256 algorithm.
  JWT expires in 10 minutes, issued at now - 60s.
- get_installation_token(installation_id: int) -> str: Uses the JWT
  to POST /app/installations/{id}/access_tokens on api.github.com.
  Returns the token string.
- get_installation_client(installation_id: int) -> tuple[httpx.AsyncClient, str]:
  Returns an authenticated async HTTP client + token for GitHub API calls.
  Client has Authorization: token {installation_token} header.
- All functions are async. Use httpx for HTTP calls.
- Env vars: GITHUB_APP_ID (int), GITHUB_PRIVATE_KEY (full PEM string)
```

#### Prompt 2: `github/oauth.py`

```
Build github/oauth.py for GitHub OAuth (separate from the GitHub App):
- get_oauth_url() -> tuple[str, str]: Generates GitHub OAuth authorize URL
  with client_id from GITHUB_OAUTH_CLIENT_ID env var. Generates random
  state string for CSRF protection. Returns (url, state).
  Scope: "repo" (to read private repos).
- exchange_code_for_token(code: str, state: str) -> str: POSTs to
  github.com/login/oauth/access_token with code, client_id, client_secret.
  GITHUB_OAUTH_CLIENT_SECRET from env var. Returns access_token string.
  Accept: application/json header.
- Both async. Use httpx.
```

#### Prompt 3: `backend/main.py` + `backend/state.py`

```
Build two files:

1. backend/main.py — FastAPI application:
- Create FastAPI app with title="VibeAudit API"
- Add CORS middleware allowing ALL origins (for ngrok + localhost + production)
- On startup event: call database.init_db()
- Include routers from routes/webhook.py, routes/audit.py, routes/report.py
- Add GET /health returning {"status": "ok"}
- Add GET /auth/github/url calling oauth.get_oauth_url(), returns {url, state}
- Add POST /auth/github/callback accepting {code, state}, calls
  oauth.exchange_code_for_token(), returns {access_token}

2. backend/state.py — Shared scan state:
- SCAN_STATUS: dict[str, dict] = {}
- Shape: {"status": "pending"|"scanning"|"complete"|"error",
  "progress": list[str], "report_id": str|None, "error": str|None}
```

#### Prompt 4: `backend/routes/webhook.py`

```
Build backend/routes/webhook.py — GitHub App webhook handler:
- POST /webhook route
- Verify webhook signature using GITHUB_WEBHOOK_SECRET env var
  (HMAC-SHA256 of request body vs X-Hub-Signature-256 header)
- Only handle "pull_request" events with action "opened" or "synchronize"
- Extract: repo full name, PR number, installation_id from payload
- Return 200 immediately, spawn BackgroundTask that:
  1. get_installation_client(installation_id) → client + token
  2. Set commit status to 'pending' via GitHub API
  3. Clone repo: clone_from_url(f"https://x-access-token:{token}@github.com/{repo}.git")
  4. Run scan: scan_runner.run_scan(repo_path, scan_id, trigger_source="webhook")
  5. Post PR comment with result.to_markdown()
  6. Set commit status to 'failure' if score < FAIL_UNDER_SCORE, else 'success'
  7. Cleanup: repo_cloner.cleanup(repo_path) in finally block
- Use FastAPI BackgroundTasks. FAIL_UNDER_SCORE from env var (default 70).
```

#### Prompt 5: `backend/routes/audit.py`

```
Build backend/routes/audit.py with two routes:

1. POST /audit — Start a scan:
- Accepts multipart/form-data with exactly one of:
  - repo_url: str (public GitHub URL)
  - github_token: str + repo_name: str (private OAuth)
  - zip_file: UploadFile (.zip upload)
- Generates scan_id = str(uuid4())
- Initializes SCAN_STATUS[scan_id] = {"status": "pending", "progress": [], "report_id": None, "error": None}
- Spawns BackgroundTask: clone/extract repo → scan_runner.run_scan()
- Returns immediately: {"scan_id": scan_id, "stream_url": f"/audit/{scan_id}/stream"}

2. GET /audit/{scan_id}/stream — SSE progress stream:
- Returns StreamingResponse with media_type="text/event-stream"
- Polls SCAN_STATUS[scan_id] every 0.5s
- Yields SSE events:
  - While scanning: event: progress, data: {"message": latest_progress_item}
  - On complete: event: complete, data: {"report_id": "..."}
  - On error: event: error, data: {"message": "..."}
- Stops streaming after complete or error
- scan_id not found → 404
```

#### Prompt 6: `backend/services/repo_cloner.py`

```
Build backend/services/repo_cloner.py:
- clone_from_url(url: str, target_dir: str = None) -> str:
  Runs "git clone --depth 1 {url} {target_dir}" as async subprocess.
  If target_dir is None, creates a tempdir. Returns the repo path.
  Raises on failure.
- extract_zip(zip_file: UploadFile, target_dir: str = None) -> str:
  Saves uploaded ZIP to temp location, extracts with zipfile module.
  Returns extracted directory path. Validates: no path traversal,
  max size 50MB, max 1000 files.
- cleanup(repo_path: str) -> None:
  shutil.rmtree(repo_path, ignore_errors=True)
- All functions async where needed. Use tempfile.mkdtemp().
```

#### Prompt 7: `backend/services/scan_runner.py`

> **CRITICAL:** This is the bridge between the `vibe_check` engine and the backend. Must pass `config` and set `cwd` correctly.

```
Build backend/services/scan_runner.py:

async def run_scan(repo_path: str, scan_id: str, trigger_source: str = "url") -> None:
    1. Import SCAN_STATUS from backend.state
    2. Import database from backend.database
    3. Set SCAN_STATUS[scan_id]["status"] = "scanning"
    4. Append to progress: "Scanning repository..."

    5. Build analyzer list:
       from vibe_check.analyzers.secrets import SecretsAnalyzer
       from vibe_check.analyzers.sast import SASTAnalyzer
       from vibe_check.analyzers.dependencies import DependencyAnalyzer
       from vibe_check.analyzers.hallucination import HallucinationDetector
       from vibe_check.analyzers.compliance import ComplianceAnalyzer
       from vibe_check.analyzers.prompt_injection import PromptInjectionAnalyzer
       from vibe_check.analyzers.llm_summarizer import LLMSummarizer
       analyzers = [SecretsAnalyzer(), SASTAnalyzer(), DependencyAnalyzer(),
                    HallucinationDetector(), ComplianceAnalyzer(),
                    PromptInjectionAnalyzer(), LLMSummarizer()]

    6. IMPORTANT — load config for exclude logic:
       from vibe_check.utils.config import load_config
       config = load_config(repo_path)

    7. Create orchestrator:
       from vibe_check.core.orchestrator import Orchestrator
       orchestrator = Orchestrator(analyzers=analyzers, config=config)

    8. result = await orchestrator.run(repo_path)

    9. Append to progress: "Analysis complete, saving results..."

    10. Map verdict: "GO" if result.score >= FAIL_UNDER_SCORE else "NO-GO"
        FAIL_UNDER_SCORE = int(os.getenv("FAIL_UNDER_SCORE", "70"))

    11. await database.save_scan(scan_id, result, trigger_source, verdict)

    12. Set SCAN_STATUS[scan_id] = {
            "status": "complete",
            "progress": [...],
            "report_id": scan_id,
            "error": None
        }

    On exception:
        SCAN_STATUS[scan_id]["status"] = "error"
        SCAN_STATUS[scan_id]["error"] = str(e)
```

#### Prompt 8: `scripts/`

```
Create two files:

1. scripts/start_dev.sh — Dev server launcher:
#!/bin/bash
echo "Starting VibeAudit dev server..."
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
echo "Backend running on http://localhost:8000"
echo "Starting ngrok tunnel..."
ngrok http 8000 &
sleep 2
python scripts/get_ngrok_url.py
echo "Update your GitHub App webhook URL to the ngrok URL + /webhook"
wait $SERVER_PID

2. scripts/get_ngrok_url.py:
Hits http://localhost:4040/api/tunnels (ngrok local API)
Prints the public HTTPS URL. Handles: ngrok not running.
```

---

### Member B — Database (Supabase) + Report Endpoints

#### Prompt 1: `backend/database.py`

```
Build backend/database.py using the supabase-py client:

from supabase import create_client, Client
import os, json

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service role key for server-side

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def init_db() -> None:
    # Tables are created via Supabase dashboard or migrations.
    # This function is a no-op but kept for interface compatibility.
    pass

async def save_scan(scan_id: str, result: ScanResult, source: str, verdict: str) -> str:
    Insert into scans table:
    - id=scan_id, repo_name=result.repo_path, trigger_source=source
    - verdict=verdict (already mapped to GO/NO-GO by caller)
    - total_score=result.score
    - category_scores_json=result.category_scores  (Supabase handles dict → JSONB natively)
    - finding_count=len(result.findings)
    - report_json=json.loads(result.to_json())  (parse to dict so Supabase stores as JSONB)

    Insert each finding into findings table:
    - id=finding.id, scan_id=scan_id
    - title=finding.title, severity=finding.severity.value
    - category=finding.category.value, file_path=finding.file
    - line_number=finding.line, description=finding.description
    - remediation=finding.remediation, ai_prompt=finding.ai_prompt
    - tool=finding.tool

    Use supabase.table("scans").insert({...}).execute()
    Use supabase.table("findings").insert([{...}, ...]).execute()
    Return scan_id.

    Note: supabase-py is synchronous by default. Wrap calls with
    asyncio.to_thread() if needed, or just call them directly
    (they're fast network calls, acceptable for a hackathon).

async def get_scan(scan_id: str) -> dict | None:
    Fetch scan: supabase.table("scans").select("*").eq("id", scan_id).single().execute()
    Fetch findings: supabase.table("findings").select("*").eq("scan_id", scan_id).execute()
    Combine into the report shape:
    {"id", "repo_name", "verdict", "total_score",
     "category_scores": row["category_scores_json"],
     "findings": findings_data, "trigger_source", "scanned_at"}
    Return None if not found.

async def get_recent_scans(limit: int = 20) -> list[dict]:
    supabase.table("scans").select("id, repo_name, verdict, total_score, finding_count, scanned_at")
      .order("scanned_at", desc=True).limit(limit).execute()
    Return list of scan summaries.
```

#### Prompt 2: `backend/routes/report.py`

```
Build backend/routes/report.py:

GET /report/{scan_id}:
- Calls database.get_scan(scan_id)
- If None: raise HTTPException(404, "Scan not found")
- Returns the full report dict

GET /reports:
- Optional query param: limit (int, default 20)
- Calls database.get_recent_scans(limit)
- Returns list of scan summaries
```

#### Prompt 3: `.env.example`

```
Create .env.example documenting ALL env vars:

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...         # Service role key (from Supabase dashboard → Settings → API)

# GitHub App (webhook + PR comments)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=

# GitHub OAuth App (frontend private repo access)
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# LLM API (pick one)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Scoring
FAIL_UNDER_SCORE=70
```

#### Supabase Setup Steps

```
1. Create a Supabase project at supabase.com
2. Go to SQL Editor, run the CREATE TABLE statements from Contract 1
3. Go to Settings → API → copy the Project URL and service_role key
4. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to your .env
```

---

### Member C — Next.js Frontend + OAuth

#### Prompt 1: Scaffold + Landing Page

```
Create a Next.js 14 app in frontend/ with App Router:
- npx create-next-app@latest with TypeScript, Tailwind CSS, App Router
- Install: recharts

Build app/page.tsx — Landing page:
- Three-tab input UI (URL / OAuth / ZIP) using InputSelector
- Default to URL tab. Dark theme. Title: "VibeAudit"
- Tagline: "Security auditor for vibe-coded repos"
```

#### Prompt 2: Input Components + API Client

```
Build:

1. components/InputSelector.tsx — Tab bar: "Public URL" | "GitHub (Private)" | "Upload ZIP"

2. components/PublicUrlInput.tsx — URL input + "Scan" button
   On submit: api.startScan({repo_url}) → redirect to /scan/{scan_id}
   Validate: must be valid github.com URL

3. components/OAuthInput.tsx
   No token: "Connect GitHub" button → api.getOAuthUrl() → redirect
   Has token: repo name input + "Scan" button

4. components/ZipUpload.tsx — Drag-and-drop + "Upload and Scan" button
   Accept .zip only. Show filename + size.

5. lib/api.ts:
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
   - startScan(data) → POST /audit as multipart → {scan_id, stream_url}
   - getOAuthUrl() → GET /auth/github/url → {url, state}
   - exchangeOAuthCode(code, state) → POST /auth/github/callback → {access_token}
   - getReport(id) → GET /report/{id}
   - getReports() → GET /reports
```

#### Prompt 3: OAuth Flow

```
1. context/AuthContext.tsx:
   - github_token (string | null), setToken, clearToken
   - React state ONLY — NEVER localStorage
   - Wrap root layout with AuthProvider

2. app/auth/callback/page.tsx:
   - Read code + state from URL params
   - Call api.exchangeOAuthCode(code, state)
   - Store token in AuthContext, redirect to /
   - Error state with "Try again" link
```

---

### Member D — Report UI + SSE Progress

#### Prompt 1: Scan Progress Page

```
1. app/scan/[scanId]/page.tsx — Renders ScanProgress with scanId

2. components/ScanProgress.tsx:
   - new EventSource(`${API_BASE}/audit/${scanId}/stream`)
   - List of progress messages (✓ completed, spinner on current)
   - "progress" event → append message
   - "complete" event → redirect to /report/{report_id}
   - "error" event → show error
   - Animated fade-in per step
```

#### Prompt 2: Report Page + Components

```
1. app/report/[id]/page.tsx — Fetch report, render components

2. components/ReportCard.tsx:
   - Score (green ≥80, yellow ≥60, red <60) + GO/NO-GO banner
   - Category breakdown with mini progress bars
   - Category keys: secrets, dependencies, sast, compliance, prompt_injection, code_quality

3. components/RadarChart.tsx (recharts):
   - 5+ dimensions from category_scores
   - Filled radar area, dark theme

4. components/FindingsList.tsx:
   - Group by severity (critical first)
   - Expandable cards: SeverityBadge + title + file:line
   - Expand to show description + RemediationPrompt

5. components/RemediationPrompt.tsx:
   - Code block showing finding.ai_prompt
   - "Copy to Clipboard" button
   - Label: "Paste this into Cursor / Copilot:"

6. components/SeverityBadge.tsx:
   - Colored pill: critical=red, high=orange, medium=yellow, low=blue, info=gray
```

---

## Dependencies to Add

**`pyproject.toml`** — add to dependencies:

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
supabase>=2.0.0
python-multipart>=0.0.9
pyjwt[crypto]>=2.8.0
httpx>=0.27.0
```

**`frontend/package.json`** — key deps:

```
next, react, react-dom, typescript, tailwindcss, recharts
```

---

## Environment Variables

| Variable                     | Used In           | How to Get                                                 |
| ---------------------------- | ----------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`               | `database.py`     | Supabase dashboard → Settings → API → Project URL          |
| `SUPABASE_SERVICE_KEY`       | `database.py`     | Supabase dashboard → Settings → API → service_role key     |
| `GITHUB_APP_ID`              | `github/app.py`   | GitHub App settings page                                   |
| `GITHUB_PRIVATE_KEY`         | `github/app.py`   | Download .pem from GitHub App page                         |
| `GITHUB_WEBHOOK_SECRET`      | `webhook.py`      | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GITHUB_OAUTH_CLIENT_ID`     | `github/oauth.py` | github.com/settings/developers (separate OAuth App)        |
| `GITHUB_OAUTH_CLIENT_SECRET` | `github/oauth.py` | Same OAuth App page                                        |
| `GEMINI_API_KEY`             | `llm_client.py`   | Already in .env                                            |
| `FAIL_UNDER_SCORE`           | `scan_runner.py`  | Default 70                                                 |

> **Two separate GitHub registrations:** (1) GitHub App — webhook + PR comments. (2) GitHub OAuth App — frontend private repo access. Different IDs, different credentials, different purpose.

---

## Build Order

| Order | Who | Task                                                   | Blocks                 |
| ----- | --- | ------------------------------------------------------ | ---------------------- |
| 1st   | All | Scaffold: A creates `backend/`, C+D create `frontend/` | Everything             |
| 1st   | B   | Create Supabase tables + `backend/database.py`         | Save/fetch scans       |
| 1st   | A   | `github/app.py` + `github/oauth.py`                    | Webhook + OAuth        |
| 2nd   | A   | `backend/main.py` + `state.py`                         | All routes             |
| 2nd   | B   | `backend/routes/report.py` + `.env.example`            | Frontend report page   |
| 2nd   | C   | Input tabs + `lib/api.ts` + `AuthContext`              | User can trigger scans |
| 2nd   | D   | `ScanProgress` SSE component                           | Live progress          |
| 3rd   | A   | `repo_cloner.py` + `scan_runner.py`                    | Scan execution         |
| 3rd   | A   | `routes/webhook.py` + `routes/audit.py`                | All scan flows         |
| 3rd   | C   | OAuth callback flow                                    | Private repo scanning  |
| 3rd   | D   | Report page + RadarChart + FindingsList                | Demo output            |
| 4th   | A+B | Integration test — all flows end-to-end                | Demo                   |
| 4th   | C+D | Integration test — frontend ↔ backend                  | Demo                   |
| 5th   | All | Bug fixes + demo prep                                  | Presentation           |

---

## Integration Points

| What                   | Producer                | Consumer                    | Must Match                                   |
| ---------------------- | ----------------------- | --------------------------- | -------------------------------------------- |
| `save_scan()`          | `scan_runner.py` (A)    | `database.py` (B)           | `(scan_id, ScanResult, source, verdict)`     |
| `SCAN_STATUS`          | `scan_runner.py` (A)    | `audit.py` SSE (A)          | `{status, progress[], report_id, error}`     |
| `GET /report/{id}`     | B implements            | D fetches                   | JSON shape matches RadarChart + FindingsList |
| `POST /audit` response | A implements            | C calls from `api.ts`       | `{scan_id, stream_url}`                      |
| SSE events             | A emits from `audit.py` | D listens in `ScanProgress` | `{event, message/report_id}`                 |
| AuthContext token      | C stores after OAuth    | C sends to POST /audit      | Sent as `github_token` in multipart          |

---

## Demo Checklist

| #   | Check                                                | Who |
| --- | ---------------------------------------------------- | --- |
| 1   | GitHub App installed, webhook fires on PR open       | A   |
| 2   | PR comment posts with score + findings + remediation | A   |
| 3   | POST /audit with public URL → scan completes         | A+B |
| 4   | SSE stream shows progress live in frontend           | A+D |
| 5   | Report page loads with radar chart and findings      | D   |
| 6   | Each finding has copyable remediation prompt         | D   |
| 7   | GitHub OAuth loop works with private repo            | C   |
| 8   | ZIP upload extracts, scans, report renders           | C+D |
| 9   | All 3 input tabs functional on landing page          | C   |
| 10  | Demo repo produces interesting findings              | All |
