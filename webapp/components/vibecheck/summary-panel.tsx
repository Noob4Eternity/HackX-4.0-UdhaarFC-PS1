"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

interface SummaryPanelProps {
  summary: string;
}

export function SummaryPanel({ summary }: SummaryPanelProps) {
  // Parse markdown-like content
  const renderSummary = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4
            key={index}
            className="text-sm font-semibold text-purple-100 mt-4 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-400/60 rounded-full shrink-0" />
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3
            key={index}
            className="text-sm font-bold text-purple-50 mt-5 mb-2.5 first:mt-0 pb-2 border-b border-purple-400/15">
            {line.replace("## ", "")}
          </h3>
        );
      }
      // List items
      if (line.startsWith("- ")) {
        return (
          <li
            key={index}
            className="text-[0.8rem] leading-relaxed text-purple-200/70 ml-4 mb-1 list-disc marker:text-purple-400/50">
            {formatBold(line.replace("- ", ""))}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        return (
          <li
            key={index}
            className="text-[0.8rem] leading-relaxed text-purple-200/70 ml-4 mb-1 list-decimal marker:text-purple-400/50">
            {formatBold(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      // Empty lines
      if (line.trim() === "") {
        return (
          <div
            key={index}
            className="h-2"
          />
        );
      }
      // Regular paragraphs
      return (
        <p
          key={index}
          className="text-[0.8rem] leading-relaxed text-purple-200/70 mb-2">
          {formatBold(line)}
        </p>
      );
    });
  };

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <span
            key={i}
            className="font-semibold text-purple-100">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="relative rounded-none overflow-hidden border border-purple-500/20">
      {/* Purple gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(88, 28, 135, 0.15) 0%, rgba(59, 7, 100, 0.25) 50%, rgba(30, 10, 60, 0.3) 100%)",
        }}
      />
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />
      {/* Subtle purple glow at top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5) 30%, rgba(168, 85, 247, 0.6) 50%, rgba(168, 85, 247, 0.5) 70%, transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-400/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
              <Bot className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-purple-100 tracking-wide flex items-center gap-2">
                AI Security Summary
                {/* <Sparkles className="h-3.5 w-3.5 text-purple-400" /> */}
              </h3>
              <p className="text-[0.65rem] italic text-purple-300/40 tracking-widest uppercase mt-0.5 font-mono">
                Powered by vibe-check
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto px-6 py-5">{renderSummary(summary)}</div>
      </div>
    </motion.div>
  );
}
