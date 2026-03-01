'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Github, AlertTriangle, FileText, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Navbar } from '@/components/vibecheck/navbar';
import { ScoreIndicator } from '@/components/vibecheck/score-indicator';
import { StatusBadge } from '@/components/vibecheck/status-badge';
import { ChartCard } from '@/components/vibecheck/chart-card';
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { getReport, getReports } from '@/lib/api';
import type { Report, ReportSummary, Finding } from '@/lib/types';
import { getScoreColor } from '@/lib/types';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#94a3b8',
  Info: '#6b7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  secret: '#a855f7',
  sast: '#ef4444',
  vulnerable_dependency: '#cbd5e1',
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

function computeCategoryDistribution(findings: Finding[]) {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.category] = (counts[f.category] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([cat]) => cat !== 'llm_review')
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      fill: CATEGORY_COLORS[name] || '#94a3b8',
    }));
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
                        <Github className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-light text-lg text-foreground">{scan.repo_name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
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
  const categoryData = computeCategoryDistribution(report.findings);
  const dangerousFiles = getDangerousFiles(report.findings);
  const executiveSummary = getExecutiveSummary(report.findings);

  const severityData = [
    { name: 'Critical', value: severityCounts.critical, fill: SEVERITY_COLORS.Critical },
    { name: 'High', value: severityCounts.high, fill: SEVERITY_COLORS.High },
    { name: 'Medium', value: severityCounts.medium, fill: SEVERITY_COLORS.Medium },
    { name: 'Low', value: severityCounts.low, fill: SEVERITY_COLORS.Low },
  ];

  const verdictStatus = report.verdict === 'GO' ? 'go' : 'no-go' as const;

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="p-3 rounded-xl bg-muted/30">
            <Github className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-light text-foreground">{report.repo_name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              {report.finding_count} findings
              <span className="text-border/50">|</span>
              {new Date(report.scanned_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/vulnerabilities?id=${report.id}`}>
              <AlertTriangle className="h-4 w-4" />
              View Vulnerabilities
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Score and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card-clean rounded-none p-10 flex flex-col items-center justify-center border border-border"
        >
          <ScoreIndicator score={Math.round(report.total_score)} size="lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card-clean rounded-none p-10 flex flex-col items-center justify-center gap-8 border border-border"
        >
          <StatusBadge status={verdictStatus} size="lg" />
          <div className="text-center">
            <p className="section-label mb-2">Deployment Recommendation</p>
            <p className="text-sm text-muted-foreground font-light">
              {report.verdict === 'GO'
                ? 'Safe to deploy with minor recommendations'
                : 'Significant vulnerabilities require immediate attention'}
            </p>
          </div>
          <div className="flex gap-10 text-center">
            <div>
              <p className="text-4xl font-extralight text-destructive">{severityCounts.critical}</p>
              <p className="section-label mt-1">Critical</p>
            </div>
            <div>
              <p className="text-4xl font-extralight text-orange-400">{severityCounts.high}</p>
              <p className="section-label mt-1">High</p>
            </div>
            <div>
              <p className="text-4xl font-extralight text-yellow-400">{severityCounts.medium}</p>
              <p className="section-label mt-1">Medium</p>
            </div>
            <div>
              <p className="text-4xl font-extralight text-slate-400">{severityCounts.low}</p>
              <p className="section-label mt-1">Low</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Severity Bar Chart */}
        <ChartCard title="Vulnerabilities by Severity" description="Distribution across severity levels">
          <ChartContainer config={{ value: { label: 'Count' } }} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={70} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>

        {/* Category Pie Chart */}
        {categoryData.length > 0 && (
          <ChartCard title="Vulnerability Categories" description="Types of security issues found">
            <ChartContainer config={{ value: { label: 'Count' } }} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartCard>
        )}
      </div>

      {/* Category Scores */}
      {report.category_scores && Object.keys(report.category_scores).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-clean rounded-none overflow-hidden border border-border"
        >
          <div className="p-8 border-b border-border/30">
            <h3 className="section-label">Category Scores</h3>
            <p className="text-sm text-muted-foreground font-light mt-2">Score breakdown by analysis category</p>
          </div>
          <div className="p-8 grid grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(report.category_scores).map(([category, score]) => (
              <div key={category} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="section-label">
                    {category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-extralight" style={{ color: getScoreColor(score) }}>
                    {Math.round(score)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getScoreColor(score) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Most Dangerous Files Table */}
      {dangerousFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-clean rounded-none overflow-hidden border border-border"
        >
          <div className="p-8 border-b border-border/30">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="section-label">Most Dangerous Files</h3>
            </div>
            <p className="text-sm text-muted-foreground font-light mt-2">Files with the highest risk scores</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="section-label">File Name</TableHead>
                <TableHead className="section-label text-center">Risk Score</TableHead>
                <TableHead className="section-label text-center">Findings</TableHead>
                <TableHead className="section-label text-center">Severity</TableHead>
                <TableHead className="section-label text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dangerousFiles.map((file, index) => (
                <TableRow
                  key={file.fileName}
                  className="border-border/30 hover:bg-muted/10 transition-colors"
                >
                  <TableCell className="font-mono text-sm">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      {file.fileName}
                    </motion.div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${
                      file.riskScore >= 80 ? 'text-red-400' :
                      file.riskScore >= 60 ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {file.riskScore}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {file.linesFlagged}
                  </TableCell>
                  <TableCell className="text-center">
                    <SeverityBadge severity={file.severity} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary" asChild>
                      <Link href={`/vulnerabilities?id=${report.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* AI Summary Panel */}
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
    <div className="min-h-screen flex flex-col">
      <Navbar title={scanId ? "Scan Report" : "Dashboard"} />

      <div className="flex-1 p-8 lg:p-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
            />
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
