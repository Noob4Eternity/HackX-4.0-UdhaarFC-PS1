/**
 * Webview HTML generator — produces the sidebar panel content.
 * Design mirrors the webapp's o9solutions aesthetic: sharp corners,
 * extralight typography, noise-textured cards, monospace section labels.
 */

import * as vscode from 'vscode';
import { ScanState, Finding, ScanResult } from './types';

export function getWebviewHTML(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  state: ScanState
): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>VibeCheck Security</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div id="root">
    ${renderHeader(state)}
    ${renderContent(state)}
  </div>
  <script nonce="${nonce}">
    ${getScript()}
  </script>
</body>
</html>`;
}

/* ── Layout Renderers ────────────────────────────────────────── */

function renderHeader(state: ScanState): string {
  return `
    <div class="header">
      <div class="logo">
        <div class="logo-rings">
          <div class="logo-inner-circle"></div>
          <div class="logo-outer-ring"></div>
        </div>
        <span class="logo-text">vibe-check</span>
      </div>
      <div class="repo-name" title="${state.repoPath}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
        ${escapeHtml(state.repoName)}
      </div>
    </div>
  `;
}

function renderContent(state: ScanState): string {
  switch (state.status) {
    case 'idle':
      return renderIdleState();
    case 'scanning':
      return renderScanningState();
    case 'complete':
      return state.result ? renderResultState(state.result) : renderIdleState();
    case 'error':
      return renderErrorState(state.error || 'Unknown error');
    default:
      return renderIdleState();
  }
}

/* ── State Views ─────────────────────────────────────────────── */

function renderIdleState(): string {
  return `
    <div class="idle-state">
      <div class="idle-icon">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.35">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <p class="idle-title">Security Scan</p>
      <p class="idle-text">Scan your repository for vulnerabilities, secrets, and compliance issues.</p>
      <button class="btn-primary" data-action="scan">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Scan Repository
      </button>
    </div>
  `;
}

function renderScanningState(): string {
  return `
    <div class="scanning-state">
      <div class="spinner-ring">
        <div class="spinner-inner"></div>
        <div class="spinner-outer"></div>
      </div>
      <p class="scanning-title">Analyzing repository</p>
      <p class="scanning-sub">Running security analyzers in parallel</p>
      <div class="progress-steps">
        <div class="step active">Secrets detection</div>
        <div class="step active">SAST analysis</div>
        <div class="step active">Dependency audit</div>
        <div class="step active">Compliance checks</div>
        <div class="step active">LLM review</div>
      </div>
    </div>
  `;
}

function renderErrorState(error: string): string {
  return `
    <div class="error-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p class="error-title">Scan Failed</p>
      <p class="error-text">${escapeHtml(error)}</p>
      <button class="btn-primary" data-action="scan">Retry Scan</button>
    </div>
  `;
}

/* ── Result View ─────────────────────────────────────────────── */

function renderResultState(result: ScanResult): string {
  const scoreColor = getScoreColor(result.score);
  const isGo = result.score >= 70;

  // Count by severity
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of result.findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }

  // Category data
  const catScoreEntries = Object.entries(result.category_scores).sort(([, a], [, b]) => a - b);

  // Findings by category (excluding llm_review)
  const catCounts: Record<string, number> = {};
  for (const f of result.findings) {
    if (f.category === 'llm_review') { continue; }
    catCounts[f.category] = (catCounts[f.category] || 0) + 1;
  }
  const catCountEntries = Object.entries(catCounts).sort(([, a], [, b]) => b - a);
  const maxCatCount = catCountEntries.length > 0 ? catCountEntries[0][1] : 1;

  // Hotspot files
  const fileMap: Record<string, { count: number; severities: string[] }> = {};
  for (const f of result.findings) {
    if (!f.file) { continue; }
    if (!fileMap[f.file]) { fileMap[f.file] = { count: 0, severities: [] }; }
    fileMap[f.file].count++;
    fileMap[f.file].severities.push(f.severity);
  }
  const hotspotFiles = Object.entries(fileMap)
    .map(([fileName, data]) => {
      const w: Record<string, number> = { critical: 40, high: 25, medium: 10, low: 3, info: 1 };
      const risk = Math.min(100, data.severities.reduce((a, s) => a + (w[s] || 1), 0));
      const worst = data.severities.sort((a, b) => (w[b] || 0) - (w[a] || 0))[0];
      return { fileName, risk, issues: data.count, severity: worst };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5);

  return `
    <div class="result-state">

      <!-- Score Card -->
      <div class="card score-card">
        <div class="score-layout">
          <div class="score-ring-wrap">
            <svg viewBox="0 0 120 120" class="score-ring">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="${scoreColor}" stroke-width="8"
                stroke-dasharray="${(result.score / 100) * 314.159} ${314.159 - (result.score / 100) * 314.159}"
                stroke-dashoffset="78.54"
                stroke-linecap="round"
                style="filter: drop-shadow(0 0 6px ${scoreColor})"
                class="score-arc"/>
            </svg>
            <div class="score-text">
              <span class="score-value" style="color:${scoreColor}">${result.score.toFixed(0)}</span>
              <span class="score-label">/ 100</span>
            </div>
          </div>

          <div class="score-divider"></div>

          <div class="score-meta">
            <div class="status-badge ${isGo ? 'status-go' : 'status-nogo'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${isGo
                  ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                  : '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'}
              </svg>
              <span>${isGo ? 'GO' : 'NO GO'}</span>
            </div>
            <span class="verdict-hint">${isGo
              ? 'Safe to deploy with minor recommendations'
              : 'Significant vulnerabilities require attention'}</span>

            <div class="severity-counts">
              ${renderSeverityCount('Critical', counts.critical, '#f87171')}
              <div class="sev-divider"></div>
              ${renderSeverityCount('High', counts.high, '#fb923c')}
              <div class="sev-divider"></div>
              ${renderSeverityCount('Medium', counts.medium, '#facc15')}
              <div class="sev-divider"></div>
              ${renderSeverityCount('Low', counts.low, '#94a3b8')}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-num">${result.findings_count}</span>
          <span class="stat-lbl">Findings</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat-item">
          <span class="stat-num">${result.files_scanned}</span>
          <span class="stat-lbl">Files</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat-item">
          <span class="stat-num">${result.scan_time.toFixed(1)}s</span>
          <span class="stat-lbl">Time</span>
        </div>
      </div>

      <!-- Category Scores -->
      ${catScoreEntries.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="section-label">Category Scores</span>
        </div>
        <div class="card-body">
          ${catScoreEntries.map(([cat, score]) => {
            const c = getScoreColor(score);
            const label = cat.replace(/_/g, ' ');
            return `
            <div class="bar-row">
              <span class="bar-label">${escapeHtml(label)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${score}%; background:${c}"></div></div>
              <span class="bar-value" style="color:${c}">${Math.round(score)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Findings by Category -->
      ${catCountEntries.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <span class="section-label">Findings by Category</span>
        </div>
        <div class="card-body">
          ${catCountEntries.map(([cat, count]) => {
            const pct = (count / maxCatCount) * 100;
            const catColor = getCategoryColor(cat);
            const label = cat.replace(/_/g, ' ');
            return `
            <div class="bar-row">
              <span class="bar-label">${escapeHtml(label)}</span>
              <div class="bar-track cat-track"><div class="bar-fill" style="width:${pct}%; background:${catColor}"></div></div>
              <span class="bar-value" style="color:var(--vscode-descriptionForeground)">${count}</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Hotspot Files -->
      ${hotspotFiles.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="section-label">Hotspot Files</span>
        </div>
        <div class="card-body no-gap">
          <div class="table-grid table-header-row">
            <span class="th">File</span>
            <span class="th center">Risk</span>
            <span class="th center">Issues</span>
            <span class="th center">Severity</span>
          </div>
          ${hotspotFiles.map((f) => {
            const riskColor = f.risk >= 80 ? '#f87171' : f.risk >= 60 ? '#fb923c' : '#facc15';
            return `
          <div class="table-grid table-row" data-action="openFile" data-file="${escapeAttr(f.fileName)}" data-line="1">
            <span class="td file-cell" title="${escapeAttr(f.fileName)}">${escapeHtml(shortPath(f.fileName))}</span>
            <span class="td center" style="color:${riskColor}; font-weight:500">${f.risk}</span>
            <span class="td center muted">${f.issues}</span>
            <span class="td center"><span class="sev-pill sev-${f.severity}">${f.severity}</span></span>
          </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Findings List -->
      <div class="card">
        <div class="card-header">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <span class="section-label">All Findings (${result.findings_count})</span>
        </div>
        <div class="findings-list">
          ${result.findings
            .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
            .map((f, i) => renderFinding(f, i))
            .join('')}
          ${result.findings.length === 0 ? `
          <div class="empty-findings">
            <p class="muted">No vulnerabilities found — great job!</p>
          </div>` : ''}
        </div>
      </div>

      <!-- Rescan -->
      <button class="btn-secondary" data-action="scan">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 16A10 10 0 0 1 21.5 8"/><path d="M21.5 8A10 10 0 0 1 2.5 16"/></svg>
        Re-scan
      </button>
    </div>
  `;
}

/* ── Component Helpers ───────────────────────────────────────── */

function renderSeverityCount(label: string, count: number, color: string): string {
  return `
    <div class="sev-count-item">
      <span class="sev-num" style="color:${color}">${count}</span>
      <span class="sev-lbl">${label}</span>
    </div>`;
}

function renderFinding(finding: Finding, index: number): string {
  const sevColors: Record<string, string> = {
    critical: '#f87171', high: '#fb923c', medium: '#facc15', low: '#94a3b8', info: '#6b7280'
  };
  const color = sevColors[finding.severity] || '#6b7280';
  const loc = finding.file
    ? `${finding.file}${finding.line ? ':' + finding.line : ''}`
    : '';

  return `
    <div class="finding">
      <button class="finding-header" data-action="toggle" data-index="${index}">
        <div class="finding-left">
          <span class="sev-dot" style="background:${color}"></span>
          <div class="finding-info">
            <span class="finding-title">${escapeHtml(finding.title)}</span>
            ${loc ? `<span class="finding-loc" data-action="openFile" data-file="${escapeAttr(finding.file || '')}" data-line="${finding.line || 0}">${escapeHtml(loc)}</span>` : ''}
          </div>
        </div>
        <div class="finding-right">
          <span class="sev-pill sev-${finding.severity}">${finding.severity}</span>
          <svg class="chevron" id="chevron-${index}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      <div class="finding-body" id="finding-body-${index}">
        <p class="finding-desc">${escapeHtml(finding.description)}</p>

        <div class="finding-tags">
          <span class="tag">${escapeHtml(finding.tool)}</span>
          <span class="tag">${escapeHtml(finding.category.replace(/_/g, ' '))}</span>
          ${finding.cwe ? `<span class="tag">${escapeHtml(finding.cwe)}</span>` : ''}
          ${finding.confidence ? `<span class="tag">${escapeHtml(String(finding.confidence))}</span>` : ''}
        </div>

        <div class="remediation-block">
          <div class="block-label green">Recommended Fix</div>
          <p class="block-text">${escapeHtml(finding.remediation)}</p>
        </div>

        ${finding.ai_prompt ? `
        <div class="ai-block">
          <div class="block-label purple">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
            AI Fix Prompt
          </div>
          <pre class="code-block">${escapeHtml(finding.ai_prompt)}</pre>
          <div class="prompt-actions">
            <button class="btn-sm" data-action="copy" data-prompt="${escapeAttr(finding.ai_prompt)}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copy
            </button>
            <button class="btn-sm btn-purple" data-action="fix" data-prompt="${escapeAttr(finding.ai_prompt)}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              Fix with AI
            </button>
          </div>
        </div>` : ''}
      </div>
    </div>
  `;
}

/* ── Utilities ───────────────────────────────────────────────── */

function getScoreColor(score: number): string {
  if (score >= 80) { return '#22c55e'; }
  if (score >= 50) { return '#eab308'; }
  return '#ef4444';
}

const CATEGORY_COLORS: Record<string, string> = {
  secret: '#a855f7', sast: '#ef4444', vulnerable_dependency: '#64748b',
  hallucinated_dependency: '#f97316', hallucinated_import: '#f97316',
  compliance_gdpr: '#22c55e', compliance_soc2: '#22c55e', compliance: '#22c55e',
  prompt_injection: '#eab308', code_quality: '#94a3b8',
  iac_security: '#f59e0b', llm_review: '#8b5cf6',
  vibe_fingerprint: '#ec4899', framework_specific: '#14b8a6',
  dependencies: '#64748b', secrets: '#a855f7',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || '#94a3b8';
}

function shortPath(p: string): string {
  const parts = p.split('/');
  if (parts.length <= 3) { return p; }
  return '\u2026/' + parts.slice(-2).join('/');
}

function severityOrder(sev: string): number {
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return order[sev] ?? 0;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

/* ── Styles ──────────────────────────────────────────────────── */

function getStyles(): string {
  return `
    /* ── Reset & Base ── */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 300;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.5;
    }

    #root { padding: 14px; }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .logo { display: flex; align-items: center; gap: 10px; }

    .logo-rings {
      position: relative;
      width: 24px;
      height: 24px;
    }
    .logo-inner-circle {
      position: absolute;
      top: 50%; left: 50%;
      width: 10px; height: 10px;
      transform: translate(-50%, -50%);
      border: 1.5px solid var(--vscode-foreground);
      border-radius: 50%;
    }
    .logo-outer-ring {
      position: absolute;
      top: 50%; left: 50%;
      width: 20px; height: 20px;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(255,255,255,0.2);
      border-top-color: var(--vscode-foreground);
      border-radius: 50%;
      animation: spin-logo 4s linear infinite;
    }

    .logo-text {
      font-size: 13px;
      font-weight: 300;
      letter-spacing: 0.02em;
      color: var(--vscode-foreground);
    }
    .repo-name {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 300;
      color: var(--vscode-descriptionForeground);
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Buttons ── */
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      border: 1px solid var(--vscode-foreground);
      background: var(--vscode-foreground);
      color: var(--vscode-sideBar-background);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.85; }
    .btn-primary:active { opacity: 0.7; }

    .btn-secondary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 8px 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: transparent;
      color: var(--vscode-foreground);
      font-size: 11px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s;
      margin-top: 12px;
    }
    .btn-secondary:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.04); }

    .btn-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: transparent;
      color: var(--vscode-foreground);
      font-size: 10px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-sm:hover { background: rgba(255,255,255,0.06); }
    .btn-purple { border-color: rgba(168,85,247,0.3); color: #c084fc; }
    .btn-purple:hover { background: rgba(168,85,247,0.1); }

    /* ── Idle ── */
    .idle-state { text-align: center; padding: 28px 0; }
    .idle-icon { margin-bottom: 16px; }
    .idle-title {
      font-size: 16px;
      font-weight: 200;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .idle-text {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 22px;
      font-size: 11px;
      font-weight: 300;
      line-height: 1.7;
      padding: 0 8px;
    }

    /* ── Scanning ── */
    .scanning-state { text-align: center; padding: 30px 0; }

    .spinner-ring {
      position: relative;
      width: 36px; height: 36px;
      margin: 0 auto 18px;
    }
    .spinner-inner {
      position: absolute;
      top: 50%; left: 50%;
      width: 12px; height: 12px;
      transform: translate(-50%, -50%);
      border: 1.5px solid var(--vscode-foreground);
      border-radius: 50%;
    }
    .spinner-outer {
      position: absolute;
      top: 50%; left: 50%;
      width: 32px; height: 32px;
      transform: translate(-50%, -50%);
      border: 1.5px solid rgba(255,255,255,0.15);
      border-top-color: var(--vscode-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .scanning-title { font-size: 13px; font-weight: 400; margin-bottom: 3px; }
    .scanning-sub { color: var(--vscode-descriptionForeground); font-size: 11px; font-weight: 300; margin-bottom: 18px; }

    .progress-steps { text-align: left; padding: 0 24px; }
    .step {
      font-size: 10px;
      font-weight: 300;
      color: var(--vscode-descriptionForeground);
      padding: 3px 0 3px 16px;
      position: relative;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .step::before {
      content: '';
      position: absolute;
      left: 0; top: 7px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
    }
    .step.active::before {
      background: var(--vscode-foreground);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes spin-logo { to { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes pulse { 0%,100% { opacity:0.3; } 50% { opacity:1; } }

    /* ── Error ── */
    .error-state { text-align: center; padding: 24px 0; }
    .error-title { font-size: 14px; font-weight: 400; margin: 14px 0 6px; color: #f87171; }
    .error-text {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      font-weight: 300;
      margin-bottom: 18px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 180px;
      overflow-y: auto;
      text-align: left;
      padding: 8px;
      border: 1px solid rgba(239,68,68,0.15);
      background: rgba(239,68,68,0.04);
    }

    /* ── Cards ── */
    .card {
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
      margin-bottom: 10px;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .card-body { padding: 10px 12px; }
    .card-body.no-gap { padding: 0; }

    .section-label {
      font-family: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', monospace);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }

    /* ── Score Card ── */
    .score-card { padding: 14px; margin-bottom: 10px; }
    .score-layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .score-ring-wrap {
      position: relative;
      width: 96px; height: 96px;
    }
    .score-ring {
      width: 100%; height: 100%;
      transform: rotate(-90deg);
    }
    .score-arc { transition: stroke-dasharray 1s ease; }
    .score-text {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .score-value {
      font-size: 28px;
      font-weight: 200;
      display: block;
      line-height: 1;
    }
    .score-label {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }

    .score-divider {
      width: 100%;
      height: 1px;
      background: rgba(255,255,255,0.06);
    }

    .score-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    /* ── Status Badge (GO / NO GO) ── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.08em;
      border: 1px solid;
    }
    .status-go {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.3);
      background: rgba(74, 222, 128, 0.08);
    }
    .status-nogo {
      color: #f87171;
      border-color: rgba(248, 113, 113, 0.3);
      background: rgba(248, 113, 113, 0.08);
    }

    .verdict-hint {
      font-size: 10px;
      font-weight: 300;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    /* ── Severity Counts ── */
    .severity-counts {
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      justify-content: center;
    }
    .sev-count-item { text-align: center; padding: 0 12px; }
    .sev-num { display: block; font-size: 18px; font-weight: 200; }
    .sev-lbl {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .sev-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.08); }

    /* ── Stats Row ── */
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 8px 0;
      margin-bottom: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
    }
    .stat-item { text-align: center; padding: 0 16px; }
    .stat-num { display: block; font-size: 15px; font-weight: 200; }
    .stat-lbl {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .stat-sep { width: 1px; height: 24px; background: rgba(255,255,255,0.08); }

    /* ── Bar rows (categories / severity) ── */
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .bar-row:last-child { margin-bottom: 0; }
    .bar-label {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      width: 76px;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .bar-track {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
    }
    .cat-track { height: 10px; border-radius: 1px; }
    .bar-fill {
      height: 100%;
      border-radius: inherit;
      transition: width 0.6s ease;
    }
    .bar-value {
      font-size: 10px;
      font-weight: 200;
      width: 24px;
      text-align: right;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    /* ── Table (Hotspot Files) ── */
    .table-grid {
      display: grid;
      grid-template-columns: 1fr 40px 40px 64px;
      gap: 0;
      padding: 6px 12px;
      align-items: center;
    }
    .table-header-row {
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .table-row {
      border-bottom: 1px solid rgba(255,255,255,0.03);
      cursor: pointer;
      transition: background 0.1s;
    }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: rgba(255,255,255,0.03); }
    .th {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .td { font-size: 10px; font-weight: 300; }
    .center { text-align: center; }
    .muted { color: var(--vscode-descriptionForeground); }
    .file-cell {
      font-family: var(--vscode-editor-font-family, monospace);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--vscode-textLink-foreground);
    }

    /* ── Severity Pills ── */
    .sev-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border: 1px solid;
      border-radius: 9px;
    }
    .sev-critical { color: #f87171; border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); }
    .sev-high { color: #fb923c; border-color: rgba(251,146,60,0.3); background: rgba(251,146,60,0.08); }
    .sev-medium { color: #facc15; border-color: rgba(250,204,21,0.3); background: rgba(250,204,21,0.08); }
    .sev-low { color: #94a3b8; border-color: rgba(148,163,184,0.3); background: rgba(148,163,184,0.08); }
    .sev-info { color: #6b7280; border-color: rgba(107,114,128,0.3); background: rgba(107,114,128,0.08); }

    /* ── Findings ── */
    .findings-list { }

    .finding {
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .finding:last-child { border-bottom: none; }

    .finding-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 9px 12px;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.1s;
    }
    .finding-header:hover { background: rgba(255,255,255,0.03); }

    .finding-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .finding-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .sev-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .finding-info { min-width: 0; }
    .finding-title {
      display: block;
      font-size: 11px;
      font-weight: 400;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .finding-loc {
      display: block;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      font-weight: 300;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .finding-loc:hover { text-decoration: underline; }

    .chevron { transition: transform 0.2s ease; flex-shrink: 0; opacity: 0.5; }
    .chevron.open { transform: rotate(180deg); }

    /* Finding Expanded Body */
    .finding-body {
      display: none;
      padding: 0 12px 12px 12px;
      border-top: 1px solid rgba(255,255,255,0.04);
    }
    .finding-body.open { display: block; }

    .finding-desc {
      font-size: 11px;
      font-weight: 300;
      color: var(--vscode-descriptionForeground);
      margin: 10px 0;
      line-height: 1.6;
    }

    .finding-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
    .tag {
      font-size: 9px;
      font-weight: 400;
      padding: 2px 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.06);
      color: var(--vscode-descriptionForeground);
      text-transform: capitalize;
    }

    /* Remediation Block */
    .remediation-block { margin-bottom: 10px; }
    .block-label {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .block-label.green { color: #4ade80; }
    .block-label.purple { color: #c084fc; }
    .block-text {
      font-size: 11px;
      font-weight: 300;
      color: var(--vscode-descriptionForeground);
      line-height: 1.6;
    }

    /* AI Prompt Block */
    .ai-block {
      border: 1px solid rgba(168,85,247,0.15);
      background: rgba(168,85,247,0.04);
      padding: 10px;
      margin-top: 2px;
    }
    .code-block {
      font-family: var(--vscode-editor-font-family, 'SF Mono', monospace);
      font-size: 10px;
      font-weight: 300;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.06);
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
      overflow-y: auto;
      margin: 6px 0 8px;
      line-height: 1.5;
    }
    .prompt-actions { display: flex; gap: 6px; }

    /* Empty state */
    .empty-findings { padding: 24px; text-align: center; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  `;
}

/* ── Script ──────────────────────────────────────────────────── */

function getScript(): string {
  return `
    const vscode = acquireVsCodeApi();

    // Event delegation — CSP compliant (no inline handlers)
    document.addEventListener('click', function(e) {
      const el = e.target.closest('[data-action]');
      if (!el) return;

      const action = el.getAttribute('data-action');

      switch (action) {
        case 'scan':
          vscode.postMessage({ command: 'scan' });
          break;

        case 'toggle': {
          const index = el.getAttribute('data-index');
          const body = document.getElementById('finding-body-' + index);
          const chevron = document.getElementById('chevron-' + index);
          if (body && chevron) {
            body.classList.toggle('open');
            chevron.classList.toggle('open');
          }
          break;
        }

        case 'openFile': {
          e.stopPropagation();
          const file = el.getAttribute('data-file');
          const line = parseInt(el.getAttribute('data-line') || '0', 10);
          if (file) {
            vscode.postMessage({ command: 'openFile', file: file, line: line });
          }
          break;
        }

        case 'copy': {
          const prompt = el.getAttribute('data-prompt');
          if (prompt) {
            vscode.postMessage({ command: 'copyPrompt', text: prompt });
          }
          break;
        }

        case 'fix': {
          const prompt = el.getAttribute('data-prompt');
          if (prompt) {
            vscode.postMessage({ command: 'fixWithAI', prompt: prompt });
          }
          break;
        }
      }
    });
  `;
}
