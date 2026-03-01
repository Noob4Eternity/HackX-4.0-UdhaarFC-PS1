"use client";

import { motion } from "framer-motion";
import { Check, X, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanPhase } from "@/lib/types";

interface ScanStepperProps {
  phases: ScanPhase[];
}

export function ScanStepper({ phases }: ScanStepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-0">
        {phases.map((phase, i) => (
          <div key={phase.id} className="flex items-start">
            <div className="flex flex-col items-center flex-1 min-w-0">
              {/* Status icon */}
              <div
                className={cn(
                  "w-8 h-8 flex items-center justify-center border transition-colors duration-300",
                  phase.status === "pending" &&
                    "border-border bg-muted/20 text-muted-foreground/40",
                  phase.status === "in_progress" &&
                    "border-primary bg-primary/10 text-primary",
                  phase.status === "complete" &&
                    "border-green-500/50 bg-green-500/10 text-green-400",
                  phase.status === "error" &&
                    "border-red-500/50 bg-red-500/10 text-red-400"
                )}
              >
                {phase.status === "pending" && <Minus className="h-3 w-3" />}
                {phase.status === "in_progress" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                )}
                {phase.status === "complete" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                )}
                {phase.status === "error" && <X className="h-4 w-4" />}
              </div>
              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-[10px] font-mono text-center leading-tight",
                  phase.status === "pending" && "text-muted-foreground/40",
                  phase.status === "in_progress" && "text-primary",
                  phase.status === "complete" && "text-green-400/80",
                  phase.status === "error" && "text-red-400/80",
                  phase.id === "ai_summary" &&
                    phase.status === "in_progress" &&
                    "text-purple-400"
                )}
              >
                {phase.label}
              </span>
              {/* Finding count */}
              {phase.status === "complete" &&
                phase.findings !== undefined &&
                phase.findings > 0 && (
                  <span className="mt-0.5 text-[9px] font-mono text-muted-foreground">
                    {phase.findings} found
                  </span>
                )}
            </div>
            {/* Connector line */}
            {i < phases.length - 1 && (
              <div className="flex items-center h-8 px-0.5">
                <div
                  className={cn(
                    "w-3 h-px transition-colors duration-300",
                    phase.status === "complete" || phase.status === "error"
                      ? "bg-border"
                      : "bg-border/30"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
