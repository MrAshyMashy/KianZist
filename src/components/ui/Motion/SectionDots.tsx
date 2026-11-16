"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionDotsProps {
  count: number;
  activeIndex: number;
  labels: string[];
  onSelect: (index: number) => void;
  className?: string;
}

export const SectionDots = ({
  count,
  activeIndex,
  labels,
  onSelect,
  className = "",
}: SectionDotsProps) => {
  return (
    <div
      className={cn(
        // CHANGED: md:flex to lg:flex to completely hide on tablet/mobile
        "fixed top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex",
        "rtl:left-4 ltr:right-4",
        "sm:rtl:left-6 sm:ltr:right-6",
        "md:rtl:left-8 md:ltr:right-8",
        "lg:rtl:left-10 lg:ltr:right-10",
        "xl:rtl:left-12 xl:ltr:right-12",
        "2xl:rtl:left-16 2xl:ltr:right-16",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            aria-label={labels[i] || `Go to section ${i + 1}`}
            onClick={() => onSelect(i)}
            className="group relative flex h-8 w-8 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/50 rounded-full"
          >
            <span
              className={cn(
                "absolute whitespace-nowrap rounded-md bg-kz-bg-surface/90 px-3 py-1.5 text-[11px] font-medium text-kz-text-heading opacity-0 shadow-kz-card backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 border border-kz-border-subtle pointer-events-none",
                "rtl:left-full rtl:ml-3",
                "ltr:right-full ltr:mr-3",
              )}
            >
              {labels[i]}
            </span>

            <motion.div
              layout
              className={cn(
                "rounded-full transition-colors duration-300",
                isActive
                  ? "bg-kz-brand-primary shadow-kz-glow"
                  : "bg-kz-border-strong group-hover:bg-kz-brand-accent/60",
              )}
              initial={false}
              animate={{
                width: isActive ? "8px" : "6px",
                height: isActive ? "24px" : "6px",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </button>
        );
      })}
    </div>
  );
};