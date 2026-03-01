/**
 * Sidebar Webview Provider — renders the VibeCheck panel
 * with scan button, donut chart, and findings list.
 */

import * as vscode from 'vscode';
import { Scanner } from './scanner';
import { ScanResult, ScanState } from './types';
import { getWebviewHTML } from './webview';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibecheck-sidebar';

  private _view?: vscode.WebviewView;
  private _scanner: Scanner;
  private _state: ScanState;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._scanner = new Scanner();
    this._state = {
      status: 'idle',
      repoName: this._scanner.getRepoName(),
      repoPath: this._scanner.getWorkspacePath() || '',
      result: null,
      error: null,
    };
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = getWebviewHTML(
      webviewView.webview,
      this._extensionUri,
      this._state
    );

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'scan':
          await this.runScan();
          break;
        case 'copyPrompt':
          await vscode.env.clipboard.writeText(message.text);
          vscode.window.showInformationMessage('Remediation prompt copied to clipboard');
          break;
        case 'openFile':
          if (message.file) {
            const wsPath = this._scanner.getWorkspacePath();
            if (wsPath) {
              const fileUri = vscode.Uri.file(`${wsPath}/${message.file}`);
              const doc = await vscode.workspace.openTextDocument(fileUri);
              const editor = await vscode.window.showTextDocument(doc);
              if (message.line) {
                const line = Math.max(0, message.line - 1);
                const range = new vscode.Range(line, 0, line, 0);
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
              }
            }
          }
          break;
        case 'fixWithAI':
          const encoded = encodeURIComponent(message.prompt);
          vscode.env.openExternal(
            vscode.Uri.parse(`https://chat.openai.com/?prompt=${encoded}`)
          );
          break;
      }
    });
  }

  /**
   * Run scan triggered from sidebar or command palette.
   */
  public async runScan(): Promise<void> {
    const repoPath = this._scanner.getWorkspacePath();
    if (!repoPath) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    this._state = {
      status: 'scanning',
      repoName: this._scanner.getRepoName(),
      repoPath,
      result: null,
      error: null,
    };
    this._updateWebview();

    try {
      const result = await this._scanner.runScan(repoPath, (msg) => {
        // Could send incremental progress updates to webview here
      });

      this._state = {
        status: 'complete',
        repoName: this._scanner.getRepoName(),
        repoPath,
        result,
        error: null,
      };

      // Show notification based on score
      const config = vscode.workspace.getConfiguration('vibecheck');
      const threshold = config.get<number>('threshold', 60);

      if (result.score >= 80) {
        vscode.window.showInformationMessage(
          `✅ VibeCheck: ${result.score.toFixed(0)}/100 (${result.grade}) — ${result.verdict}`
        );
      } else if (result.score >= threshold) {
        vscode.window.showWarningMessage(
          `⚠️ VibeCheck: ${result.score.toFixed(0)}/100 (${result.grade}) — ${result.verdict}`
        );
      } else {
        vscode.window.showErrorMessage(
          `🚨 VibeCheck: ${result.score.toFixed(0)}/100 (${result.grade}) — ${result.verdict}`
        );
      }

      // Add diagnostics for findings
      this._publishDiagnostics(result);

    } catch (err: any) {
      this._state = {
        status: 'error',
        repoName: this._scanner.getRepoName(),
        repoPath,
        result: null,
        error: err.message || 'Scan failed',
      };
      vscode.window.showErrorMessage(`VibeCheck scan failed: ${err.message}`);
    }

    this._updateWebview();
  }

  /**
   * Publish findings as VS Code diagnostics (squiggly underlines).
   */
  private _publishDiagnostics(result: ScanResult): void {
    const collection = vscode.languages.createDiagnosticCollection('vibecheck');
    collection.clear();

    const diagMap = new Map<string, vscode.Diagnostic[]>();
    const wsPath = this._scanner.getWorkspacePath() || '';

    for (const finding of result.findings) {
      if (!finding.file) { continue; }

      const filePath = `${wsPath}/${finding.file}`;
      const line = Math.max(0, (finding.line || 1) - 1);

      const severity = finding.severity === 'critical' || finding.severity === 'high'
        ? vscode.DiagnosticSeverity.Error
        : finding.severity === 'medium'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information;

      const range = new vscode.Range(line, 0, line, 1000);
      const diag = new vscode.Diagnostic(range, `${finding.title}: ${finding.description}`, severity);
      diag.source = 'VibeCheck';
      diag.code = finding.id;

      const existing = diagMap.get(filePath) || [];
      existing.push(diag);
      diagMap.set(filePath, existing);
    }

    for (const [filePath, diags] of diagMap) {
      collection.set(vscode.Uri.file(filePath), diags);
    }
  }

  /**
   * Called from the command palette to trigger a scan remotely.
   */
  public triggerScan(): void {
    this.runScan();
  }

  /**
   * Return the last scan result (for openReport command).
   */
  public getLastResult(): ScanResult | null {
    return this._state.result;
  }

  private _updateWebview(): void {
    if (this._view) {
      this._view.webview.html = getWebviewHTML(
        this._view.webview,
        this._extensionUri,
        this._state
      );
    }
  }
}
