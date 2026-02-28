import type { Report, ReportSummary } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startAudit(options: {
  repoUrl?: string;
  zipFile?: File;
  githubToken?: string;
  repoName?: string;
}): Promise<{ scan_id: string; stream_url: string }> {
  const formData = new FormData();

  if (options.repoUrl) {
    formData.append("repo_url", options.repoUrl);
  } else if (options.zipFile) {
    formData.append("zip_file", options.zipFile);
  } else if (options.githubToken && options.repoName) {
    formData.append("github_token", options.githubToken);
    formData.append("repo_name", options.repoName);
  }

  const res = await fetch(`${API_URL}/audit`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to start scan");
  }

  return res.json();
}

export function createProgressStream(scanId: string): EventSource {
  return new EventSource(`${API_URL}/audit/${scanId}/stream`);
}

export async function getReport(scanId: string): Promise<Report> {
  // Retry up to 3 times with backoff — handles server restarts (uvicorn --reload)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_URL}/report/${scanId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Report not found");
        throw new Error("Failed to fetch report");
      }
      return await res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message === "Report not found") throw lastError;
      // Wait before retrying (1s, 2s)
      if (attempt < 2) await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  throw lastError!;
}

export async function getReports(limit = 20): Promise<ReportSummary[]> {
  const res = await fetch(`${API_URL}/reports?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}
