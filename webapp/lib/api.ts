const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function startScan(options: {
  repoUrl?: string;
  zipFile?: File;
  githubToken?: string;
  repoName?: string;
}): Promise<{ scan_id: string; stream_url: string }> {
  const formData = new FormData();

  if (options.repoUrl) {
    formData.append('repo_url', options.repoUrl);
  } else if (options.zipFile) {
    formData.append('zip_file', options.zipFile);
  } else if (options.githubToken && options.repoName) {
    // Private repo via OAuth token
    formData.append('github_token', options.githubToken);
    formData.append('repo_name', options.repoName);
  }

  const res = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Scan failed: ${res.statusText}`);
  }

  return res.json();
}

export async function getReport(id: string) {
  const res = await fetch(`${API_BASE}/report/${id}`);
  if (!res.ok) throw new Error('Report not found');
  return res.json();
}

export async function getReports() {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}
