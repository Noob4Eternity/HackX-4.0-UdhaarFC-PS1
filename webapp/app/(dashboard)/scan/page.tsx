"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  Upload,
  Scan,
  FileArchive,
  ArrowRight,
  Loader2,
  Sparkles,
  Lock,
  Star,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/vibecheck/navbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startAudit, createProgressStream } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SCAN_PHASES, type ProgressEvent, type ScanPhase } from "@/lib/types";
import { ScanStepper } from "@/components/vibecheck/scan-stepper";
import { ScanTerminal } from "@/components/vibecheck/scan-terminal";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState("");
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [phases, setPhases] = useState<ScanPhase[]>(
    SCAN_PHASES.map((p) => ({ ...p, status: "pending" as const }))
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const router = useRouter();
  const { accessToken } = useAuth();

  // Repos state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState("");

  const fetchRepos = useCallback(async () => {
    setReposLoading(true);
    setReposError(null);
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      setRepos(data);
    } catch {
      setReposError("Could not load repositories");
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Helper to update a phase's status in the stepper
  const updatePhaseStatus = useCallback(
    (phaseId: string, status: "in_progress" | "complete" | "error", findings?: number) => {
      setPhases((prev) =>
        prev.map((p) =>
          p.id === phaseId
            ? { ...p, status, ...(findings !== undefined ? { findings } : {}) }
            : p
        )
      );
    },
    []
  );

  // Shared scan logic: starts audit and connects SSE
  const runScan = async (opts: {
    repoUrl?: string;
    zipFile?: File;
    githubToken?: string;
    repoName?: string;
    displayName: string;
  }) => {
    setIsScanning(true);
    setScanTarget(opts.displayName);
    setProgressEvents([]);
    setPhases(SCAN_PHASES.map((p) => ({ ...p, status: "pending" as const })));
    setScanError(null);

    try {
      const { scan_id } = await startAudit({
        repoUrl: opts.repoUrl,
        zipFile: opts.zipFile,
        githubToken: opts.githubToken,
        repoName: opts.repoName,
      });

      const es = createProgressStream(scan_id);
      eventSourceRef.current = es;

      es.addEventListener("progress", (e) => {
        const data: ProgressEvent = JSON.parse(e.data);
        setProgressEvents((prev) => [...prev, data]);

        // Drive the stepper
        if (data.type === "start") {
          updatePhaseStatus(data.phase, "in_progress");
        } else if (data.type === "complete") {
          updatePhaseStatus(data.phase, "complete", data.findings);
        } else if (data.type === "error") {
          updatePhaseStatus(data.phase, "error");
        }
      });

      es.addEventListener("complete", (e) => {
        const data = JSON.parse(e.data);
        es.close();
        toast.success("Scan complete!");
        router.push(`/dashboard?id=${data.report_id}`);
      });

      // Backend sends "scan_error" (not "error") to avoid EventSource native conflict
      es.addEventListener("scan_error", (e) => {
        let errorMsg = "Scan failed";
        try {
          const data = JSON.parse((e as MessageEvent).data);
          errorMsg = data.message || "Scan failed";
        } catch {
          // fallback
        }
        eventSourceRef.current = null;
        es.close();
        setScanError(errorMsg);
        setProgressEvents((prev) => [
          ...prev,
          {
            message: `ERROR: ${errorMsg}`,
            phase: "unknown",
            type: "error",
            timestamp: new Date().toISOString(),
          },
        ]);
        toast.error(errorMsg);
      });

      // Native connection error (backend down, network issue)
      es.onerror = () => {
        // Only handle if we haven't already caught a scan_error
        if (!eventSourceRef.current) return;
        es.close();
        eventSourceRef.current = null;
        const msg = "Connection to backend lost";
        setScanError(msg);
        setProgressEvents((prev) => [
          ...prev,
          {
            message: `ERROR: ${msg}`,
            phase: "unknown",
            type: "error",
            timestamp: new Date().toISOString(),
          },
        ]);
        toast.error(msg);
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start scan";
      setScanError(errorMsg);
      toast.error(errorMsg);
      setIsScanning(false);
    }
  };

  const handleScan = async () => {
    if (!repoUrl && !uploadedFile) {
      toast.error("Please enter a repository URL or upload a ZIP file");
      return;
    }

    await runScan({
      repoUrl: repoUrl || undefined,
      zipFile: uploadedFile || undefined,
      displayName: uploadedFile ? uploadedFile.name : repoUrl,
    });
  };

  const handleRepoScan = async (repo: GitHubRepo) => {
    if (!accessToken) {
      toast.error("GitHub token not available. Try logging out and back in.");
      return;
    }

    await runScan({
      githubToken: accessToken,
      repoName: repo.full_name,
      displayName: repo.full_name,
    });
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
    if (files.length > 0 && files[0].name.endsWith(".zip")) {
      setUploadedFile(files[0]);
      setRepoUrl("");
      toast.success(`File "${files[0].name}" ready for scanning`);
    } else {
      toast.error("Please upload a ZIP file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
      setRepoUrl("");
      toast.success(`File "${files[0].name}" ready for scanning`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar title="New Scan" />

      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty italic leading-tight">
              Select a repository from your account, paste a URL, or upload a ZIP file.
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isScanning ? (
              /* ── Scanning Progress ── */
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "card-clean rounded-none p-8 space-y-6",
                  scanError ? "border-red-500/30" : "border border-primary"
                )}
              >
                {/* Header */}
                <div className="text-center">
                  {scanError ? (
                    <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-3" />
                  ) : (
                    <div className="h-5 w-5 border border-muted-foreground/30 border-t-foreground/70 rounded-full animate-spin mx-auto mb-3" />
                  )}
                  <h2 className="text-xl font-light text-foreground mb-1">
                    {scanError ? "Scan Failed" : "Scanning in Progress"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {scanError || `Analyzing ${scanTarget}`}
                  </p>
                </div>

                {/* Stepper */}
                <ScanStepper phases={phases} />

                {/* Terminal log */}
                <ScanTerminal events={progressEvents} />

                {/* Retry button on error */}
                {scanError && (
                  <div className="text-center">
                    <Button
                      onClick={() => {
                        setIsScanning(false);
                        setScanError(null);
                        setProgressEvents([]);
                        setPhases(
                          SCAN_PHASES.map((p) => ({
                            ...p,
                            status: "pending" as const,
                          }))
                        );
                      }}
                      className="gap-2 rounded-none"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── Scan Form ── */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* ── Your Repositories ── */}
                <div className="card-clean rounded-none p-6 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Github className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Your Repositories</h3>
                        <p className="text-sm text-muted-foreground">
                          Click a repo to scan it
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={fetchRepos}
                      disabled={reposLoading}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw
                        className={cn("h-4 w-4", reposLoading && "animate-spin")}
                      />
                    </Button>
                  </div>

                  {reposLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-24 rounded-none bg-muted/20 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : reposError ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {reposError}
                    </p>
                  ) : repos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No repositories found
                    </p>
                  ) : (
                    <div>
                      {repos.length > 9 && (
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search repositories..."
                            value={repoSearch}
                            onChange={(e) => setRepoSearch(e.target.value)}
                            className="pl-10 bg-background/50 border-border/50 h-9 text-sm"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {repos
                          .filter(r => !repoSearch || r.name.toLowerCase().includes(repoSearch.toLowerCase()) || (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase())))
                          .slice(0, 12)
                          .map((repo, i) => (
                          <motion.button
                            key={repo.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleRepoScan(repo)}
                            className="text-left p-4 rounded-none border border-border bg-background/30 hover:border-primary hover:bg-primary/5 transition-all group"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {repo.name}
                              </span>
                              {repo.private && (
                                <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        LANGUAGE_COLORS[repo.language] || "#888",
                                    }}
                                  />
                                  {repo.language}
                                </span>
                              )}
                              {repo.stargazers_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {repo.stargazers_count}
                                </span>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-sm text-muted-foreground bg-background">
                      OR PASTE A URL
                    </span>
                  </div>
                </div>

                {/* GitHub URL Input */}
                <div className="card-clean rounded-none p-6 border border-primary">
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
                    <span className="px-4 text-sm text-muted-foreground bg-background">
                      OR UPLOAD A ZIP
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "card-clean rounded-none p-8 border-2 border-dashed transition-all duration-300 cursor-pointer",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : uploadedFile
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-border/50 hover:border-primary/50"
                  )}
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
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
                        "inline-flex p-4 rounded-full mb-4",
                        uploadedFile ? "bg-green-500/10" : "bg-primary/10"
                      )}
                    >
                      {uploadedFile ? (
                        <FileArchive className="h-8 w-8 text-green-400" />
                      ) : (
                        <Upload className="h-8 w-8 text-primary" />
                      )}
                    </motion.div>

                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {uploadedFile ? uploadedFile.name : "Upload ZIP File"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {uploadedFile
                        ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB ready for scanning`
                        : "Drag and drop your ZIP file here, or click to browse"}
                    </p>
                  </div>
                </div>

                {/* Scan Button (for URL / ZIP) */}
                {(repoUrl || uploadedFile) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={handleScan}
                      className="w-full h-14 text-lg font-semibold transition-all duration-300 group rounded-none"
                    >
                      <Scan className="mr-2 h-5 w-5" />
                      Start Security Scan
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
