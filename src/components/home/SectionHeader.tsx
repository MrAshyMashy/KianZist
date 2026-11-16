"use client";

import { ReactNode } from "react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { cn } from "@/lib/utils";

/**
 * Shared <Section> classes:
 * Mobile: Small padding for breathing room (py-12)
 * Tablet: Medium padding (md:py-16)
 * Desktop: Fills the snap slot (lg:h-full  lg:py-0)
 */
export const SECTION_CLASS = "py-12 md:py-16 lg:min-h-0 lg:h-full lg:py-0";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
  action?: ReactNode;
  className?: string;
}

export const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  align = "start",
  action,
  className,
}: SectionHeaderProps) => {
  const center = align === "center";
  return (
    <MotionContainer
      className={cn(
        "mb-4 flex w-full gap-4",
        center
          ? "flex-col items-center text-center"
          : "flex-col justify-between lg:flex-row lg:items-end",
        className,
      )}
      stagger={0.12}
      delay={0.15}
    >
      <div
        className={cn(
          "flex w-full max-w-3xl flex-col",
          center ? "items-center" : "items-start",
        )}
      >
        {eyebrow && (
          <MotionItem className="mb-[clamp(0.4rem,1.2vh,0.75rem)]">
            {/* Replaced the manual span with LiveBadge for animation & shadow */}
            <LiveBadge variant="primary" className="kz-neo-sm">
              {eyebrow}
            </LiveBadge>
          </MotionItem>
        )}
        <MotionItem>
          <Typography
            variant="sectionTitle"
            as="h2"
            className="text-kz-text-heading"
          >
            {title}
          </Typography>
        </MotionItem>
        {subtitle && (
          <MotionItem className="mt-[clamp(0.35rem,1vh,0.6rem)]">
            <Typography
              variant="body"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {subtitle}
            </Typography>
          </MotionItem>
        )}
      </div>
      {action && (
        <MotionItem className="shrink-0 self-start lg:self-auto">
          {action}
        </MotionItem>
      )}
    </MotionContainer>
  );
};
