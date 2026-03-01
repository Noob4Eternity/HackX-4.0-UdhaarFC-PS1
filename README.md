<p align="center">
  <img src="https://img.shields.io/badge/VibeAudit-Security%20Auditor-blueviolet?style=for-the-badge" alt="VibeAudit"/>
</p>

<h1 align="center">VibeAudit</h1>

<p align="center">
  <b>Security auditor for vibe-coded repos — 95% deterministic, 25x cheaper than competitors.</b>
</p>

<p align="center">
  <a href="https://pypi.org/project/vibe-check-cli/"><img src="https://img.shields.io/pypi/v/vibe-check-cli?color=blue&label=PyPI" alt="PyPI Version"/></a>
  <a href="https://pypi.org/project/vibe-check-cli/"><img src="https://img.shields.io/pypi/pyversions/vibe-check-cli" alt="Python Versions"/></a>
  <img src="https://img.shields.io/github/license/Noob4Eternity/HackX-4.0-UdhaarFC-PS1" alt="License"/>
  <a href="https://github.com/Noob4Eternity/vibe-check-cli"><img src="https://img.shields.io/badge/CLI%20Engine-GitHub-181717?logo=github" alt="CLI Engine Repo"/></a>
</p>

---

"Vibe-coded" repos — projects written rapidly with AI assistants like Cursor, Copilot, and ChatGPT — frequently ship with hallucinated imports, leaked secrets, insecure patterns, and compliance gaps. **VibeAudit** automates detection across **9 security dimensions** using a combination of deterministic static analysis and targeted LLM reasoning.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [CLI Tool](#cli-tool)
- [Web Dashboard](#web-dashboard)
- [VS Code Extension](#vs-code-extension)
- [GitHub Integration](#github-integration)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [License](#license)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VibeAudit Monorepo                       │
├──────────────┬──────────────┬───────────────┬───────────────────┤
│  vibe_check/ │   backend/   │    webapp/    │  vibe-extension/  │
│  CLI Engine  │ FastAPI API  │ Next.js 14 UI │  VS Code Plugin   │
│  (PyPI pkg)  │  + Supabase  │  + shadcn/ui  │                   │
└──────┬───────┴──────┬───────┴───────┬───────┴─────────┬─────────┘
       │              │               │                 │
       ▼              ▼               ▼                 ▼
   Terminal /    GitHub Webhooks   Dashboard &      Sidebar panel
   CI Pipelines  + PR Comments    Scan Trigger     in VS Code
```

**Flow:** CLI engine runs 9 analyzers in parallel → results stored in Supabase → displayed in the Next.js dashboard or posted as PR comments.

## Features

### 9 Security Analyzers

| Analyzer | Method | What It Detects |
|----------|--------|-----------------|
| **Secrets** | `detect-secrets` | AWS keys, GitHub tokens, JWTs, Stripe keys, 18+ credential types |
| **SAST** | Bandit + Semgrep | SQL injection, shell injection, `eval`/`exec`, insecure CORS, hardcoded JWTs |
| **Dependencies** | PyPI/npm/RubyGems/crates.io APIs | Hallucinated packages, typosquats, deprecated/outdated deps, known CVEs |
| **Hallucination Detection** | AST parsing (no LLM) | Non-existent named imports from React, Next.js, Flask, FastAPI, etc. |
| **Next.js Security** | Regex + AST | Unprotected API routes, `NEXT_PUBLIC_` secret leaks, unvalidated server actions |
| **Cost Efficiency** | Regex (no LLM) | Expensive LLM models, over-provisioned K8s/Lambda, missing caching, bloated deps |
| **Compliance** | Semgrep + LLM | GDPR + SOC2 gap analysis |
| **Prompt Injection** | Semgrep + LLM | Unsanitized user input flowing into LLM calls (OWASP LLM Top 10) |
| **LLM Summarizer** | LLM | Executive summary + copy-paste remediation prompts per finding |

### Scoring System

- Each category starts at **100**, with deductions per finding based on severity (CRITICAL: -30, HIGH: -15, MEDIUM: -7, LOW: -3)
- Diminishing returns after the 4th finding per category
- Weighted composite across all 9 categories
- Grades: **A+** (97+) through **F** (<60)
- Verdicts: `PRODUCTION READY` → `NEEDS REMEDIATION` → `NOT PRODUCTION READY` → `CRITICAL — DO NOT DEPLOY`

## CLI Tool

> **PyPI:** [vibe-check-cli](https://pypi.org/project/vibe-check-cli/) | **Source:** [github.com/Noob4Eternity/vibe-check-cli](https://github.com/Noob4Eternity/vibe-check-cli)

### Install

```bash
pip install vibe-check-cli
```

### Commands

```bash
# Full security scan
vibe-check scan <path> --mode full --format terminal

# Fast scan (deterministic only, no LLM)
vibe-check scan <path> --mode fast

# Output as JSON or Markdown
vibe-check scan <path> --format json
vibe-check scan <path> --format markdown

# Quick score
vibe-check score <path>

# CI/CD gating (exits with non-zero if score < threshold)
vibe-check scan <path> --exit-code --threshold 70

# Initialize config + git hooks
vibe-check init
```

### Configuration

Create a `.vibecheck.yml` in your project root:

```yaml
mode: full            # full | fast
severity:
  - critical
  - high
  - medium
llm_provider: gemini  # gemini | openai | anthropic
threshold: 70
```

## Web Dashboard

A full-featured Next.js 14 dashboard for triggering scans and viewing results.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with feature overview and install snippet |
| `/dashboard` | Score ring, severity charts, category breakdowns, priority fixes, hotspot files |
| `/scan` | Trigger scans via GitHub URL, ZIP upload, or private repo picker |
| `/vulnerabilities` | Filterable and paginated findings table |

### Dashboard Highlights

- **Animated score ring** with letter grade overlay
- **Real-time scan progress** via SSE — 11-phase stepper + live terminal log
- **Severity donut chart** and **score history trend** (custom SVG, no chart library)
- **Priority fixes** with copy-paste AI-generated remediation prompts
- **Hotspot files** ranked by composite risk score
- **AI executive summary** panel

### Run the Dashboard

```bash
cd webapp
pnpm install
pnpm dev
```

## VS Code Extension

Scan your workspace directly from VS Code with a sidebar panel.

- Trigger scans from the command palette (`VibeCheck: Scan`)
- View results in a dedicated sidebar with live progress
- Configurable Python path, scan mode, and threshold via VS Code settings

```
vibecheck.pythonPath    # Path to Python interpreter
vibecheck.scanMode      # full | fast
vibecheck.threshold     # Score threshold (default: 60)
```

## GitHub Integration

### GitHub App (Webhooks)

Automatically scans pull requests and posts results as PR comments:

1. Receives `pull_request.opened` / `synchronize` events
2. Sets commit status to `pending`
3. Clones and runs the full 9-analyzer pipeline
4. Posts a Markdown report as a PR comment
5. Sets commit status to `success` or `failure` based on score threshold

### GitHub Actions

Add VibeAudit to your CI pipeline:

```yaml
# .github/workflows/vibecheck.yml
name: VibeAudit
on:
  pull_request:
    branches: [main]

jobs:
  vibecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install vibe-check-cli
      - run: vibe-check scan . --format markdown > vibecheck-report.md
      - run: vibe-check score . --exit-code --threshold 60
```

### GitHub OAuth

Authenticate with GitHub to scan private repositories from the web dashboard.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and pnpm
- A [Supabase](https://supabase.com) project (for persistence)
- At least one LLM API key (Gemini, OpenAI, or Anthropic)

### Setup

```bash
# Clone the repo
git clone https://github.com/Noob4Eternity/HackX-4.0-UdhaarFC-PS1.git
cd HackX-4.0-UdhaarFC-PS1

# Copy environment variables
cp .env.example .env
# Fill in your keys in .env

# Install the CLI engine
pip install -e .

# Start the backend
uvicorn backend.main:app --reload --port 8000

# Start the frontend (in a separate terminal)
cd webapp
pnpm install
pnpm dev
```

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=

# GitHub App (webhooks + PR comments)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

# GitHub OAuth (private repo access)
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# LLM Providers (at least one required for full mode)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Scoring
FAIL_UNDER_SCORE=70
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Scan Engine | Python 3.11+, asyncio, Typer, Rich |
| SAST | Bandit, Semgrep (custom rules) |
| Secrets Detection | detect-secrets |
| Dependency Audit | aiohttp, PyPI / npm / RubyGems / crates.io APIs |
| LLM Providers | Google Gemini 2.5 Pro, OpenAI GPT-4o, Anthropic Claude Sonnet |
| API Server | FastAPI, Uvicorn |
| Database | Supabase (PostgreSQL + JSONB) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui |
| VS Code Extension | TypeScript, VS Code Extension API |
| CI/CD | GitHub Actions |

## License

MIT

---

<p align="center">
  Built for <b>HackX 4.0</b> by Team <b>UdhaarFC</b>
</p>
