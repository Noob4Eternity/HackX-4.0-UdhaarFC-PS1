"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Copy, Check, Terminal } from "lucide-react";
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
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Light Rays */}
      <LightRays
        color="rgba(0, 180, 220, 0.12)"
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
          className="mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="bg-cyan-600 p-2.5 rounded-lg">
              <Shield
                size={28}
                className="text-background"
              />
            </div>
            <span className="text-2xl font-bold text-foreground italic">VibeCheck</span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-5xl md:text-7xl font-light text-foreground mb-6 font-[family-name:var(--font-playfair)] leading-[1.3] tracking-tight">
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
          className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed font-extralight *:">
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
            className="h-12 px-8 border border-yellow-400/50 text-yellow-300 font-medium hover:!bg-transparent hover:!text-yellow-300">
            <Link href="/login">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="h-12 px-8 text-muted-foreground hover:text-foreground">
            <a
              href="https://github.com/Noob4Eternity/HackX-4.0-UdhaarFC-PS1"
              target="_blank"
              rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
