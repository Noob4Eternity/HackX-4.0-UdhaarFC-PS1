/**
 * Scanner bridge — spawns vibe-check CLI as child process and parses JSON output.
 * This connects the VS Code extension to the Python vibe_check engine.
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ScanResult } from './types';

// Output channel for debugging
const outputChannel = vscode.window.createOutputChannel('VibeCheck');

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
   * Resolve the project root where vibe_check/ package lives.
   * Priority:
   *   1. Workspace root (if it contains vibe_check/)
   *   2. Extension path parent (dev mode — extension lives in project/vibe-extension/)
   *   3. __dirname walk-up
   */
  private resolveProjectRoot(): string {
    // 1. Best case: workspace contains vibe_check/
    const wsRoot = this.getWorkspacePath();
    if (wsRoot && fs.existsSync(path.join(wsRoot, 'vibe_check'))) {
      outputChannel.appendLine(`[resolveProjectRoot] Using workspace root: ${wsRoot}`);
      return wsRoot;
    }

    // 2. Extension is in project/vibe-extension/ (dev mode)
    const extensionPath = vscode.extensions.getExtension('vibecheck.vibecheck-security')?.extensionPath;
    if (extensionPath) {
      const parent = path.resolve(extensionPath, '..');
      if (fs.existsSync(path.join(parent, 'vibe_check'))) {
        outputChannel.appendLine(`[resolveProjectRoot] Using extension parent: ${parent}`);
        return parent;
      }
    }

    // 3. __dirname walk-up (out/ -> vibe-extension/ -> project-root/)
    const fromDirname = path.resolve(__dirname, '..', '..');
    if (fs.existsSync(path.join(fromDirname, 'vibe_check'))) {
      outputChannel.appendLine(`[resolveProjectRoot] Using __dirname walk-up: ${fromDirname}`);
      return fromDirname;
    }

    // Fallback to workspace root even without vibe_check/
    const fallback = wsRoot || fromDirname;
    outputChannel.appendLine(`[resolveProjectRoot] FALLBACK (no vibe_check/ found): ${fallback}`);
    return fallback;
  }

  /**
   * Run the vibe-check scan via CLI and return parsed ScanResult.
   * Executes: python -m vibe_check.cli scan <path> --mode <mode> --format json
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

      const projectRoot = this.resolveProjectRoot();

      // Derive the conda env's bin/ directory from the configured Python path
      // e.g. /home/ved/miniconda3/envs/test/bin/python → /home/ved/miniconda3/envs/test/bin
      const pythonBinDir = path.dirname(this.pythonPath);

      const env = {
        ...process.env,
        PYTHONPATH: projectRoot,
        // Prepend conda bin to PATH so CLI tools (detect-secrets, semgrep, bandit) are found
        PATH: `${pythonBinDir}${path.delimiter}${process.env.PATH || ''}`,
      };

      const args = [
        '-m', 'vibe_check.cli',
        'scan', repoPath,
        '--mode', this.mode,
        '--format', 'json',
      ];

      outputChannel.appendLine(`\n${'='.repeat(60)}`);
      outputChannel.appendLine(`[scan] Python: ${this.pythonPath}`);
      outputChannel.appendLine(`[scan] Args: ${args.join(' ')}`);
      outputChannel.appendLine(`[scan] CWD: ${projectRoot}`);
      outputChannel.appendLine(`[scan] PYTHONPATH: ${projectRoot}`);
      outputChannel.appendLine(`[scan] Scan target: ${repoPath}`);
      outputChannel.appendLine(`${'='.repeat(60)}`);
      outputChannel.show(true);

      onProgress?.('Starting vibe-check scan...');

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
        outputChannel.appendLine(`[stderr] ${msg}`);
        // Forward recognizable progress messages
        if (msg && !msg.startsWith('Traceback') && !msg.startsWith('  File')) {
          onProgress?.(msg);
        }
      });

      child.on('close', (code: number | null) => {
        outputChannel.appendLine(`[scan] Process exited with code ${code}`);

        if (code !== 0) {
          const errorMsg = `vibe-check exited with code ${code}.\n\n` +
            `Python: ${this.pythonPath}\n` +
            `Args: ${args.join(' ')}\n\n` +
            `stderr:\n${stderr}\n\n` +
            `Ensure vibe-check-cli is installed: pip install vibe-check-cli`;
          outputChannel.appendLine(`[scan] ERROR: ${errorMsg}`);
          reject(new Error(errorMsg));
          return;
        }

        try {
          // The CLI outputs JSON to stdout when --format json is used
          const trimmed = stdout.trim();

          outputChannel.appendLine(`[scan] stdout length: ${trimmed.length} chars`);

          // Find the JSON object in output (skip any non-JSON preamble)
          const jsonStart = trimmed.indexOf('{');
          if (jsonStart === -1) {
            outputChannel.appendLine(`[scan] ERROR: No JSON in stdout`);
            outputChannel.appendLine(`[scan] Raw stdout: ${trimmed.substring(0, 500)}`);
            reject(new Error('No JSON output from vibe-check CLI'));
            return;
          }

          if (jsonStart > 0) {
            outputChannel.appendLine(`[scan] Skipped ${jsonStart} chars of non-JSON preamble`);
          }

          let jsonStr = trimmed.substring(jsonStart);
          // Sanitize control characters ONLY inside JSON string values
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

          outputChannel.appendLine(`[scan] ✅ Parsed result:`);
          outputChannel.appendLine(`[scan]   Score: ${result.score}`);
          outputChannel.appendLine(`[scan]   Grade: ${result.grade}`);
          outputChannel.appendLine(`[scan]   Verdict: ${result.verdict}`);
          outputChannel.appendLine(`[scan]   Findings: ${result.findings_count}`);
          outputChannel.appendLine(`[scan]   Files scanned: ${result.files_scanned}`);

          resolve(result);
        } catch (e) {
          outputChannel.appendLine(`[scan] ERROR: Parse failed: ${e}`);
          outputChannel.appendLine(`[scan] Raw stdout (first 1000 chars): ${stdout.substring(0, 1000)}`);
          reject(new Error(`Failed to parse scan output: ${e}\n\nRaw stdout:\n${stdout}`));
        }
      });

      child.on('error', (err: Error) => {
        outputChannel.appendLine(`[scan] SPAWN ERROR: ${err.message}`);
        reject(new Error(
          `Failed to spawn Python: ${err.message}\n\n` +
          `Ensure "${this.pythonPath}" is available.\n` +
          `You can configure this in Settings → VibeCheck → Python Path.`
        ));
      });
    });
  }
}
