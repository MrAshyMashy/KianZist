"use client";

import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Typography from "@/typography";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  lang?: "fa" | "en";
  className?: string;
}

export const Breadcrumb = ({
  items,
  lang = "fa",
  className,
}: BreadcrumbProps) => {
  const isRTL = lang === "fa";
  const Separator = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav
      className={cn("flex items-center gap-2 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-kz-text-muted transition-colors hover:text-kz-brand-accent"
              >
                <Typography variant="caption">{item.label}</Typography>
              </Link>
            ) : (
              <Typography
                variant="caption"
                className={cn(
                  "font-semibold",
                  isLast ? "text-kz-text-heading" : "text-kz-text-muted",
                )}
              >
                {item.label}
              </Typography>
            )}
            {!isLast && (
              <Separator size={14} className="text-kz-border-strong" />
            )}
          </div>
        );
      })}
    </nav>
  );
};
