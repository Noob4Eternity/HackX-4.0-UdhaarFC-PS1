"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Sparkles,
  KeyRound,
  Bug,
  Package,
  Scale,
  Bot,
  DollarSign,
  GitPullRequest,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LightRays } from "@/components/ui/light-rays";

function CodeSnippet() {
  const [copied, setCopied] = useState(false);
  const command = "pip install vibe-check-cli";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="inline-flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 backdrop-blur-sm px-5 py-3 font-[family-name:var(--font-geist-mono)] text-sm">
      <Terminal
        size={14}
        className="text-muted-foreground shrink-0"
      />
      <span className="text-muted-foreground select-none">$</span>
      <span className="text-foreground">{command}</span>
      <button
        onClick={handleCopy}
        className="ml-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-90"
        aria-label="Copy to clipboard">
        <motion.div
          key={copied ? "check" : "copy"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          {copied ? (
            <Check
              size={14}
              className="text-green-400"
            />
          ) : (
            <Copy size={14} />
          )}
        </motion.div>
      </button>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-fonts relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Light Rays */}
      <LightRays
        color="rgba(255, 255, 255, 0.08)"
        count={8}
        blur={40}
        speed={16}
        length="80vh"
      />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className=" flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Inner static circle */}
            <div className="absolute w-6 h-6 border-2 border-white rounded-full" />
            {/* Outer revolving ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute w-12 h-12 border border-white/20 border-t-white rounded-full"
            />
          </div>
        </motion.div>

        <div className="section-label inline-flex items-center gap-2 px-4 py-2 border border-border mb-6">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Security Analysis</span>
            </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-5xl md:text-7xl font-light text-foreground mb-6 font-(family-name:--font-playfair) leading-[1.3] tracking-tight">
          Security for code that{" "}
          <div className="font-extralight italic  bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-white to-yellow-500 tracking-tight">
            ships fast
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed font-light">
          AI-powered vulnerability scanning from your terminal. Find issues before they find you.
        </motion.p>

        {/* Code snippet */}
        <CodeSnippet />

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Button
            variant="outline"
            asChild
            className="h-12 px-8 border border-primary text-primary font-medium rounded-none hover:bg-primary/10">
            <Link href="/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="h-12 px-8 text-muted-foreground hover:text-foreground rounded-none">
            <a
              href="https://github.com/Noob4Eternity/HackX-4.0-UdhaarFC-PS1"
              target="_blank"
              rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 mt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4">
            7 analyzers. One command.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Comprehensive security analysis tailored for AI-generated and rapidly shipped codebases.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30">
          {[
            {
              icon: KeyRound,
              title: "Secrets Detection",
              desc: "Finds hardcoded API keys, tokens, and credentials before they leak.",
            },
            {
              icon: Bug,
              title: "SAST Analysis",
              desc: "Static analysis with Bandit + Semgrep to catch SQL injection, shell injection, and more.",
            },
            {
              icon: Package,
              title: "Dependency Audit",
              desc: "Detects hallucinated packages, typosquats, known CVEs, and outdated libraries.",
            },
            {
              icon: Scale,
              title: "Compliance Checks",
              desc: "Automated GDPR and SOC 2 gap analysis using AST + LLM reasoning.",
            },
            {
              icon: Bot,
              title: "Prompt Injection",
              desc: "Identifies unsanitized user input flowing into LLM API calls (OWASP LLM Top 10).",
            },
            {
              icon: DollarSign,
              title: "Cost Efficiency",
              desc: "Flags expensive LLM models, over-provisioned infra, and bloated dependencies.",
            },
            {
              icon: GitPullRequest,
              title: "GitHub PR Integration",
              desc: "Auto-comments on pull requests with GO/NO-GO verdicts and commit status checks.",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.08, duration: 0.4 }}
              className="bg-background/60 backdrop-blur-sm p-8 group"
            >
              <feature.icon className="h-6 w-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
