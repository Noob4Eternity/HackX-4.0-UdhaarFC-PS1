export interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  file_path: string | null;
  line_number: number | null;
  description: string;
  remediation: string;
  ai_prompt: string;
  tool: string;
  cwe?: string | null;
  confidence?: number | null;
  compliance_ref?: string | null;
}

export interface Report {
  id: string;
  repo_name: string;
  verdict: "GO" | "NO-GO";
  total_score: number;
  category_scores: Record<string, number>;
  finding_count: number;
  findings: Finding[];
  trigger_source: string;
  scanned_at: string;
  grade?: string | null;
  languages_detected?: string[];
  files_scanned?: number | null;
  scan_time?: number | null;
  tokens_used?: number | null;
}

export interface ReportSummary {
  id: string;
  repo_name: string;
  verdict: "GO" | "NO-GO";
  total_score: number;
  finding_count: number;
  scanned_at: string;
  trigger_source?: string;
}

export type Verdict = "GO" | "NO-GO";

// --- Scan progress types ---

export type PhaseStatus = "pending" | "in_progress" | "complete" | "error";

export interface ScanPhase {
  id: string;
  label: string;
  status: PhaseStatus;
  findings?: number;
}

export interface ProgressEvent {
  message: string;
  phase: string;
  type: "start" | "complete" | "error" | "info";
  timestamp: string;
  findings?: number;
}

export const SCAN_PHASES: { id: string; label: string }[] = [
  { id: "clone", label: "Clone" },
  { id: "secrets", label: "Secrets" },
  { id: "sast", label: "SAST" },
  { id: "dependencies", label: "Dependencies" },
  { id: "compliance", label: "Compliance" },
  { id: "hallucination", label: "Hallucination" },
  { id: "prompt_injection", label: "Prompt Inj." },
  { id: "cost_efficiency", label: "Cost" },
  { id: "nextjs", label: "Next.js" },
  { id: "ai_summary", label: "AI Summary" },
  { id: "saving", label: "Saving" },
];

export function getStatusFromScore(score: number): "go" | "no-go" {
  return score >= 70 ? "go" : "no-go";
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    info: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  return colors[severity] || colors.low;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 70) return "#eab308";
  return "#ef4444";
}

export function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#22c55e";
  if (grade.startsWith("B")) return "#84cc16";
  if (grade.startsWith("C")) return "#eab308";
  if (grade.startsWith("D")) return "#f97316";
  return "#ef4444";
}

export function getFullVerdict(score: number): string {
  if (score >= 80) return "Production Ready";
  if (score >= 60) return "Needs Remediation";
  if (score >= 40) return "Not Production Ready";
  return "Critical — Do Not Deploy";
}
