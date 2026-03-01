"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: { container: 24, inner: 10, outer: 18, text: "text-lg" },
    md: { container: 32, inner: 14, outer: 26, text: "text-xl" },
    lg: { container: 64, inner: 24, outer: 48, text: "text-3xl" },
  };

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}>
      <div className="flex flex-col items-center justify-center gap-4">
        <div
          style={{ width: sizes[size].container, height: sizes[size].container }}
          className="relative flex items-center justify-center">
          {/* Inner static circle */}
          <div
            style={{ width: sizes[size].inner, height: sizes[size].inner }}
            className="absolute border-[1.5px] border-white rounded-full"
          />
          {/* Outer revolving ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ width: sizes[size].outer, height: sizes[size].outer }}
            className="absolute border border-white/20 border-t-white rounded-full"
          />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className={`font-light tracking-wide  text-foreground font-sans`}>
            vibe-check
          </div>
          {/* <div className="section-label leading-none text-xs italic">Security</div> */}
        </div>
      )}
    </motion.div>
  );
}
