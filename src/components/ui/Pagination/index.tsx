"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  lang?: "fa" | "en";
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  lang = "fa",
  className,
}: PaginationProps) => {
  const isRTL = lang === "fa";
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-full p-1.5",
          // TiltCard glass styling
          "border border-kz-border-main/50 bg-kz-bg-surface/30 backdrop-blur-2xl shadow-kz-card",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-10 w-10 rounded-full p-0 hover:bg-kz-bg-surface/50"
        >
          <PrevIcon size={18} />
        </Button>

        {Array.from({ length: totalPages }).map((_, idx) => {
          const page = idx + 1;
          return (
            <Button
              key={page}
              variant={currentPage === page ? "primary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                "h-10 w-10 rounded-full p-0 text-sm font-semibold",
                currentPage === page
                  ? "shadow-kz-glow-accent"
                  : "hover:bg-kz-bg-surface/50",
              )}
            >
              {page}
            </Button>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-10 w-10 rounded-full p-0 hover:bg-kz-bg-surface/50"
        >
          <NextIcon size={18} />
        </Button>
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
