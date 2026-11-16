"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentTabsProps {
  tabs: { id: string; label: string }[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export const SegmentTabs = ({
  tabs,
  defaultTab,
  onChange,
  className,
}: SegmentTabsProps) => {
  const [active, setActive] = useState(defaultTab || tabs[0].id);

  const handleSelect = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full p-1.5",
          // TiltCard glass styling
          "border border-kz-border-main/50 bg-kz-bg-surface/30 backdrop-blur-2xl shadow-kz-card",
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              "relative rounded-full px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/50",
              active === tab.id
                ? "text-kz-text-inverted"
                : "text-kz-text-muted hover:text-kz-text-heading",
            )}
          >
            {active === tab.id && (
              <motion.div
                layoutId="segment-tab-active"
                className="absolute inset-0 z-0 rounded-full bg-kz-brand-primary shadow-kz-glow-accent"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Gradient Border Overlay (Matches TiltCard) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-full bg-kz-brand-gradient opacity-[0.14] dark:opacity-[0.22]"
        style={{
          padding: 1,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    </div>
  );
};
