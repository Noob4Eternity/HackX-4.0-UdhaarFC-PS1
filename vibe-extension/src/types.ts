/**
 * Type definitions matching vibe_check Python models.
 * Mirrors: vibe_check/models/finding.py + result.py
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category =
  | 'secret'
  | 'hallucinated_dependency'
  | 'hallucinated_import'
  | 'vulnerable_dependency'
  | 'sast'
  | 'compliance_gdpr'
  | 'compliance_soc2'
  | 'prompt_injection'
  | 'code_quality'
  | 'iac_security'
  | 'llm_review'
  | 'vibe_fingerprint'
  | 'framework_specific';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  description: string;
  remediation: string;
  tool: string;
  file: string | null;
  line: number | null;
  ai_prompt: string;
  evidence: string;
  cwe: string | null;
  compliance_ref: string | null;
  confidence: number;
}

export interface ScanResult {
  score: number;
  grade: string;
  verdict: string;
  scan_time: number;
  repo_path: string;
  languages_detected: string[];
  files_scanned: number;
  tokens_used: number;
  category_scores: Record<string, number>;
  findings_count: number;
  findings: Finding[];
}

export interface ScanState {
  status: 'idle' | 'scanning' | 'complete' | 'error';
  repoName: string;
  repoPath: string;
  result: ScanResult | null;
  error: string | null;
}
