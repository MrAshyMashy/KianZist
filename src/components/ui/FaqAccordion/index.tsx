"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import Typography from "@/typography";
import { GlassBase } from "@/components/ui/GlassBase";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

export const FaqAccordion = ({ items, className }: FaqAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={cn("relative w-full rounded-[2rem]", className)}>
      <GlassBase
        variant="transparent" // Using transparent to override the solid default
        className="relative w-full rounded-[inherit] border border-kz-border-main/50 bg-kz-bg-surface/30 backdrop-blur-2xl p-2 sm:p-4 shadow-kz-card"
      >
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          const colors = getAlternateColors(index);

          return (
            <div
              key={item.id}
              className={cn(
                "group border-kz-border-subtle/30 transition-colors",
                index !== items.length - 1 && "border-b",
              )}
            >
              <button
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 px-4 py-5 text-start outline-none transition-colors hover:bg-kz-bg-surface/20 rounded-xl focus-visible:bg-kz-bg-sunken/50 sm:px-6"
              >
                <Typography
                  variant="bodyMedium"
                  className={cn(
                    "font-semibold transition-colors",
                    isOpen
                      ? colors.text
                      : "text-kz-text-heading group-hover:text-kz-brand-accent",
                  )}
                >
                  {item.question}
                </Typography>

                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    isOpen
                      ? cn(
                          colors.border,
                          "bg-kz-bg-surface/50 backdrop-blur-md",
                          colors.text,
                        )
                      : "border-kz-border-main/50 bg-kz-bg-surface/30 backdrop-blur-md text-kz-text-muted group-hover:border-kz-brand-accent/50 group-hover:text-kz-brand-accent",
                  )}
                >
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </div>
              </button>

              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <Typography
                    variant="body"
                    as="p"
                    className="px-4 pb-6 leading-relaxed text-kz-text-muted sm:px-6"
                  >
                    {item.answer}
                  </Typography>
                </div>
              </div>
            </div>
          );
        })}
      </GlassBase>

      {/* Gradient Border Overlay (matches the TiltCard style) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-kz-brand-gradient opacity-20"
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
