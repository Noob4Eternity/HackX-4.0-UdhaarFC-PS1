"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Circle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressEvent } from "@/lib/types";

interface ScanTerminalProps {
  events: ProgressEvent[];
}

function formatTime(isoTimestamp: string): string {
  try {
    const d = new Date(isoTimestamp);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "--:--:--";
  }
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "complete":
      return <Check className="h-3 w-3 text-green-400 shrink-0" />;
    case "start":
      return (
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Circle className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />
        </motion.div>
      );
    case "error":
      return <X className="h-3 w-3 text-red-400 shrink-0" />;
    default:
      return <Info className="h-3 w-3 text-muted-foreground shrink-0" />;
  }
}

export function ScanTerminal({ events }: ScanTerminalProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="card-clean border border-border overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-background/30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-red-500/60" />
          <div className="w-2.5 h-2.5 bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 bg-green-500/60" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground ml-2">
          scan log
        </span>
      </div>
      {/* Log body */}
      <div className="max-h-72 overflow-y-auto p-4 space-y-1.5 bg-black/20">
        {events.length === 0 && (
          <p className="text-xs font-mono text-muted-foreground/50">
            Waiting for scan events...
          </p>
        )}
        {events.map((evt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-2 text-xs font-mono"
          >
            <span className="text-muted-foreground/50 shrink-0">
              [{formatTime(evt.timestamp)}]
            </span>
            <EventIcon type={evt.type} />
            <span
              className={cn(
                evt.type === "complete" && "text-green-400/90",
                evt.type === "start" && "text-foreground/80",
                evt.type === "error" && "text-red-400",
                evt.type === "info" && "text-muted-foreground"
              )}
            >
              {evt.message}
            </span>
          </motion.div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
