'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GitBranch, Lock, Star, RefreshCw, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGitHubRepos, type RepoItem } from '@/hooks/use-github-repos';

const langColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dart: '#00B4AB',
};

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-3 w-full rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RepoCard({ repo, index }: { repo: RepoItem; index: number }) {
  const router = useRouter();
  const langColor = repo.language ? langColors[repo.language] ?? '#888' : null;

  const updatedAt = new Date(repo.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={() => router.push('/dashboard')}
      className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all cursor-pointer group"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch
          size={16}
          className="shrink-0 text-muted-foreground group-hover:text-cyan-400 transition-colors"
        />
        <span className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {repo.name}
        </span>
        {repo.private ? (
          <span className="shrink-0 ml-auto flex items-center gap-1 text-[10px] text-amber-400/70 border border-amber-400/20 rounded-full px-1.5 py-0.5">
            <Lock size={9} />
            Private
          </span>
        ) : (
          <span className="shrink-0 ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60 border border-border/50 rounded-full px-1.5 py-0.5">
            <Globe size={9} />
            Public
          </span>
        )}
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {repo.description}
        </p>
      )}
      {!repo.description && <div className="mb-3" />}

      {/* Footer meta */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
        {langColor && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            {repo.language}
          </span>
        )}
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1">
            <Star size={11} />
            {repo.stargazers_count}
          </span>
        )}
        <span className="ml-auto">Updated {updatedAt}</span>
      </div>
    </motion.div>
  );
}

export function RepoGrid() {
  const { repos, isLoading, error, refetch } = useGitHubRepos();
  const displayRepos = repos.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-12"
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          Your Repositories
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="text-primary"
        >
          <RefreshCw
            size={14}
            className={cn('mr-1.5', isLoading && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {isLoading && <GridSkeleton />}

      {/* Error */}
      {!isLoading && error && (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-red-400/80">
          {error}
        </div>
      )}

      {/* Repo grid */}
      {!isLoading && !error && displayRepos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayRepos.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} index={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && repos.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground/50">
          No repositories found
        </div>
      )}
    </motion.div>
  );
}
