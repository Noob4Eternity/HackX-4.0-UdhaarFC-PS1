# VS Code Extension — Logic Review Checklist

Use this to verify the extension is correctly invoking `vibe-check` and displaying findings. Most "too many errors" issues come from one of these categories.

---

## 1. CLI Version Check

**Is the extension using v0.2.1?**

The earlier versions (≤0.1.6) had massive false positive issues — lock file floods, keyword detector bugs, HTTP URL spam, etc. All of these are fixed in v0.2.1.

```bash
vibe-check --version  # Must show 0.2.1+
pip show vibe-check-cli
```

> [!CAUTION]
> If the extension bundles its own version or pins an older version in [package.json](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/tests/fixtures/vulnerable-nextjs-app/package.json) postinstall, it will use stale code regardless of what's on PyPI.

---

## 2. How Is the Extension Invoking the CLI?

**Check the scan command being constructed.** Look for the command-building logic — it should match:

```bash
# For inline diagnostics (real-time in editor):
vibe-check scan . --mode fast --severity critical,high --format json

# For full panel report:
vibe-check scan . --format json
```

### Common bugs:
| Issue | Symptom | Fix |
|-------|---------|-----|
| Missing `--mode fast` | Slow scans, LLM errors without API key | Add `--mode fast` for inline diagnostics |
| Missing `--format json` | Extension tries to parse Rich terminal output | Always use `--format json` for programmatic consumption |
| Hardcoded `--severity` without filter | Shows LOW/INFO findings as errors | Filter to `critical,high` for diagnostics, show `medium` as warnings |
| Running scan on every file save | Excessive CPU, repeated findings | Debounce to max once per 30s, or trigger on file save with cooldown |

---

## 3. JSON Output Parsing

**Is the extension correctly parsing `vibe-check scan --format json` output?**

The JSON output structure is:
```json
{
  "score": 85.0,
  "grade": "B",
  "verdict": "NEEDS REMEDIATION",
  "findings": [
    {
      "title": "...",
      "severity": "high",
      "category": "secret",
      "file": "relative/path/to/file.py",
      "line": 42,
      "description": "...",
      "remediation": "...",
      "ai_prompt": "..."
    }
  ],
  "category_scores": {"secrets": 100, "sast": 88, ...},
  "metadata": {"files_scanned": 46, "scan_time": 14.1, ...}
}
```

### Common bugs:
| Issue | Symptom | Fix |
|-------|---------|-----|
| Parsing `stderr` instead of `stdout` | Semgrep warnings show as findings | Only parse `stdout`, ignore `stderr` |
| Not handling missing [file](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/tests/fixtures/vulnerable-nextjs-app/components/UserProfile.jsx#3-12) field | Crash on compliance findings (no file) | Check for `null`/missing [file](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/tests/fixtures/vulnerable-nextjs-app/components/UserProfile.jsx#3-12) before creating diagnostic |
| Not handling missing `line` field | Diagnostic at line 0 | Default to line 1 if `line` is null |
| Parsing markdown output as JSON | Parse error | Ensure `--format json` is passed |

---

## 4. Severity → VS Code Diagnostic Mapping

**Are severities mapped correctly to VS Code diagnostic levels?**

Correct mapping:
```typescript
function mapSeverity(sev: string): vscode.DiagnosticSeverity {
  switch (sev) {
    case 'critical': return vscode.DiagnosticSeverity.Error;
    case 'high':     return vscode.DiagnosticSeverity.Error;
    case 'medium':   return vscode.DiagnosticSeverity.Warning;
    case 'low':      return vscode.DiagnosticSeverity.Information;
    case 'info':     return vscode.DiagnosticSeverity.Hint;
    default:         return vscode.DiagnosticSeverity.Warning;
  }
}
```

### Common bugs:
| Issue | Symptom | Fix |
|-------|---------|-----|
| All findings shown as `Error` | Red squiggles everywhere | Map `medium` → Warning, `low` → Info, `info` → Hint |
| Not filtering by severity | 50+ diagnostics flood the panel | Only show `critical`+`high` as errors, `medium` as warnings |
| INFO remediation findings showing | LLM remediation prompts appear as errors | Skip findings where `severity === 'info'` from diagnostics |

---

## 5. File Path Resolution

**Are finding file paths resolved correctly to workspace paths?**

`vibe-check` returns relative paths (e.g. [vibe_check/analyzers/secrets.py](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/vibe_check/analyzers/secrets.py)). The extension must resolve these against the workspace root.

```typescript
// CORRECT
const fullPath = path.join(workspaceRoot, finding.file);
const uri = vscode.Uri.file(fullPath);

// WRONG — using the raw relative path
const uri = vscode.Uri.file(finding.file); // Won't match open editors
```

### Common bugs:
| Issue | Symptom | Fix |
|-------|---------|-----|
| Using raw relative paths | Diagnostics don't appear on open files | Resolve against `vscode.workspace.workspaceFolders[0].uri.fsPath` |
| Platform path separators | Works on Mac, fails on Windows | Use `path.join()` or `vscode.Uri.joinPath()` |
| Findings with `null` file | Crash when creating URI | Skip findings where [file](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/tests/fixtures/vulnerable-nextjs-app/components/UserProfile.jsx#3-12) is null (compliance/LLM findings without specific files) |

---

## 6. Diagnostic Collection Management

**Is the extension clearing old diagnostics before adding new ones?**

```typescript
// CORRECT — clear before setting new diagnostics
diagnosticCollection.clear();
for (const finding of findings) {
  // ... add diagnostics
}

// WRONG — appending without clearing
// This causes duplicates to accumulate on every scan
```

### Common bugs:
| Issue | Symptom | Fix |
|-------|---------|-----|
| Not clearing previous diagnostics | Findings multiply on each scan | Call `diagnosticCollection.clear()` before each scan |
| One diagnostic collection per scan | Old collections persist | Use a single `DiagnosticCollection` created in `activate()` |
| Not disposing on deactivate | Memory leak | Dispose the collection in the `deactivate()` function |

---

## 7. Scan Scope

**Is the extension scanning the right directory?**

```typescript
// CORRECT — scan workspace root
const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

// WRONG — scan the currently open file's directory
const cwd = path.dirname(activeEditor.document.uri.fsPath);
```

Also check: is it running on `node_modules`? The CLI should handle this via [.gitignore](file:///home/ved/Desktop/HackX-4.0-UdhaarFC-PS1/.gitignore), but if the workspace isn't a git repo, everything gets scanned.

---

## 8. Quick Debug Checklist

Run these in the extension's terminal output to diagnose:

```bash
# 1. Is the right version installed?
vibe-check --version

# 2. Does JSON output parse correctly?
vibe-check scan . --mode fast --format json 2>/dev/null | python3 -m json.tool | head -20

# 3. How many findings at each severity?
vibe-check scan . --mode fast --format json 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
from collections import Counter
c = Counter(f['severity'] for f in d.get('findings', []))
print(dict(c))
"

# 4. Are test fixtures being flagged?
vibe-check scan . --mode fast --format json 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
for f in d.get('findings', []):
    if f.get('file') and ('test' in f['file'] or 'fixture' in f['file']):
        print(f'FALSE POSITIVE: {f[\"file\"]}:{f.get(\"line\",\"?\")} — {f[\"title\"]}')
"
```

---

## Summary: Most Likely Causes of "Too Many Errors"

| Rank | Cause | Likelihood |
|------|-------|------------|
| 1 | Old CLI version (pre-0.2.1) | Very High |
| 2 | All severities shown as Error (no severity mapping) | High |
| 3 | INFO/remediation findings not filtered out | High |
| 4 | Parsing stderr (semgrep warnings) as findings | Medium |
| 5 | Not clearing diagnostics between scans (duplicates) | Medium |
| 6 | Scanning wrong directory (not workspace root) | Low |
