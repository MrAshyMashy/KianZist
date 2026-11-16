"use client";

import { Quote } from "lucide-react";
import Typography from "@/typography";
import { GlassSurface } from "@/components/ui/GlassSurface";

interface QuoteBlockProps {
  text: string;
  author: string;
  role?: string;
}

export const QuoteBlock = ({ text, author, role }: QuoteBlockProps) => {
  return (
    <GlassSurface
      variant="medium"
      className="relative overflow-hidden rounded-[2rem] border-kz-brand-accent/20 p-8 md:p-12"
    >
      <Quote
        size={80}
        className="absolute -right-4 -top-4 text-kz-brand-accent/5 rtl:-left-4 rtl:right-auto rtl:scale-x-[-1]"
      />
      <div className="relative z-10">
        <Typography
          variant="bodyLarge"
          as="p"
          className="mb-6 font-medium italic leading-relaxed text-kz-text-heading"
        >
          "{text}"
        </Typography>
        <div className="flex flex-col">
          <Typography
            variant="cardTitle"
            className="font-bold text-kz-brand-accent"
          >
            {author}
          </Typography>
          {role && (
            <Typography variant="caption" className="text-kz-text-muted">
              {role}
            </Typography>
          )}
        </div>
      </div>
    </GlassSurface>
  );
};
