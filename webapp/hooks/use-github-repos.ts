'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RepoItem {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

interface UseGitHubReposReturn {
  repos: RepoItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch GitHub repositories for the authenticated user.
 * Uses SWR-like deduplication pattern: caches result in state,
 * refetches on mount or explicit refetch() call.
 */
export function useGitHubRepos(): UseGitHubReposReturn {
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/github/repos');

      if (!res.ok) {
        if (res.status === 401) {
          setError('Not authenticated');
          return;
        }
        throw new Error(`Failed to fetch: ${res.status}`);
      }

      const data: RepoItem[] = await res.json();
      setRepos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return { repos, isLoading, error, refetch: fetchRepos };
}
