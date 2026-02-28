'use client';

import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: 'text-lg' },
    md: { icon: 28, text: 'text-xl' },
    lg: { icon: 40, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-lg opacity-50" />
        <div className="relative bg-gradient-to-r from-cyan-500 to-purple-500 p-2 rounded-lg">
          <Shield size={icon} className="text-background" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${text} bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent`}>
            VibeCheck
          </span>
          <span className="text-xs text-muted-foreground -mt-1">Security</span>
        </div>
      )}
    </motion.div>
  );
}
