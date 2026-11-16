"use client";

import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Typography from "@/typography";
import { TiltCard } from "@/components/ui/Fx";
import { Button } from "@/components/ui/Button";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface ArticleListRowProps {
  index: number;
  title: string;
  abstract: string;
  date: string;
  category: string;
  author: string;
  lang?: "fa" | "en";
}

export const ArticleListRow = ({
  index,
  title,
  abstract,
  date,
  category,
  author,
  lang = "fa",
}: ArticleListRowProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const colors = getAlternateColors(index);

  return (
    <TiltCard
      tone={colors.tone}
      maxTilt={2} // Subtle tilt for a list item
      blur={16}
      className="w-full rounded-2xl"
      bgClassName="bg-kz-bg-surface/30" // Standardized glass opacity
      contentClassName="group flex w-full flex-col gap-4 p-6 transition-all duration-300 lg:flex-row lg:items-center lg:gap-8"
    >
      {/* Meta (Right side in RTL) */}
      <div className="flex shrink-0 flex-col gap-1.5 lg:w-40 lg:border-e lg:border-kz-border-subtle/50 lg:pe-8">
        <Typography
          variant="caption"
          className={cn(
            "font-mono font-semibold uppercase tracking-wider",
            colors.text,
          )}
        >
          {category}
        </Typography>
        <Typography variant="tiny" className="text-kz-text-muted">
          {date}
        </Typography>
      </div>

      {/* Content (Middle) */}
      <div className="flex flex-1 flex-col gap-2">
        <Typography
          variant="cardTitle"
          className={cn(
            "text-base font-bold text-kz-text-heading transition-colors",
            `group-hover:${colors.text}`,
          )}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          className="line-clamp-2 leading-relaxed text-kz-text-muted"
        >
          {abstract}
        </Typography>
      </div>

      {/* Author & Action (Left side in RTL) */}
      <div className="flex shrink-0 items-center justify-between gap-6 lg:w-48 lg:flex-col lg:items-end lg:justify-center lg:border-s lg:border-kz-border-subtle/50 lg:ps-8">
        <div className="flex flex-col items-end text-end">
          <Typography variant="tiny" className="text-kz-text-muted">
            {isRTL ? "نویسنده" : "Author"}
          </Typography>
          <Typography
            variant="label"
            className="font-semibold text-kz-text-heading"
          >
            {author}
          </Typography>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 px-0 hover:bg-transparent lg:mt-2",
            colors.text,
            colors.isGreen
              ? "hover:text-kz-brand-primary-hover"
              : "hover:text-kz-brand-secondary-hover",
          )}
        >
          <FileText size={16} />
          <Typography variant="caption" className="font-bold text-inherit">
            {isRTL ? "مطالعه" : "Read"}
          </Typography>
          <ArrowIcon
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        </Button>
      </div>
    </TiltCard>
  );
};
