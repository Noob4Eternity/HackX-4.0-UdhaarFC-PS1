'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  FileCode,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/vibecheck/navbar';
import { SeverityBadge } from '@/components/vibecheck/severity-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getReport } from '@/lib/api';
import type { Report, Finding } from '@/lib/types';

function VulnerabilityRow({ finding, isExpanded, onToggle }: {
  finding: Finding;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const handleFixWithAI = () => {
    if (finding.ai_prompt) {
      const encodedPrompt = encodeURIComponent(finding.ai_prompt);
      window.open(`https://chat.openai.com/?prompt=${encodedPrompt}`, '_blank');
    }
  };

  return (
    <>
      <TableRow
        className={cn(
          'border-border/50 hover:bg-muted/20 transition-colors cursor-pointer',
          isExpanded && 'bg-muted/10'
        )}
        onClick={onToggle}
      >
        <TableCell className="font-mono text-sm">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]">{finding.file_path || '—'}</span>
          </div>
        </TableCell>
        <TableCell className="text-center font-mono text-muted-foreground">
          {finding.line_number || '—'}
        </TableCell>
        <TableCell className="text-center">
          <SeverityBadge severity={finding.severity as 'critical' | 'high' | 'medium' | 'low'} size="sm" />
        </TableCell>
        <TableCell className="font-medium">{finding.title}</TableCell>
        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
          {finding.description}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {finding.ai_prompt && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixWithAI}
              className="gap-2 text-primary border-primary hover:bg-primary/10 whitespace-nowrap rounded-none"
            >
              Fix with AI
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" className="p-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TableCell>
      </TableRow>

      <AnimatePresence>
        {isExpanded && (
          <TableRow className="border-border/50">
            <TableCell colSpan={7} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-muted/5 border-t border-border/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Description */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{finding.description}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Recommended Fix</h4>
                        <p className="text-sm text-muted-foreground">{finding.remediation}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground capitalize">
                          Category: {finding.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground">
                          ID: {finding.id}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground">
                          Tool: {finding.tool}
                        </span>
                      </div>
                    </div>

                    {/* AI Prompt */}
                    {finding.ai_prompt && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-primary" />
                          AI Fix Prompt
                        </h4>
                        <div className="bg-background rounded-lg border border-border/50 overflow-hidden">
                          <pre className="p-4 overflow-x-auto">
                            <code className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                              {finding.ai_prompt}
                            </code>
                          </pre>
                        </div>
                        <Button
                          onClick={handleFixWithAI}
                          className="mt-3 gap-2 rounded-none"
                        >
                          Get AI-Powered Fix
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

export default function VulnerabilitiesPage() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get('id');

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      if (!scanId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getReport(scanId);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [scanId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar title="Vulnerabilities" />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  if (!scanId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar title="Vulnerabilities" />
        <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="card-clean rounded-none p-12 text-center border border-border">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No scan selected</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Go to the dashboard and select a scan to view its vulnerabilities
            </p>
            <Button asChild className="rounded-none">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar title="Vulnerabilities" />
        <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
          <div className="card-clean rounded-none p-12 text-center border border-red-500/30">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error</h3>
            <p className="text-sm text-muted-foreground">{error || 'Report not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter out llm_review findings (executive summary etc.)
  const allFindings = report.findings.filter(f => f.category !== 'llm_review');

  // Get unique categories for filter dropdown
  const categories = [...new Set(allFindings.map(f => f.category))];

  const filteredFindings = allFindings.filter((f) => {
    const matchesSearch =
      (f.file_path || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const severityCounts = {
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title="Vulnerabilities" />

      <div className="flex-1 p-6 lg:p-8 space-y-6">
        {/* Header Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4"
        >
          {[
            { label: 'Critical', count: severityCounts.critical, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
            { label: 'High', count: severityCounts.high, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
            { label: 'Medium', count: severityCounts.medium, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
            { label: 'Low', count: severityCounts.low, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('px-4 py-3 rounded-none border', stat.color)}
            >
              <span className="text-2xl font-bold">{stat.count}</span>
              <span className="ml-2 text-sm opacity-80">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-clean rounded-none p-4 flex flex-col lg:flex-row gap-4 border border-border"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vulnerabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/50"
            />
          </div>

          <div className="flex gap-3">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-52 bg-background/50 border-border/50">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Vulnerabilities Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-clean rounded-none overflow-hidden border border-primary"
        >
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  All Vulnerabilities
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({filteredFindings.length} found)
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">File</TableHead>
                  <TableHead className="text-muted-foreground text-center">Line</TableHead>
                  <TableHead className="text-muted-foreground text-center">Severity</TableHead>
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFindings.map((finding) => (
                  <VulnerabilityRow
                    key={finding.id}
                    finding={finding}
                    isExpanded={expandedId === finding.id}
                    onToggle={() => setExpandedId(
                      expandedId === finding.id ? null : finding.id
                    )}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredFindings.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No vulnerabilities found</h3>
              <p className="text-sm text-muted-foreground">
                {allFindings.length === 0
                  ? 'This scan found no vulnerabilities — great job!'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
