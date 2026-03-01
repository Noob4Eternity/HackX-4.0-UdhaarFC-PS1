'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn(
        'bg-muted/50 rounded-sm animate-pulse',
        className
      )}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/30">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-7 w-56 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Score + Verdict card */}
      <div className="card-clean rounded-none border border-border p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          <Skeleton className="h-40 w-40 rounded-full shrink-0" />
          <div className="hidden lg:block w-px self-stretch bg-border/40" />
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="w-full h-px bg-border/30" />
            <div className="flex gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-5">
                  <div className="text-center">
                    <Skeleton className="h-8 w-8 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  {i < 4 && <div className="h-8 w-px bg-border/30" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-clean rounded-none border border-border p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="card-clean rounded-none border border-border p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-28 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-clean rounded-none border border-border">
        <div className="px-5 py-4 border-b border-border/30">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecentScansSkeleton() {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <Skeleton className="h-12 w-56 mx-auto mb-4" />
        <Skeleton className="h-5 w-72 mx-auto" />
      </div>
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-clean rounded-none p-6 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <Skeleton className="h-9 w-9" />
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-10 w-14" />
                <Skeleton className="h-8 w-16 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScanSkeleton() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
