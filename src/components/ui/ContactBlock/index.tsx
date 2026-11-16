"use client";

import { ReactNode } from "react";
import Typography from "@/typography";
import { GlassSurface } from "@/components/ui/GlassSurface";

interface ContactBlockProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export const ContactBlock = ({ icon, label, value }: ContactBlockProps) => {
  return (
    <GlassSurface
      variant="light"
      className="flex flex-col items-center gap-2 rounded-2xl border-kz-border-subtle/50 p-6 text-center transition-colors hover:border-kz-brand-accent/30"
    >
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-kz-brand-accent/10 text-kz-brand-accent">
        {icon}
      </div>
      <Typography
        variant="caption"
        className="text-kz-text-muted uppercase tracking-wider"
      >
        {label}
      </Typography>
      <Typography
        variant="bodyMedium"
        className="font-semibold text-kz-text-heading"
        dir="ltr"
      >
        {value}
      </Typography>
    </GlassSurface>
  );
};
