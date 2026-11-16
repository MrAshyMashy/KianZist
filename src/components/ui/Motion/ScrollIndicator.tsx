"use client";

import { motion } from "framer-motion";

interface ScrollIndicatorProps {
  className?: string;
  delay?: number;
}

export const ScrollIndicator = ({
  className = "",
  delay = 1,
}: ScrollIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className={`flex flex-col items-center justify-center ${className}`}
    >
      {/* 
        Updated classes for a true glassmorphism effect:
        - More transparent background with strong backdrop blur
        - Brand-colored border and glowing dot
        - Slightly larger size for better visibility
      */}
      <div className="kz-neo-sm relative flex h-11 w-7 justify-center rounded-full border border-kz-brand-accent/30 bg-kz-bg-surface/30 p-1.5 backdrop-blur-xl transition-all duration-300 hover:border-kz-brand-accent/60 hover:bg-kz-bg-surface/50">
        <motion.div
          animate={{
            y: [0, 10, 0],
            opacity: [1, 0.3, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="h-2 w-2 rounded-full bg-kz-brand-accent shadow-kz-glow-accent"
        />
      </div>
    </motion.div>
  );
};
