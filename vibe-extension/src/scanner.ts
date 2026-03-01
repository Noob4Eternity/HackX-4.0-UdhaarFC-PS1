/**
 * Scanner bridge — spawns vibe-check CLI as child process and parses JSON output.
 * This connects the VS Code extension to the Python vibe_check engine.
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import { ScanResult } from './types';

export class Scanner {
  private pythonPath: string;
  private mode: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('vibecheck');
    this.pythonPath = config.get<string>('pythonPath', 'python3');
    this.mode = config.get<string>('scanMode', 'full');
  }

  /**
   * Get the workspace folder path (the repo currently open in VS Code).
   */
  getWorkspacePath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    return folders[0].uri.fsPath;
  }

  /**
   * Get the repo name from the workspace folder.
   */
  getRepoName(): string {
    const wsPath = this.getWorkspacePath();
    if (!wsPath) { return 'No workspace open'; }
    return path.basename(wsPath);
  }

  /**
   * Run the vibe-check scan via CLI and return parsed ScanResult.
   * Executes: python3 -m vibe_check.cli scan <path> --mode <mode> --format json
   */
  async runScan(
    repoPath: string,
    onProgress?: (msg: string) => void
  ): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      // Refresh config each scan
      const config = vscode.workspace.getConfiguration('vibecheck');
      this.pythonPath = config.get<string>('pythonPath', 'python3');
      this.mode = config.get<string>('scanMode', 'full');

      // Find the project root (where vibe_check package lives)
      // The extension is at hackx4.0/vibe-extension/, CLI is at hackx4.0/vibe_check/
      const extensionPath = vscode.extensions.getExtension('vibecheck.vibecheck-security')?.extensionPath;

      // Build env with PYTHONPATH pointing to the project root so `vibe_check` is importable
      const projectRoot = extensionPath
        ? path.resolve(extensionPath, '..')
        : path.resolve(__dirname, '..', '..');

      const env = {
        ...process.env,
        PYTHONPATH: projectRoot,
      };

      // Also load .env from backend/ if it exists
      const backendEnv = path.join(projectRoot, 'backend', '.env.local');
      const backendEnvFallback = path.join(projectRoot, 'backend', '.env');

      onProgress?.('Starting vibe-check scan...');

      const args = [
        '-m', 'vibe_check.cli',
        'scan', repoPath,
        '--mode', this.mode,
        '--format', 'json',
      ];

      // Use dotenv-loading approach: spawn Python with env vars
      const child = spawn(this.pythonPath, args, {
        cwd: projectRoot,
        env,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        stderr += msg + '\n';
        // Forward recognizable progress messages
        if (msg && !msg.startsWith('Traceback') && !msg.startsWith('  File')) {
          onProgress?.(msg);
        }
      });

      child.on('close', (code: number | null) => {
        if (code !== 0) {
          reject(new Error(
            `vibe-check exited with code ${code}.\n\n` +
            `Python: ${this.pythonPath}\n` +
            `Args: ${args.join(' ')}\n\n` +
            `stderr:\n${stderr}\n\n` +
            `Ensure vibe-check-cli is installed: pip install vibe-check-cli`
          ));
          return;
        }

        try {
          // The CLI outputs JSON to stdout when --format json is used
          const trimmed = stdout.trim();
          // Find the JSON object in output (skip any non-JSON preamble)
          const jsonStart = trimmed.indexOf('{');
          if (jsonStart === -1) {
            reject(new Error('No JSON output from vibe-check CLI'));
            return;
          }
          let jsonStr = trimmed.substring(jsonStart);
          // Sanitize control characters ONLY inside JSON string values,
          // not the structural whitespace (newlines/tabs between keys).
          // Regex matches JSON string literals: "...", accounting for escaped quotes.
          jsonStr = jsonStr.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
            return match.replace(/[\x00-\x1f\x7f]/g, (ch) => {
              switch (ch) {
                case '\n': return '\\n';
                case '\r': return '\\r';
                case '\t': return '\\t';
                default: return '';
              }
            });
          });
          const result: ScanResult = JSON.parse(jsonStr);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse scan output: ${e}\n\nRaw stdout:\n${stdout}`));
        }
      });

      child.on('error', (err: Error) => {
        reject(new Error(
          `Failed to spawn Python: ${err.message}\n\n` +
          `Ensure "${this.pythonPath}" is available.\n` +
          `You can configure this in Settings → VibeCheck → Python Path.`
        ));
      });
    });
  }
}
