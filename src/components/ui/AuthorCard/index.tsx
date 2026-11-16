"use client";

import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Typography from "@/typography";
import { TiltCard } from "@/components/ui/Fx";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface AuthorCardProps {
  index: number;
  name: string;
  role: string;
  initials: string;
  papersCount?: number;
  lang?: "fa" | "en";
  className?: string;
}

export const AuthorCard = ({
  index,
  name,
  role,
  initials,
  papersCount = 12,
  lang = "fa",
  className,
}: AuthorCardProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const colors = getAlternateColors(index);

  return (
    <TiltCard
      tone={colors.tone}
      maxTilt={3}
      blur={16}
      className={cn("h-full rounded-[2rem]", className)}
      bgClassName="bg-kz-bg-surface/30" // Standardized glass opacity
      contentClassName="flex h-full flex-col overflow-hidden rounded-[inherit]"
    >
      {/* ───────── Header / Avatar Area ───────── */}
      <div className="relative flex w-full items-center justify-center bg-gradient-to-b from-kz-bg-surface/20 to-transparent p-6 pb-0">
        <div
          className={cn(
            "absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-500",
            colors.bg.replace("/10", "/20"),
            colors.isGreen
              ? "group-hover:bg-kz-brand-accent/30"
              : "group-hover:bg-kz-brand-secondary/30",
          )}
        />

        <div
          className={cn(
            "relative aspect-square w-full max-w-[180px] overflow-hidden rounded-[1.5rem] border border-kz-border-main/50 shadow-kz-inner backdrop-blur-md",
            "bg-gradient-to-br",
            colors.isGreen
              ? "from-kz-brand-primary/10 to-kz-brand-secondary/10"
              : "from-kz-brand-secondary/10 to-kz-brand-pistachio/10",
          )}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />

          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-5xl font-black tracking-tighter drop-shadow-md",
                colors.text,
              )}
            >
              {initials}
            </span>
          </div>
        </div>
      </div>

      {/* ───────── Info Area ───────── */}
      <div className="flex flex-1 flex-col items-center px-6 py-5 text-center">
        <Typography
          variant="cardTitle"
          className="mb-1 text-xl font-bold text-kz-text-heading"
        >
          {name}
        </Typography>
        <Typography
          variant="caption"
          className={cn("text-sm font-medium", colors.text)}
        >
          {role}
        </Typography>
      </div>

      {/* ───────── Footer Area ───────── */}
      <div className="mt-auto flex items-center justify-between border-t border-kz-border-main/50 bg-kz-bg-surface/20 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-kz-text-muted">
          <FileText size={16} className={colors.text} />
          <Typography variant="tiny" className="font-semibold">
            {papersCount} {isRTL ? "مقاله" : "Papers"}
          </Typography>
        </div>

        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300",
            "bg-kz-bg-surface/30 text-kz-text-heading backdrop-blur-md",
            colors.border.replace("30", "60"),
            colors.isGreen
              ? "hover:border-kz-brand-accent hover:bg-kz-brand-accent/10 hover:text-kz-brand-accent"
              : "hover:border-kz-brand-secondary hover:bg-kz-brand-secondary/10 hover:text-kz-brand-secondary",
          )}
        >
          <span>{isRTL ? "پروفایل" : "Profile"}</span>
          <ArrowIcon
            size={14}
            className="transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1"
          />
        </button>
      </div>
    </TiltCard>
  );
};
