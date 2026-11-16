"use client";

import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { ImageBackgroundCard } from "@/components/ui/ImageBackgroundCard";
import { Section } from "@/components/ui/Section";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface FeaturedArticlesProps {
  data: any;
  lang: "fa" | "en";
}

export const FeaturedArticles = ({ data, lang }: FeaturedArticlesProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer
        className="mb-8 flex flex-col items-start justify-center"
        stagger={0.15}
        delay={0.2}
      >
        <MotionItem>
          <Typography
            variant="eyebrow"
            className="mb-2 font-mono uppercase tracking-widest text-kz-brand-accent"
          >
            {data.eyebrow}
          </Typography>
        </MotionItem>
        <MotionItem>
          <Typography
            variant="sectionTitle"
            as="h2"
            className="text-kz-text-heading"
          >
            {data.title}
          </Typography>
        </MotionItem>
      </MotionContainer>

      <MotionContainer
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8"
        stagger={0.15}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const colors = getAlternateColors(index);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <ImageBackgroundCard
                image={item.image}
                alt={item.title}
                tone={colors.tone}
                className="min-h-[360px]"
              >
                <div className="flex h-full flex-col justify-between">
                  {/* Top: Date & Category */}
                  <div className="flex items-center justify-between">
                    <div className="rounded-md bg-kz-bg-surface/60 px-3 py-1 backdrop-blur-md border border-kz-border-subtle/50">
                      <Typography
                        variant="tiny"
                        className="font-mono text-kz-text-heading"
                      >
                        {item.date}
                      </Typography>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border",
                        colors.bg,
                        colors.text,
                        colors.border,
                      )}
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Bottom: Content */}
                  <div className="mt-auto pt-8">
                    <Typography
                      variant="cardTitle"
                      className={cn(
                        "mb-3 text-xl font-bold leading-tight transition-colors duration-300 md:text-2xl",
                        colors.text, // Title color based on alternating switch
                      )}
                    >
                      {item.title}
                    </Typography>

                    <Typography
                      variant="body"
                      className="mb-6 line-clamp-3 text-sm leading-relaxed text-kz-text-body/90"
                    >
                      {item.abstract}
                    </Typography>

                    <div className="flex items-center justify-between border-t border-kz-border-main/40 pt-4">
                      <div className="flex items-center gap-2 text-kz-text-heading">
                        <FileText size={16} className={colors.text} />
                        <Typography variant="label" className="font-medium">
                          {item.author}
                        </Typography>
                      </div>
                      <a
                        href={item.link}
                        className={cn(
                          "flex items-center gap-1 font-semibold transition-all duration-300 hover:gap-2",
                          colors.text,
                        )}
                      >
                        <Typography variant="label" className="text-inherit">
                          {lang === "fa" ? "مطالعه" : "Read"}
                        </Typography>
                        <ArrowIcon size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              </ImageBackgroundCard>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </Section>
  );
};
