'use client';

import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const colors = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full border capitalize',
      colors[severity],
      sizes[size]
    )}>
      {severity}
    </span>
  );
}
