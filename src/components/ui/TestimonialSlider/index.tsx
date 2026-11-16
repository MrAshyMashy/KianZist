"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import Typography from "@/typography";
import { GlassBase } from "@/components/ui/GlassBase";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
}

interface TestimonialSliderProps {
  items: Testimonial[];
  lang?: "fa" | "en";
  className?: string;
}

export const TestimonialSlider = ({
  items,
  lang = "fa",
  className,
}: TestimonialSliderProps) => {
  const [current, setCurrent] = useState(0);
  const isRTL = lang === "fa";

  const next = () => setCurrent((prev) => (prev + 1) % items.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      <GlassBase
        variant="medium"
        className="relative overflow-hidden rounded-[2.5rem] border-kz-brand-accent/20 p-8 md:p-12"
      >
        <Quote
          size={80}
          className="absolute -right-4 -top-4 text-kz-brand-accent/10 rtl:-left-4 rtl:right-auto rtl:scale-x-[-1]"
        />

        <div className="relative z-10 min-h-[200px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col gap-6"
            >
              <Typography
                variant="bodyLarge"
                as="p"
                className="font-medium italic leading-relaxed text-kz-text-heading md:text-xl"
              >
                "{items[current].text}"
              </Typography>

              <div className="flex flex-col">
                <Typography
                  variant="cardTitle"
                  className="font-bold text-kz-brand-accent"
                >
                  {items[current].author}
                </Typography>
                <Typography variant="caption" className="text-kz-text-muted">
                  {items[current].role}
                </Typography>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-kz-border-subtle/50 pt-6">
          <div className="flex gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  current === idx
                    ? "w-8 bg-kz-brand-accent"
                    : "w-2 bg-kz-border-strong hover:bg-kz-text-muted",
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <IconButton onClick={prev} className="h-10 w-10">
              {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </IconButton>
            <IconButton onClick={next} className="h-10 w-10">
              {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </IconButton>
          </div>
        </div>
      </GlassBase>
    </div>
  );
};
