"use client";

import Typography from "@/typography";
import { cn } from "@/lib/utils";

interface TimelineNodeProps {
  year: string;
  title: string;
  description: string;
  isLast?: boolean;
  isActive?: boolean;
}

export const TimelineNode = ({
  year,
  title,
  description,
  isLast,
  isActive,
}: TimelineNodeProps) => {
  return (
    <div className="relative flex gap-6 pb-10">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 h-full w-[2px] bg-kz-border-subtle rtl:left-auto rtl:right-[11px]" />
      )}

      {/* Dot */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2 bg-kz-bg-body",
            isActive
              ? "border-kz-brand-accent shadow-kz-glow-accent"
              : "border-kz-border-strong",
          )}
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isActive ? "bg-kz-brand-accent" : "bg-kz-border-strong",
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 pb-4">
        <Typography variant="label" className="font-mono text-kz-brand-accent">
          {year}
        </Typography>
        <Typography
          variant="cardTitle"
          className="font-bold text-kz-text-heading"
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          className="leading-relaxed text-kz-text-muted"
        >
          {description}
        </Typography>
      </div>
    </div>
  );
};
