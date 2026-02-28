'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  ExternalLink, 
  CheckCircle2, 
  FileCode,
  Sparkles,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { Navbar } from '@/components/vibecheck/navbar';
import { SeverityBadge } from '@/components/vibecheck/severity-badge';
import { Button } from '@/components/ui/button';
import { remediationSuggestions } from '@/lib/mock-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RemediationCardProps {
  suggestion: typeof remediationSuggestions[0];
  index: number;
  isApplied: boolean;
  onApply: () => void;
}

function RemediationCard({ suggestion, index, isApplied, onApply }: RemediationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleFixWithChatGPT = () => {
    const encodedPrompt = encodeURIComponent(suggestion.fixPrompt);
    window.open(`https://chat.openai.com/?prompt=${encodedPrompt}`, '_blank');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(suggestion.secureCodeExample);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'glass-card rounded-2xl overflow-hidden transition-all duration-300',
        isApplied 
          ? 'border-green-500/30 bg-green-500/5' 
          : 'hover:border-primary/30'
      )}
    >
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isApplied ? 'bg-green-500/10' : 'bg-primary/10'
            )}>
              {isApplied ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <Wrench className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{suggestion.vulnerability}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <FileCode className="h-4 w-4" />
                <span>{suggestion.file}</span>
              </div>
            </div>
          </div>
          <SeverityBadge severity={suggestion.severity} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Explanation</h4>
          <p className="text-sm text-muted-foreground">{suggestion.explanation}</p>
        </div>

        {/* Secure Code Example */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Secure Code Example
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="bg-background rounded-lg border border-border/50 overflow-hidden">
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm font-mono text-green-400 whitespace-pre-wrap">
                {suggestion.secureCodeExample}
              </code>
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleFixWithChatGPT}
            className="flex-1 gap-2 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            Fix with ChatGPT
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onApply}
            disabled={isApplied}
            className={cn(
              'flex-1 gap-2',
              isApplied 
                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                : 'border-primary/30 hover:bg-primary/10'
            )}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Applied
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Apply Fix
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function RemediationPage() {
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const handleApplyFix = (id: string) => {
    setAppliedFixes(prev => new Set([...prev, id]));
    toast.success('Fix applied successfully (mock)');
  };

  const handleApplyAll = async () => {
    setIsApplyingAll(true);
    
    // Simulate applying all fixes one by one
    for (const suggestion of remediationSuggestions) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setAppliedFixes(prev => new Set([...prev, suggestion.id]));
    }
    
    setIsApplyingAll(false);
    toast.success('All fixes applied successfully (mock)');
  };

  const appliedCount = appliedFixes.size;
  const totalCount = remediationSuggestions.length;
  const progress = (appliedCount / totalCount) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title="Remediation Hub" />
      
      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 glow-purple"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Wrench className="h-6 w-6 text-purple-400" />
                Remediation Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                AI-powered fix suggestions for all detected vulnerabilities
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-xl font-bold text-foreground">
                  {appliedCount} / {totalCount} fixed
                </p>
              </div>
              
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              <Button
                onClick={handleApplyAll}
                disabled={isApplyingAll || appliedCount === totalCount}
                className="gap-2 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                {isApplyingAll ? (
                  <motion.div
                    className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Apply All Fixes
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { 
              label: 'Critical Fixes', 
              count: remediationSuggestions.filter(s => s.severity === 'critical').length,
              applied: remediationSuggestions.filter(s => s.severity === 'critical' && appliedFixes.has(s.id)).length,
              color: 'text-red-400 bg-red-500/10 border-red-500/20'
            },
            { 
              label: 'High Fixes', 
              count: remediationSuggestions.filter(s => s.severity === 'high').length,
              applied: remediationSuggestions.filter(s => s.severity === 'high' && appliedFixes.has(s.id)).length,
              color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
            },
            { 
              label: 'Medium Fixes', 
              count: remediationSuggestions.filter(s => s.severity === 'medium').length,
              applied: remediationSuggestions.filter(s => s.severity === 'medium' && appliedFixes.has(s.id)).length,
              color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
            },
            { 
              label: 'Low Fixes', 
              count: remediationSuggestions.filter(s => s.severity === 'low').length,
              applied: remediationSuggestions.filter(s => s.severity === 'low' && appliedFixes.has(s.id)).length,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('px-4 py-4 rounded-xl border', stat.color)}
            >
              <p className="text-sm opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">
                {stat.applied} / {stat.count}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Remediation Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {remediationSuggestions.map((suggestion, index) => (
            <RemediationCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              isApplied={appliedFixes.has(suggestion.id)}
              onApply={() => handleApplyFix(suggestion.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
