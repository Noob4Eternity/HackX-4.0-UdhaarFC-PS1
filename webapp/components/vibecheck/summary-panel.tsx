'use client';

import { motion } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SummaryPanelProps {
  summary: string;
}

export function SummaryPanel({ summary }: SummaryPanelProps) {
  // Parse markdown-like content
  const renderSummary = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="text-base font-semibold text-foreground mt-4 mb-2">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="text-sm text-muted-foreground ml-4 mb-1">
            {formatBold(line.replace('- ', ''))}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={index} className="text-sm text-muted-foreground ml-4 mb-1 list-decimal">
            {formatBold(line.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      // Regular paragraphs
      return (
        <p key={index} className="text-sm text-muted-foreground mb-2">
          {formatBold(line)}
        </p>
      );
    });
  };

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card rounded-2xl overflow-hidden glow-purple"
    >
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="p-2 rounded-lg bg-muted/50">
          <Bot className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            AI Security Summary
            <Sparkles className="h-4 w-4 text-purple-400" />
          </h3>
          <p className="text-xs text-muted-foreground">Powered by VibeCheck AI Engine</p>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="p-6">
          {renderSummary(summary)}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
