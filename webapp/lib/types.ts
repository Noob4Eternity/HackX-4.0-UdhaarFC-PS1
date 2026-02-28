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
}

export interface ReportSummary {
  id: string;
  repo_name: string;
  verdict: "GO" | "NO-GO";
  total_score: number;
  finding_count: number;
  scanned_at: string;
}

export type Verdict = "GO" | "NO-GO";

export function getStatusFromScore(score: number): "go" | "no-go" {
  return score >= 70 ? "go" : "no-go";
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    info: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  return colors[severity] || colors.low;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}
