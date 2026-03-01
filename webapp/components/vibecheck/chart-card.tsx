'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'card-clean rounded-2xl p-8 border border-border/20',
        className
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="section-label mt-2">{description}</p>
        )}
      </div>
      <div className="relative">
        {children}
      </div>
    </motion.div>
  );
}
