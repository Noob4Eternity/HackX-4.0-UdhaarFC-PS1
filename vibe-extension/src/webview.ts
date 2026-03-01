/**
 * Webview HTML generator — produces the sidebar panel content.
 * Features: donut score chart, severity breakdown, findings with accordion dropdowns.
 * Design follows webapp/.agents rules: dark theme, cyan/purple gradient, glassmorphism.
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

function renderHeader(state: ScanState): string {
  return `
    <div class="header">
      <div class="logo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#06b6d4"/><stop offset="100%" style="stop-color:#a855f7"/></linearGradient></defs>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span class="logo-text">VibeCheck</span>
      </div>
      <div class="repo-name" title="${state.repoPath}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
        ${state.repoName}
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

function renderIdleState(): string {
  return `
    <div class="idle-state">
      <div class="shield-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#grad2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <defs><linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.6"/><stop offset="100%" style="stop-color:#a855f7;stop-opacity:0.6"/></linearGradient></defs>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <p class="idle-text">Scan your repository for security vulnerabilities, secrets, and compliance issues.</p>
      <button class="scan-btn" data-action="scan">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Scan Repository
      </button>
    </div>
  `;
}

function renderScanningState(): string {
  return `
    <div class="scanning-state">
      <div class="spinner"></div>
      <p class="scanning-text">Analyzing repository...</p>
      <p class="scanning-sub">Running 9 security analyzers in parallel</p>
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
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      <p class="error-title">Scan Failed</p>
      <p class="error-text">${escapeHtml(error)}</p>
      <button class="scan-btn" data-action="scan">Retry Scan</button>
    </div>
  `;
}

function renderResultState(result: ScanResult): string {
  const scoreColor = result.score >= 80 ? '#22c55e' : result.score >= 60 ? '#eab308' : '#ef4444';
  const verdictClass = result.score >= 80 ? 'verdict-go' : result.score >= 60 ? 'verdict-warn' : 'verdict-nogo';

  // Count by severity
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of result.findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }

  return `
    <div class="result-state">
      <!-- Donut Chart -->
      <div class="donut-section">
        <div class="donut-container">
          <svg viewBox="0 0 120 120" class="donut-chart">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="${scoreColor}" stroke-width="10"
              stroke-dasharray="${(result.score / 100) * 314.159} ${314.159 - (result.score / 100) * 314.159}"
              stroke-dashoffset="78.54"
              stroke-linecap="round"
              class="donut-progress"/>
          </svg>
          <div class="donut-label">
            <span class="donut-score" style="color:${scoreColor}">${result.score.toFixed(0)}</span>
            <span class="donut-max">/100</span>
          </div>
        </div>
        <div class="grade-badge" style="border-color:${scoreColor}; color:${scoreColor}">
          ${result.grade}
        </div>
      </div>

      <!-- Verdict -->
      <div class="verdict ${verdictClass}">${result.verdict}</div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">${result.findings_count}</span>
          <span class="stat-label">Findings</span>
        </div>
        <div class="stat">
          <span class="stat-value">${result.files_scanned}</span>
          <span class="stat-label">Files</span>
        </div>
        <div class="stat">
          <span class="stat-value">${result.scan_time.toFixed(1)}s</span>
          <span class="stat-label">Time</span>
        </div>
      </div>

      <!-- Severity Breakdown -->
      <div class="section">
        <div class="section-title">Severity Breakdown</div>
        <div class="severity-bars">
          ${renderSeverityBar('Critical', counts.critical, result.findings_count, '#ef4444')}
          ${renderSeverityBar('High', counts.high, result.findings_count, '#f97316')}
          ${renderSeverityBar('Medium', counts.medium, result.findings_count, '#eab308')}
          ${renderSeverityBar('Low', counts.low, result.findings_count, '#3b82f6')}
          ${renderSeverityBar('Info', counts.info, result.findings_count, '#6b7280')}
        </div>
      </div>

      <!-- Category Scores -->
      <div class="section">
        <div class="section-title">Category Scores</div>
        <div class="category-scores">
          ${Object.entries(result.category_scores)
            .sort(([, a], [, b]) => a - b)
            .map(([cat, score]) => renderCategoryScore(cat, score))
            .join('')}
        </div>
      </div>

      <!-- Findings -->
      <div class="section">
        <div class="section-title">Findings (${result.findings_count})</div>
        <div class="findings-list">
          ${result.findings
            .sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity))
            .map((f, i) => renderFinding(f, i))
            .join('')}
        </div>
      </div>

      <!-- Rescan Button -->
      <button class="scan-btn rescan" data-action="scan">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2.5 16A10 10 0 0 1 21.5 8"/><path d="M21.5 8A10 10 0 0 1 2.5 16"/></svg>
        Re-scan
      </button>
    </div>
  `;
}

function renderSeverityBar(label: string, count: number, total: number, color: string): string {
  const pct = total > 0 ? (count / total) * 100 : 0;
  if (count === 0) { return ''; }
  return `
    <div class="sev-bar-row">
      <span class="sev-label">${label}</span>
      <div class="sev-bar-track">
        <div class="sev-bar-fill" style="width:${Math.max(pct, 4)}%; background:${color}"></div>
      </div>
      <span class="sev-count">${count}</span>
    </div>
  `;
}

function renderCategoryScore(cat: string, score: number): string {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  const label = cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `
    <div class="cat-row">
      <span class="cat-label">${label}</span>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${score}%; background:${color}"></div>
      </div>
      <span class="cat-score" style="color:${color}">${score.toFixed(0)}</span>
    </div>
  `;
}

function renderFinding(finding: Finding, index: number): string {
  const sevColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280'
  };
  const color = sevColors[finding.severity] || '#6b7280';
  const loc = finding.file
    ? `${finding.file}${finding.line ? ':' + finding.line : ''}`
    : '—';

  return `
    <div class="finding-card">
      <button class="finding-header" data-action="toggle" data-index="${index}">
        <div class="finding-left">
          <span class="sev-dot" style="background:${color}"></span>
          <div class="finding-info">
            <span class="finding-title">${escapeHtml(finding.title)}</span>
            <span class="finding-loc" data-action="openFile" data-file="${escapeAttr(finding.file || '')}" data-line="${finding.line || 0}">${escapeHtml(loc)}</span>
          </div>
        </div>
        <div class="finding-right">
          <span class="sev-badge" style="background:${color}20; color:${color}">${finding.severity}</span>
          <svg class="chevron" id="chevron-${index}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      <div class="finding-body" id="finding-body-${index}">
        <p class="finding-desc">${escapeHtml(finding.description)}</p>
        <div class="finding-meta">
          <span class="meta-tag">${escapeHtml(finding.tool)}</span>
          <span class="meta-tag">${escapeHtml(finding.category)}</span>
          ${finding.cwe ? `<span class="meta-tag">${escapeHtml(finding.cwe)}</span>` : ''}
        </div>
        <div class="remediation-section">
          <div class="remediation-label">Remediation</div>
          <p class="remediation-text">${escapeHtml(finding.remediation)}</p>
        </div>
        ${finding.ai_prompt ? `
          <div class="prompt-section">
            <div class="prompt-label">AI Fix Prompt</div>
            <pre class="prompt-code">${escapeHtml(finding.ai_prompt)}</pre>
            <div class="prompt-actions">
              <button class="prompt-btn" data-action="copy" data-prompt="${escapeHtml(finding.ai_prompt)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy
              </button>
              <button class="prompt-btn fix-btn" data-action="fix" data-prompt="${escapeHtml(finding.ai_prompt)}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                Fix with ChatGPT
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function severityOrder(sev: string): number {
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return order[sev] ?? 0;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function escapeJs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
      font-size: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.5;
    }

    #root { padding: 12px; }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-text {
      font-size: 14px;
      font-weight: 700;
      background: linear-gradient(135deg, #06b6d4, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .repo-name {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Scan Button */
    .scan-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #a855f7);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
    }
    .scan-btn:hover { opacity: 0.9; }
    .scan-btn:active { transform: scale(0.98); }
    .scan-btn.rescan {
      margin-top: 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      padding: 8px;
    }
    .scan-btn.rescan:hover { background: rgba(255,255,255,0.1); }

    /* Idle */
    .idle-state { text-align: center; padding: 20px 0; }
    .shield-icon { margin-bottom: 16px; opacity: 0.7; }
    .idle-text {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 20px;
      font-size: 12px;
      line-height: 1.6;
    }

    /* Scanning */
    .scanning-state { text-align: center; padding: 30px 0; }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(6,182,212,0.15);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .scanning-text { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    .scanning-sub { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 16px; }
    .progress-steps { text-align: left; padding: 0 20px; }
    .step {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      padding: 3px 0;
      position: relative;
      padding-left: 16px;
    }
    .step::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(6,182,212,0.3);
      animation: pulse 1.5s ease-in-out infinite;
    }
    .step.active::before { background: #06b6d4; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

    /* Error */
    .error-state { text-align: center; padding: 20px 0; }
    .error-title { font-weight: 600; font-size: 14px; margin: 12px 0 4px; color: #ef4444; }
    .error-text {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      margin-bottom: 16px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
    }

    /* Results */
    .result-state {}

    /* Donut */
    .donut-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    .donut-container {
      position: relative;
      width: 100px;
      height: 100px;
    }
    .donut-chart {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .donut-progress {
      transition: stroke-dasharray 1s ease;
    }
    .donut-label {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .donut-score { font-size: 26px; font-weight: 800; }
    .donut-max {
      display: block;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: -4px;
    }
    .grade-badge {
      font-size: 22px;
      font-weight: 800;
      border: 2px solid;
      border-radius: 10px;
      padding: 6px 14px;
      letter-spacing: 1px;
    }

    /* Verdict */
    .verdict {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    .verdict-go { background: rgba(34,197,94,0.12); color: #22c55e; }
    .verdict-warn { background: rgba(234,179,8,0.12); color: #eab308; }
    .verdict-nogo { background: rgba(239,68,68,0.12); color: #ef4444; }

    /* Stats */
    .stats-row {
      display: flex;
      justify-content: space-around;
      margin-bottom: 16px;
      padding: 10px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 16px; font-weight: 700; }
    .stat-label { font-size: 10px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Sections */
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    /* Severity bars */
    .sev-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .sev-label { font-size: 11px; width: 52px; text-align: right; }
    .sev-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
    .sev-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .sev-count { font-size: 11px; width: 20px; font-weight: 600; }

    /* Category scores */
    .cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .cat-label { font-size: 10px; width: 80px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cat-bar-track { flex: 1; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
    .cat-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .cat-score { font-size: 11px; width: 28px; font-weight: 600; text-align: right; }

    /* Findings */
    .findings-list { display: flex; flex-direction: column; gap: 4px; }
    .finding-card {
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px;
      overflow: hidden;
      background: rgba(255,255,255,0.02);
    }
    .finding-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 10px;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    .finding-header:hover { background: rgba(255,255,255,0.03); }
    .finding-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .finding-right { display: flex; align-items: center; gap: 6px; }
    .sev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .finding-info { min-width: 0; }
    .finding-title { display: block; font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .finding-loc { display: block; font-size: 10px; color: var(--vscode-textLink-foreground); cursor: pointer; }
    .finding-loc:hover { text-decoration: underline; }
    .sev-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .chevron { transition: transform 0.2s; flex-shrink: 0; }
    .chevron.open { transform: rotate(180deg); }

    /* Finding Body */
    .finding-body {
      display: none;
      padding: 0 10px 10px;
      border-top: 1px solid rgba(255,255,255,0.04);
    }
    .finding-body.open { display: block; }
    .finding-desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin: 8px 0; line-height: 1.5; }
    .finding-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .meta-tag {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      color: var(--vscode-descriptionForeground);
    }

    /* Remediation */
    .remediation-section { margin-bottom: 8px; }
    .remediation-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: #22c55e; }
    .remediation-text { font-size: 11px; color: var(--vscode-descriptionForeground); line-height: 1.5; }

    /* AI Prompt */
    .prompt-section { }
    .prompt-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: #a855f7; }
    .prompt-code {
      font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size: 10px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 4px;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 6px;
    }
    .prompt-actions { display: flex; gap: 6px; }
    .prompt-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      background: rgba(255,255,255,0.04);
      color: var(--vscode-foreground);
      font-size: 10px;
      cursor: pointer;
    }
    .prompt-btn:hover { background: rgba(255,255,255,0.08); }
    .fix-btn { border-color: rgba(168,85,247,0.3); color: #a855f7; }
    .fix-btn:hover { background: rgba(168,85,247,0.1); }
  `;
}

function getScript(): string {
  return `
    const vscode = acquireVsCodeApi();

    // Use event delegation — no inline onclick needed (CSP blocks them)
    document.addEventListener('click', function(e) {
      const target = e.target;
      // Walk up to find the element with data-action
      const el = target.closest('[data-action]');
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
