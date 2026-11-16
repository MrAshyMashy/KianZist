"use client";

import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { SearchHeroWidget } from "@/components/ui/SearchHeroWidget";
import { MetricBlock } from "@/components/ui/MetricBlock";
import { Section } from "@/components/ui/Section";
import { BookOpen, FileText, Quote, Globe, Award } from "lucide-react";

// Map string names from data to actual icon components
const iconMap: Record<string, any> = {
  FileText,
  Quote,
  Globe,
  Award,
};

interface PublicationsHeroProps {
  data: any;
  lang: "fa" | "en"; // Added lang prop
}

export const PublicationsHero = ({ data, lang }: PublicationsHeroProps) => {
  const { hero, metrics } = data;

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer
        className="flex w-full flex-col items-center justify-center gap-8 text-center"
        stagger={0.15}
        delay={0.2}
      >
        <MotionItem>
          <div className="inline-flex items-center gap-2 rounded-full border border-kz-brand-accent/30 bg-kz-brand-accent/10 px-4 py-1.5 text-kz-brand-accent shadow-kz-glow-accent">
            <BookOpen size={16} />
            <Typography
              variant="tiny"
              className="font-mono uppercase tracking-widest text-inherit"
            >
              {hero.badge}
            </Typography>
          </div>
        </MotionItem>

        <MotionItem className="max-w-4xl">
          <Typography
            variant="display"
            as="h1"
            className="mb-4 text-kz-text-heading"
          >
            {hero.title}
          </Typography>
          <Typography
            variant="bodyLarge"
            as="p"
            className="mx-auto max-w-2xl leading-relaxed text-kz-text-muted"
          >
            {hero.subtitle}
          </Typography>
        </MotionItem>

        <MotionItem className="mt-4 flex w-full justify-center">
          <SearchHeroWidget
            placeholder={hero.searchPlaceholder}
            tags={hero.tags}
            lang={lang} // Passed lang here
          />
        </MotionItem>

        <MotionItem className="mt-8 w-full max-w-5xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric: any, idx: number) => {
              const Icon = iconMap[metric.icon] || FileText;

              return (
                <MetricBlock
                  key={idx}
                  index={idx}
                  value={metric.value}
                  label={metric.label}
                  icon={<Icon size={22} strokeWidth={1.5} />}
                />
              );
            })}
          </div>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
