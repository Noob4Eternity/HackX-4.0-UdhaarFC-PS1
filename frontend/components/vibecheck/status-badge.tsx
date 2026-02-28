'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'go' | 'conditional-go' | 'no-go';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = {
    'go': {
      label: 'GO',
      icon: CheckCircle2,
      colors: 'bg-green-500/10 text-green-400 border-green-500/30',
      glow: 'shadow-green-500/20',
    },
    'conditional-go': {
      label: 'CONDITIONAL GO',
      icon: AlertTriangle,
      colors: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      glow: 'shadow-yellow-500/20',
    },
    'no-go': {
      label: 'NO GO',
      icon: XCircle,
      colors: 'bg-red-500/10 text-red-400 border-red-500/30',
      glow: 'shadow-red-500/20',
    },
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-lg px-6 py-3 gap-3',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  const { label, icon: Icon, colors, glow } = config[status];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={cn(
        'inline-flex items-center font-bold rounded-xl border shadow-lg',
        colors,
        glow,
        sizes[size]
      )}
    >
      <Icon size={iconSizes[size]} />
      <span>{label}</span>
    </motion.div>
  );
}
