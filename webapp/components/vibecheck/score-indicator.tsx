'use client';

import { motion } from 'framer-motion';
import { getScoreColor } from '@/lib/types';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreIndicator({ score, size = 'md', showLabel = true }: ScoreIndicatorProps) {
  const sizes = {
    sm: { width: 100, stroke: 8, fontSize: 'text-xl' },
    md: { width: 160, stroke: 12, fontSize: 'text-4xl' },
    lg: { width: 220, stroke: 16, fontSize: 'text-6xl' },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width, height: width }}>
        {/* Background glow */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ backgroundColor: color }}
        />
        
        {/* Background circle */}
        <svg width={width} height={width} className="transform -rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`font-bold ${fontSize}`}
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            / 100
          </span>
        </div>
      </div>
      
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <p className="text-sm font-medium text-muted-foreground">VibeCheck Score</p>
        </motion.div>
      )}
    </div>
  );
}
