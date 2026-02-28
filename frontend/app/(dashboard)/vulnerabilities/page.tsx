'use client';

import { useState } from 'react';
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
import { mockVulnerabilities, type Vulnerability } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

function VulnerabilityRow({ vulnerability, isExpanded, onToggle }: { 
  vulnerability: Vulnerability; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const handleFixWithChatGPT = () => {
    const encodedPrompt = encodeURIComponent(vulnerability.fixPrompt);
    window.open(`https://chat.openai.com/?prompt=${encodedPrompt}`, '_blank');
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
            <FileCode className="h-4 w-4 text-muted-foreground" />
            {vulnerability.file}
          </div>
        </TableCell>
        <TableCell className="text-center font-mono text-muted-foreground">
          {vulnerability.lineNumber}
        </TableCell>
        <TableCell className="text-center">
          <SeverityBadge severity={vulnerability.severity} size="sm" />
        </TableCell>
        <TableCell className="font-medium">{vulnerability.type}</TableCell>
        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
          {vulnerability.description}
        </TableCell>
        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground font-mono">
          {vulnerability.remediation.slice(0, 50)}...
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFixWithChatGPT}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10 whitespace-nowrap"
          >
            Fix with ChatGPT
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
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
            <TableCell colSpan={8} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-muted/5 border-t border-border/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Code Snippet */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-primary" />
                        Code Context
                      </h4>
                      <div className="bg-background rounded-lg border border-border/50 overflow-hidden">
                        <div className="p-1 bg-muted/30 border-b border-border/50">
                          <span className="text-xs text-muted-foreground font-mono px-2">
                            {vulnerability.file}:{vulnerability.lineNumber}
                          </span>
                        </div>
                        <pre className="p-4 overflow-x-auto">
                          <code className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                            {vulnerability.codeSnippet}
                          </code>
                        </pre>
                        <div className="p-3 bg-red-500/5 border-t border-red-500/20">
                          <span className="text-xs text-red-400 font-medium">Vulnerable Line:</span>
                          <code className="block mt-1 text-sm font-mono text-red-300 bg-red-500/10 px-2 py-1 rounded">
                            {vulnerability.vulnerableLine}
                          </code>
                        </div>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{vulnerability.description}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Recommended Fix</h4>
                        <p className="text-sm text-muted-foreground">{vulnerability.remediation}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground capitalize">
                          Category: {vulnerability.category}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground">
                          ID: {vulnerability.id}
                        </span>
                      </div>
                      
                      <Button
                        onClick={handleFixWithChatGPT}
                        className="gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-background"
                      >
                        Get AI-Powered Fix
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredVulnerabilities = mockVulnerabilities.filter((vuln) => {
    const matchesSearch = 
      vuln.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || vuln.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || vuln.category === categoryFilter;
    
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const severityCounts = {
    critical: mockVulnerabilities.filter(v => v.severity === 'critical').length,
    high: mockVulnerabilities.filter(v => v.severity === 'high').length,
    medium: mockVulnerabilities.filter(v => v.severity === 'medium').length,
    low: mockVulnerabilities.filter(v => v.severity === 'low').length,
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
            { label: 'Low', count: severityCounts.low, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn('px-4 py-3 rounded-xl border', stat.color)}
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
          className="glass-card rounded-xl p-4 flex flex-col lg:flex-row gap-4"
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
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 bg-background/50 border-border/50">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="injection">Injection</SelectItem>
                <SelectItem value="secrets">Secrets</SelectItem>
                <SelectItem value="misconfiguration">Misconfiguration</SelectItem>
                <SelectItem value="dependency">Dependency</SelectItem>
                <SelectItem value="logic">Logic Flaws</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Vulnerabilities Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl overflow-hidden glow-cyan"
        >
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  All Vulnerabilities
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({filteredVulnerabilities.length} found)
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
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Remediation</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulnerabilities.map((vulnerability) => (
                  <VulnerabilityRow
                    key={vulnerability.id}
                    vulnerability={vulnerability}
                    isExpanded={expandedId === vulnerability.id}
                    onToggle={() => setExpandedId(
                      expandedId === vulnerability.id ? null : vulnerability.id
                    )}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredVulnerabilities.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No vulnerabilities found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
