'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Github, AlertTriangle, FileText, Clock, ArrowRight, Globe, Upload, Lock } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/vibecheck/navbar';
import { ScoreIndicator } from '@/components/vibecheck/score-indicator';
import { StatusBadge } from '@/components/vibecheck/status-badge';
import { SummaryPanel } from '@/components/vibecheck/summary-panel';
import { SeverityBadge } from '@/components/vibecheck/severity-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getReport, getReports } from '@/lib/api';
import type { Report, ReportSummary, Finding } from '@/lib/types';
import { getScoreColor } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  secret: '#a855f7',
  sast: '#ef4444',
  vulnerable_dependency: '#64748b',
  hallucinated_dependency: '#f97316',
  hallucinated_import: '#f97316',
  compliance_gdpr: '#22c55e',
  compliance_soc2: '#22c55e',
  prompt_injection: '#eab308',
  code_quality: '#94a3b8',
  iac_security: '#f59e0b',
  llm_review: '#8b5cf6',
  vibe_fingerprint: '#ec4899',
  framework_specific: '#14b8a6',
};

function computeSeverityCounts(findings: Finding[]) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return counts;
}

function computeFindingsByCategory(findings: Finding[]) {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    if (f.category === 'llm_review') continue;
    counts[f.category] = (counts[f.category] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a);
}

function getExecutiveSummary(findings: Finding[]): string | null {
  const summaryFinding = findings.find(
    f => f.category === 'llm_review' && f.title === 'Executive Summary'
  );
  return summaryFinding?.description || null;
}

// Aggregate findings by file to find most dangerous files
function getDangerousFiles(findings: Finding[]) {
  const fileMap: Record<string, { count: number; severities: string[] }> = {};
  for (const f of findings) {
    if (!f.file_path) continue;
    if (!fileMap[f.file_path]) fileMap[f.file_path] = { count: 0, severities: [] };
    fileMap[f.file_path].count++;
    fileMap[f.file_path].severities.push(f.severity);
  }

  return Object.entries(fileMap)
    .map(([fileName, data]) => {
      const sevWeights: Record<string, number> = { critical: 40, high: 25, medium: 10, low: 3, info: 1 };
      const riskScore = Math.min(100, data.severities.reduce((acc, s) => acc + (sevWeights[s] || 1), 0));
      const worstSeverity = data.severities.sort(
        (a, b) => (sevWeights[b] || 0) - (sevWeights[a] || 0)
      )[0] as 'critical' | 'high' | 'medium' | 'low';
      return { fileName, riskScore, linesFlagged: data.count, severity: worstSeverity };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);
}

// Recent scans list view
function RecentScansView({ scans }: { scans: ReportSummary[] }) {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-5xl font-extralight text-foreground mb-4">
          Recent Scans
        </h1>
        <p className="section-label">Select a scan to view its full report</p>
      </motion.div>

      {scans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-clean rounded-none p-12 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No scans yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Start your first security scan to see results here
          </p>
          <Button asChild className="rounded-none">
            <Link href="/scan">Start a Scan</Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {scans.map((scan, i) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/dashboard?id=${scan.id}`}>
                <div className="card-clean rounded-none p-6 hover:border-primary/50 transition-all group cursor-pointer border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="p-2 rounded-none bg-muted/30">
                        {scan.trigger_source === 'zip' ? (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        ) : scan.trigger_source === 'oauth' ? (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Github className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-light text-lg text-foreground">{scan.repo_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {scan.trigger_source && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted/40 text-muted-foreground">
                              {scan.trigger_source === 'url' ? 'Public' :
                               scan.trigger_source === 'oauth' ? 'Private' :
                               scan.trigger_source === 'zip' ? 'ZIP Upload' :
                               scan.trigger_source}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(scan.scanned_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <span>{scan.finding_count} findings</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-4xl font-extralight" style={{ color: getScoreColor(scan.total_score) }}>
                          {Math.round(scan.total_score)}
                        </div>
                        <div className="text-xs text-muted-foreground tracking-wider">/ 100</div>
                      </div>
                      <StatusBadge status={scan.verdict === 'GO' ? 'go' : 'no-go'} size="sm" />
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Full report view
function ReportView({ report }: { report: Report }) {
  const severityCounts = computeSeverityCounts(report.findings);
  const findingsByCategory = computeFindingsByCategory(report.findings);
  const maxCategoryCount = findingsByCategory.length > 0 ? findingsByCategory[0][1] : 1;
  const dangerousFiles = getDangerousFiles(report.findings);
  const executiveSummary = getExecutiveSummary(report.findings);
  const verdictStatus = report.verdict === 'GO' ? 'go' : 'no-go' as const;

  const severityItems = [
    { label: 'Critical', count: severityCounts.critical, color: 'text-red-400' },
    { label: 'High', count: severityCounts.high, color: 'text-orange-400' },
    { label: 'Medium', count: severityCounts.medium, color: 'text-yellow-400' },
    { label: 'Low', count: severityCounts.low, color: 'text-slate-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/30"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-2.5 rounded-none bg-muted/30 shrink-0">
            <Github className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-light text-foreground truncate">{report.repo_name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              {report.finding_count} findings
              <span className="text-border/50">|</span>
              {new Date(report.scanned_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <Button variant="outline" className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50" asChild>
          <Link href={`/vulnerabilities?id=${report.id}`}>
            <AlertTriangle className="h-4 w-4" />
            View Vulnerabilities
          </Link>
        </Button>
      </motion.div>

      {/* Score + Verdict + Severity — single card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-clean rounded-none border border-border p-6"
      >
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          {/* Score ring */}
          <div className="shrink-0">
            <ScoreIndicator score={Math.round(report.total_score)} size="md" />
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px self-stretch bg-border/40" />
          <div className="lg:hidden w-full h-px bg-border/40" />

          {/* Verdict + severity counts */}
          <div className="flex-1 flex flex-col items-center lg:items-start gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={verdictStatus} size="md" />
              <span className="text-sm text-muted-foreground font-light">
                {report.verdict === 'GO'
                  ? 'Safe to deploy with minor recommendations'
                  : 'Significant vulnerabilities require attention'}
              </span>
            </div>

            {/* Horizontal separator */}
            <div className="w-full h-px bg-border/30" />

            <div className="flex flex-wrap gap-5">
              {severityItems.map((item, i) => (
                <div key={item.label} className="flex items-center gap-5">
                  <div className="text-center">
                    <p className={`text-2xl font-extralight ${item.color}`}>{item.count}</p>
                    <p className="section-label mt-0.5">{item.label}</p>
                  </div>
                  {i < severityItems.length - 1 && (
                    <div className="h-8 w-px bg-border/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Scores + Findings side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Scores */}
        {report.category_scores && Object.keys(report.category_scores).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-clean rounded-none overflow-hidden border border-border"
          >
            <div className="px-5 py-4 border-b border-border/30">
              <h3 className="section-label">Category Scores</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {Object.entries(report.category_scores).map(([category, score], i) => (
                <div key={category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="section-label text-[0.7rem]">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-extralight tabular-nums" style={{ color: getScoreColor(score) }}>
                      {Math.round(score)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getScoreColor(score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Findings by Category */}
        {findingsByCategory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-clean rounded-none overflow-hidden border border-border"
          >
            <div className="px-5 py-4 border-b border-border/30">
              <h3 className="section-label">Findings by Category</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {findingsByCategory.map(([category, count], i) => {
                const barColor = CATEGORY_COLORS[category] || '#94a3b8';
                const pct = (count / maxCategoryCount) * 100;
                return (
                  <div
                    key={category}
                    className="flex items-center gap-3"
                  >
                    <span className="section-label text-[0.7rem] w-32 shrink-0 truncate">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                      <motion.div
                        className="h-full rounded-sm"
                        style={{ backgroundColor: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Most Dangerous Files */}
      {dangerousFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-clean rounded-none overflow-hidden border border-border"
        >
          <div className="px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="section-label">Hotspot Files</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="section-label text-[0.65rem]">File</TableHead>
                  <TableHead className="section-label text-[0.65rem] text-center">Risk</TableHead>
                  <TableHead className="section-label text-[0.65rem] text-center">Issues</TableHead>
                  <TableHead className="section-label text-[0.65rem] text-center">Severity</TableHead>
                  <TableHead className="section-label text-[0.65rem] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dangerousFiles.map((file) => (
                  <TableRow
                    key={file.fileName}
                    className="border-border/30 hover:bg-muted/10 transition-colors"
                  >
                    <TableCell className="font-mono text-xs max-w-[300px]">
                      <span className="truncate block">{file.fileName}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-bold ${
                        file.riskScore >= 80 ? 'text-red-400' :
                        file.riskScore >= 60 ? 'text-orange-400' :
                        'text-yellow-400'
                      }`}>
                        {file.riskScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {file.linesFlagged}
                    </TableCell>
                    <TableCell className="text-center">
                      <SeverityBadge severity={file.severity} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary h-7" asChild>
                        <Link href={`/vulnerabilities?id=${report.id}`}>
                          Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* AI Summary */}
      {executiveSummary && <SummaryPanel summary={executiveSummary} />}
    </div>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get('id');

  const [report, setReport] = useState<Report | null>(null);
  const [recentScans, setRecentScans] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (scanId) {
        const data = await getReport(scanId);
        setReport(data);
      } else {
        const data = await getReports();
        setRecentScans(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scanId]);

  return (
    <div className="flex flex-col h-full">
      <Navbar title={scanId ? "Scan Report" : "Dashboard"} />

      <div className="flex-1 p-8 lg:p-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-5 w-5 border border-muted-foreground/40 border-t-foreground/70 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card-clean rounded-none p-12 text-center border-red-500/30">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={fetchData}
              className="rounded-none"
            >
              Try Again
            </Button>
          </div>
        ) : scanId && report ? (
          <ReportView report={report} />
        ) : (
          <RecentScansView scans={recentScans} />
        )}
      </div>
    </div>
  );
}
