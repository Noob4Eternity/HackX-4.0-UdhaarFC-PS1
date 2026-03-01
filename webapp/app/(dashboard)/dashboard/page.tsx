'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Github,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Globe,
  Upload,
  Lock,
  Zap,
  Timer,
  Files,
  Code2,
  Webhook,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/vibecheck/navbar';
import { ScoreIndicator } from '@/components/vibecheck/score-indicator';
import { StatusBadge } from '@/components/vibecheck/status-badge';
import { SummaryPanel } from '@/components/vibecheck/summary-panel';
import { SeverityBadge } from '@/components/vibecheck/severity-badge';
import { DashboardSkeleton, RecentScansSkeleton } from '@/components/vibecheck/skeleton-loaders';
import { Button } from '@/components/ui/button';
import { getReport, getReports } from '@/lib/api';
import type { Report, ReportSummary, Finding } from '@/lib/types';
import { getScoreColor, getGradeColor, getFullVerdict } from '@/lib/types';

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

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#94a3b8',
  info: '#6b7280',
};

const PAGE_SIZE = 10;

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

function getTopFixes(findings: Finding[]): Finding[] {
  return findings
    .filter(f => (f.severity === 'critical' || f.severity === 'high') && f.ai_prompt && f.category !== 'llm_review')
    .slice(0, 3);
}

// --- Severity Donut Chart ---
function SeverityDonut({ counts }: { counts: Record<string, number> }) {
  const severities = ['critical', 'high', 'medium', 'low'] as const;
  const total = severities.reduce((sum, s) => sum + (counts[s] || 0), 0);
  if (total === 0) return null;

  const size = 120;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const segments = severities
    .filter(s => counts[s] > 0)
    .map(s => {
      const pct = counts[s] / total;
      const offset = accumulated;
      accumulated += pct;
      return { severity: s, pct, offset, color: SEVERITY_COLORS[s] };
    });

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.severity}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{
                strokeDashoffset: circumference - (seg.pct * circumference),
              }}
              style={{
                strokeDashoffset: circumference - (seg.pct * circumference),
                transformOrigin: '50% 50%',
                transform: `rotate(${seg.offset * 360}deg)`,
              }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extralight text-foreground">{total}</span>
          <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wider">total</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {severities.filter(s => counts[s] > 0).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SEVERITY_COLORS[s] }} />
            <span className="text-xs text-muted-foreground capitalize">{s}</span>
            <span className="text-xs font-medium text-foreground ml-auto tabular-nums">{counts[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Score History Mini Chart ---
function ScoreHistoryChart({ scans }: { scans: ReportSummary[] }) {
  if (scans.length < 2) return null;

  const sorted = [...scans].reverse(); // oldest first
  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = sorted.map((s, i) => ({
    x: padding.left + (i / (sorted.length - 1)) * chartW,
    y: padding.top + chartH - (s.total_score / 100) * chartH,
    score: Math.round(s.total_score),
    label: new Date(s.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-clean rounded-none border border-border overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border/30">
        <h3 className="section-label">Score Trend</h3>
      </div>
      <div className="px-5 py-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = padding.top + chartH - (v / 100) * chartH;
            return (
              <g key={v}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.08} />
                <text x={padding.left - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="8">{v}</text>
              </g>
            );
          })}

          {/* Area fill */}
          <motion.path
            d={areaD}
            fill="url(#scoreGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
          />

          {/* Line */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />

          {/* Points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#8b5cf6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* X-axis labels (first and last only to avoid clutter) */}
          {[points[0], points[points.length - 1]].map((p, i) => (
            <text key={i} x={p.x} y={height - 2} textAnchor={i === 0 ? 'start' : 'end'} className="fill-muted-foreground" fontSize="8">
              {p.label}
            </text>
          ))}

          <defs>
            <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </motion.div>
  );
}

// --- Top Fixes Card ---
function TopFixesCard({ findings }: { findings: Finding[] }) {
  const topFixes = getTopFixes(findings);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (topFixes.length === 0) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="card-clean rounded-none overflow-hidden border border-border"
    >
      <div className="px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="section-label">Priority Fixes</h3>
        </div>
      </div>
      <div className="divide-y divide-border/30">
        {topFixes.map((f, i) => (
          <div key={f.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <SeverityBadge severity={f.severity as 'critical' | 'high'} size="sm" />
                <span className="text-sm font-medium text-foreground truncate">{f.title}</span>
              </div>
              {f.cwe && (
                <span className="text-[0.65rem] px-1.5 py-0.5 bg-muted/40 text-muted-foreground shrink-0">
                  {f.cwe}
                </span>
              )}
            </div>
            {f.file_path && (
              <p className="text-xs font-mono text-muted-foreground mb-2 truncate">{f.file_path}{f.line_number ? `:${f.line_number}` : ''}</p>
            )}
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{f.remediation}</p>
            {f.ai_prompt && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7 rounded-none border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => handleCopy(f.ai_prompt, i)}
              >
                {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedIdx === i ? 'Copied' : 'Copy Fix Prompt'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// --- Recent scans list view ---
function RecentScansView({ scans }: { scans: ReportSummary[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(scans.length / PAGE_SIZE);
  const paginatedScans = scans.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-8">
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
        <>
          <div className="grid gap-4">
            {paginatedScans.map((scan, i) => (
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
                          ) : scan.trigger_source === 'webhook' ? (
                            <Webhook className="h-5 w-5 text-muted-foreground" />
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
                                 scan.trigger_source === 'webhook' ? 'Webhook' :
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none gap-1"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none gap-1"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Score Trend Chart */}
          <ScoreHistoryChart scans={scans} />
        </>
      )}
    </div>
  );
}

// --- Full report view ---
function ReportView({ report }: { report: Report }) {
  const severityCounts = computeSeverityCounts(report.findings);
  const findingsByCategory = computeFindingsByCategory(report.findings);
  const maxCategoryCount = findingsByCategory.length > 0 ? findingsByCategory[0][1] : 1;
  const dangerousFiles = getDangerousFiles(report.findings);
  const executiveSummary = getExecutiveSummary(report.findings);
  const verdictStatus = report.verdict === 'GO' ? 'go' : 'no-go' as const;
  const fullVerdict = getFullVerdict(report.total_score);

  const severityItems = [
    { label: 'Critical', count: severityCounts.critical, color: 'text-red-400' },
    { label: 'High', count: severityCounts.high, color: 'text-orange-400' },
    { label: 'Medium', count: severityCounts.medium, color: 'text-yellow-400' },
    { label: 'Low', count: severityCounts.low, color: 'text-slate-400' },
  ];

  const triggerLabel = report.trigger_source === 'url' ? 'Public URL'
    : report.trigger_source === 'oauth' ? 'Private Repo'
    : report.trigger_source === 'zip' ? 'ZIP Upload'
    : report.trigger_source === 'webhook' ? 'Webhook'
    : report.trigger_source;

  const triggerIcon = report.trigger_source === 'zip' ? Upload
    : report.trigger_source === 'oauth' ? Lock
    : report.trigger_source === 'webhook' ? Webhook
    : Globe;

  const TriggerIcon = triggerIcon;

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

      {/* Score + Grade + Verdict + Severity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-clean rounded-none border border-border p-6"
      >
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          {/* Score ring */}
          <div className="shrink-0 relative">
            <ScoreIndicator score={Math.round(report.total_score)} size="md" />
            {/* Grade badge overlay */}
            {report.grade && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, type: 'spring' }}
                className="absolute -top-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-background"
                style={{
                  backgroundColor: getGradeColor(report.grade) + '20',
                  color: getGradeColor(report.grade),
                  borderColor: getGradeColor(report.grade) + '40',
                }}
              >
                {report.grade}
              </motion.div>
            )}
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px self-stretch bg-border/40" />
          <div className="lg:hidden w-full h-px bg-border/40" />

          {/* Verdict + severity counts */}
          <div className="flex-1 flex flex-col items-center lg:items-start gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={verdictStatus} size="md" />
              <div>
                <span className="text-sm font-medium text-foreground block">
                  {fullVerdict}
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.verdict === 'GO'
                    ? 'Safe to deploy with minor recommendations'
                    : 'Significant vulnerabilities require attention'}
                </span>
              </div>
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

      {/* Scan Metadata Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap gap-3"
      >
        {/* Trigger source */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs text-muted-foreground">
          <TriggerIcon className="h-3.5 w-3.5" />
          {triggerLabel}
        </div>

        {/* Languages */}
        {report.languages_detected && report.languages_detected.length > 0 && (
          report.languages_detected.map(lang => (
            <div key={lang} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs text-muted-foreground">
              <Code2 className="h-3.5 w-3.5" />
              {lang}
            </div>
          ))
        )}

        {/* Files scanned */}
        {report.files_scanned != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs text-muted-foreground">
            <Files className="h-3.5 w-3.5" />
            {report.files_scanned} files scanned
          </div>
        )}

        {/* Scan time */}
        {report.scan_time != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            {report.scan_time < 60
              ? `${Math.round(report.scan_time)}s`
              : `${Math.floor(report.scan_time / 60)}m ${Math.round(report.scan_time % 60)}s`}
          </div>
        )}

        {/* Tokens used */}
        {report.tokens_used != null && report.tokens_used > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/50 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            {report.tokens_used.toLocaleString()} tokens
          </div>
        )}
      </motion.div>

      {/* Severity Donut + Category Scores side by side */}
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

        {/* Severity Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-clean rounded-none overflow-hidden border border-border"
        >
          <div className="px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="section-label">Severity Distribution</h3>
            </div>
          </div>
          <div className="px-5 py-6 flex justify-center">
            <SeverityDonut counts={severityCounts} />
          </div>
        </motion.div>
      </div>

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

      {/* Priority Fixes + Hotspot Files side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Priority Fixes */}
        <TopFixesCard findings={report.findings} />

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

            <div className="px-5 py-3 space-y-2">
              {dangerousFiles.map((file) => (
                <Link
                  key={file.fileName}
                  href={`/vulnerabilities?id=${report.id}`}
                  className="flex items-center gap-3 py-2 px-3 hover:bg-muted/10 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-foreground truncate">{file.fileName}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${
                    file.riskScore >= 80 ? 'text-red-400' :
                    file.riskScore >= 60 ? 'text-orange-400' :
                    'text-yellow-400'
                  }`}>
                    {file.riskScore}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{file.linesFlagged} issues</span>
                  <SeverityBadge severity={file.severity} size="sm" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

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
        const data = await getReports(50);
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
          scanId ? <DashboardSkeleton /> : <RecentScansSkeleton />
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
