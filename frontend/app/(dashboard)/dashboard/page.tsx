'use client';

import { motion } from 'framer-motion';
import { Github, ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
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
import { 
  mockScanResult, 
  severityCounts, 
  categoryDistribution, 
  fileRiskDensity, 
  dangerousFiles 
} from '@/lib/mock-data';
import Link from 'next/link';

// Compute colors directly in JavaScript for Recharts compatibility
const SEVERITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316', 
  Medium: '#eab308',
  Low: '#3b82f6',
};

const CATEGORY_COLORS = {
  Injection: '#ef4444',
  Secrets: '#a855f7',
  Misconfiguration: '#f97316',
  'Dependency Risk': '#06b6d4',
  'Logic Flaws': '#22c55e',
};

export default function DashboardPage() {
  const severityData = [
    { name: 'Critical', value: severityCounts.critical, fill: SEVERITY_COLORS.Critical },
    { name: 'High', value: severityCounts.high, fill: SEVERITY_COLORS.High },
    { name: 'Medium', value: severityCounts.medium, fill: SEVERITY_COLORS.Medium },
    { name: 'Low', value: severityCounts.low, fill: SEVERITY_COLORS.Low },
  ];

  const categoryData = categoryDistribution.map((item) => ({
    ...item,
    fill: CATEGORY_COLORS[item.name as keyof typeof CATEGORY_COLORS] || '#3b82f6',
  }));

  const riskDensityData = fileRiskDensity.map((item) => ({
    ...item,
    fill: item.risk >= 70 ? '#ef4444' : item.risk >= 50 ? '#f97316' : '#06b6d4',
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title="Dashboard" />
      
      <div className="flex-1 p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-muted/50">
              <Github className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{mockScanResult.repoName}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {mockScanResult.filesScanned} files scanned
                <span className="text-border">|</span>
                {new Date(mockScanResult.scanDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/vulnerabilities">
                <AlertTriangle className="h-4 w-4" />
                View Vulnerabilities
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <a href={mockScanResult.repoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View Repository
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Score and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center glow-cyan"
          >
            <ScoreIndicator score={mockScanResult.vibeScore} size="lg" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-6"
          >
            <StatusBadge status={mockScanResult.status} size="lg" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Deployment Recommendation</p>
              <p className="text-sm text-muted-foreground mt-1">
                {mockScanResult.status === 'go' 
                  ? 'Safe to deploy with minor recommendations'
                  : mockScanResult.status === 'conditional-go'
                    ? 'Address critical issues before production deployment'
                    : 'Significant vulnerabilities require immediate attention'}
              </p>
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-destructive">{severityCounts.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-400">{severityCounts.high}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400">{severityCounts.medium}</p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{severityCounts.low}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Severity Bar Chart */}
          <ChartCard title="Vulnerabilities by Severity" description="Distribution across severity levels">
            <ChartContainer
              config={{
                value: { label: 'Count' }
              }}
              className="h-[250px]"
            >
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
          <ChartCard title="Vulnerability Categories" description="Types of security issues found">
            <ChartContainer
              config={{
                value: { label: 'Count' }
              }}
              className="h-[250px]"
            >
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

          {/* File Risk Line Chart */}
          <ChartCard title="File-Level Risk Density" description="Risk scores across files">
            <ChartContainer
              config={{
                risk: { label: 'Risk Score', color: '#06b6d4' }
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskDensityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="file" 
                    stroke="#888" 
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartCard>
        </div>

        {/* Most Dangerous Files Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl overflow-hidden glow-cyan"
        >
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Most Dangerous Files</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Files with the highest risk scores requiring immediate attention</p>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">File Name</TableHead>
                <TableHead className="text-muted-foreground text-center">Risk Score</TableHead>
                <TableHead className="text-muted-foreground text-center">Lines Flagged</TableHead>
                <TableHead className="text-muted-foreground text-center">Severity</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dangerousFiles.map((file, index) => (
                <TableRow 
                  key={file.fileName}
                  className="border-border/50 hover:bg-muted/20 transition-colors"
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
                      <Link href="/vulnerabilities">
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* AI Summary Panel */}
        <SummaryPanel summary={mockScanResult.aiSummary} />
      </div>
    </div>
  );
}
