'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  Upload, 
  Scan, 
  FileArchive,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/vibecheck/navbar';
import { recentScans } from '@/lib/mock-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const router = useRouter();

  const handleScan = async () => {
    if (!repoUrl && !uploadedFile) {
      toast.error('Please enter a repository URL or upload a ZIP file');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    // Simulate scan progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    // Simulate scan completion
    setTimeout(() => {
      clearInterval(interval);
      setScanProgress(100);
      toast.success('Scan complete!');
      router.push('/dashboard');
    }, 3000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
      setUploadedFile(files[0]);
      setRepoUrl('');
      toast.success(`File "${files[0].name}" ready for scanning`);
    } else {
      toast.error('Please upload a ZIP file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
      setRepoUrl('');
      toast.success(`File "${files[0].name}" ready for scanning`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'go':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'conditional-go':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'no-go':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar title="New Scan" />
      
      <div className="flex-1 p-6 lg:p-8 animated-bg">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Security Analysis</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
              Scan Your Codebase for{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Vulnerabilities
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Get instant AI-powered vulnerability analysis with actionable remediation suggestions.
              Submit a GitHub repository URL or upload your code as a ZIP file.
            </p>
          </motion.div>

          {/* Scan Form */}
          <AnimatePresence mode="wait">
            {isScanning ? (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-2xl p-8 glow-cyan text-center"
              >
                <div className="max-w-md mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="inline-flex p-4 rounded-full bg-primary/10 mb-6"
                  >
                    <Loader2 className="h-12 w-12 text-primary" />
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-2">Scanning in Progress</h2>
                  <p className="text-muted-foreground mb-6">
                    Analyzing {uploadedFile ? uploadedFile.name : repoUrl}
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(scanProgress, 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Scanning files...</span>
                    <span>{Math.min(Math.round(scanProgress), 100)}%</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* GitHub URL Input */}
                <div className="glass-card rounded-2xl p-6 glow-cyan">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Github className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">GitHub Repository</h3>
                      <p className="text-sm text-muted-foreground">Paste your repository URL</p>
                    </div>
                  </div>
                  
                  <Input
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (e.target.value) setUploadedFile(null);
                    }}
                    className="h-14 text-lg bg-background/50 border-border/50 focus:border-primary"
                  />
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm text-muted-foreground bg-background">OR</span>
                  </div>
                </div>

                {/* File Upload */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'glass-card rounded-2xl p-8 border-2 border-dashed transition-all duration-300 cursor-pointer',
                    isDragging 
                      ? 'border-primary bg-primary/5 glow-cyan' 
                      : uploadedFile 
                        ? 'border-green-500/50 bg-green-500/5' 
                        : 'border-border/50 hover:border-primary/50'
                  )}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="text-center">
                    <motion.div
                      animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                      className={cn(
                        'inline-flex p-4 rounded-full mb-4',
                        uploadedFile ? 'bg-green-500/10' : 'bg-primary/10'
                      )}
                    >
                      {uploadedFile ? (
                        <FileArchive className="h-8 w-8 text-green-400" />
                      ) : (
                        <Upload className="h-8 w-8 text-primary" />
                      )}
                    </motion.div>
                    
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {uploadedFile ? uploadedFile.name : 'Upload ZIP File'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {uploadedFile 
                        ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB ready for scanning` 
                        : 'Drag and drop your ZIP file here, or click to browse'}
                    </p>
                  </div>
                </div>

                {/* Scan Button */}
                <Button
                  onClick={handleScan}
                  disabled={!repoUrl && !uploadedFile}
                  className="w-full h-14 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-background font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Scan className="mr-2 h-5 w-5" />
                  Start Security Scan
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Scans */}
          {!isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Recent Scans
                </h2>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
              
              <div className="grid gap-4">
                {recentScans.map((scan, index) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => router.push('/dashboard')}
                    className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Github className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {scan.repoName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(scan.scanDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn('text-xl font-bold', getScoreColor(scan.vibeScore))}>
                            {scan.vibeScore}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30">
                          {getStatusIcon(scan.status)}
                          <span className="text-sm capitalize">
                            {scan.status.replace('-', ' ')}
                          </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
