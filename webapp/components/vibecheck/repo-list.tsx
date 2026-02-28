'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Lock, Star, RefreshCw, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGitHubRepos, type RepoItem } from '@/hooks/use-github-repos';

// Language color map for the dot indicator
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

function RepoSkeleton() {
  return (
    <div className="px-3 py-2.5 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-3.5 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

function RepoItemRow({
  repo,
  collapsed,
  index,
}: {
  repo: RepoItem;
  collapsed: boolean;
  index: number;
}) {
  const router = useRouter();
  const langColor = repo.language ? langColors[repo.language] ?? '#888' : null;

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => router.push('/dashboard')}
      title={repo.full_name}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left',
        'text-sm text-sidebar-foreground/80',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'transition-all duration-200 group cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50'
      )}
    >
      {/* Icon */}
      <div className="shrink-0 relative">
        <GitBranch
          size={15}
          className="text-muted-foreground group-hover:text-cyan-400 transition-colors"
        />
        {repo.private && (
          <Lock
            size={8}
            className="absolute -top-1 -right-1.5 text-amber-400/70"
          />
        )}
      </div>

      {/* Repo name — hidden when sidebar collapsed */}
      {!collapsed && (
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="truncate font-medium text-[13px] leading-tight">
            {repo.name}
          </span>

          {/* Language dot */}
          {langColor && (
            <span
              className="shrink-0 h-2 w-2 rounded-full"
              style={{ backgroundColor: langColor }}
            />
          )}

          {/* Star count — only show if > 0 */}
          {repo.stargazers_count > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
              <Star size={9} />
              {repo.stargazers_count}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

interface RepoListProps {
  collapsed: boolean;
}

export function RepoList({ collapsed }: RepoListProps) {
  const { repos, isLoading, error, refetch } = useGitHubRepos();

  if (collapsed) {
    // Show just the icon header when collapsed
    return (
      <div className="px-3 py-2 flex justify-center">
        <GitBranch size={16} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Repositories
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={refetch}
          disabled={isLoading}
          className="h-5 w-5 text-muted-foreground/50 hover:text-foreground"
        >
          <RefreshCw
            size={11}
            className={cn(isLoading && 'animate-spin')}
          />
        </Button>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 flex items-center gap-2 text-xs text-red-400/80"
          >
            <AlertCircle size={12} />
            <span className="truncate">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {isLoading && <RepoSkeleton />}

      {/* Repo list with scroll */}
      {!isLoading && !error && repos.length > 0 && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-1 py-1 space-y-0.5">
            {repos.map((repo, i) => (
              <RepoItemRow
                key={repo.id}
                repo={repo}
                collapsed={collapsed}
                index={i}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {!isLoading && !error && repos.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground/50">
          No repositories found
        </div>
      )}
    </div>
  );
}
