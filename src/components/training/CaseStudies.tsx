"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

interface CaseStudiesProps {
  data: any;
  lang: "fa" | "en";
}

export const CaseStudies = ({ data, lang }: CaseStudiesProps) => {
  const isRTL = lang === "fa";

  // Arrow for the "Read Case Study" link
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Arrow for the metric badge (RTL needs UpLeft, LTR needs UpRight)
  const MetricArrow = isRTL ? ArrowUpLeft : ArrowUpRight;

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer
        className="mb-12 flex w-full flex-col items-center justify-center gap-4 text-center"
        stagger={0.15}
        delay={0.2}
      >
        <MotionItem>
          <Typography
            variant="eyebrow"
            className="font-mono uppercase tracking-widest text-kz-brand-accent"
          >
            {data.eyebrow}
          </Typography>
        </MotionItem>
        <MotionItem className="max-w-3xl">
          <Typography
            variant="sectionTitle"
            as="h2"
            className="text-kz-text-heading"
          >
            {data.title}
          </Typography>
        </MotionItem>
        <MotionItem className="max-w-2xl">
          <Typography
            variant="body"
            as="p"
            className="leading-relaxed text-kz-text-muted"
          >
            {data.subtitle}
          </Typography>
        </MotionItem>
      </MotionContainer>

      <MotionContainer
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        stagger={0.15}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const isReversed = index % 2 === 1;

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={isReversed ? "secondary" : "primary"}
                maxTilt={4}
                blur={16} // Standardized glass blur
                className="h-full rounded-[2rem]"
                bgClassName="bg-kz-bg-surface/30" // Standardized glass opacity
                contentClassName="flex h-full flex-col p-6 md:p-8"
              >
                <div
                  className={cn(
                    "flex h-full flex-col gap-8 xl:flex-row xl:items-center",
                    isReversed && "xl:flex-row-reverse",
                  )}
                >
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-kz-border-main/50 bg-kz-bg-surface/20 px-3 py-1 backdrop-blur-md">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isReversed
                            ? "bg-kz-brand-secondary"
                            : "bg-kz-brand-accent",
                        )}
                      />
                      <Typography
                        variant="tiny"
                        className="font-medium text-kz-text-heading"
                      >
                        {item.badge}
                      </Typography>
                    </div>
                    <Typography
                      variant="cardTitle"
                      as="h3"
                      className="mb-3 text-2xl font-bold text-kz-text-heading"
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body"
                      as="p"
                      className="mb-6 flex-grow leading-relaxed text-kz-text-muted"
                    >
                      {item.description}
                    </Typography>
                    <div
                      className={cn(
                        "mb-6 flex items-center justify-between rounded-xl px-4 py-3",
                        isReversed
                          ? "bg-kz-brand-secondary/10 text-kz-brand-secondary"
                          : "bg-kz-brand-accent/10 text-kz-brand-accent",
                      )}
                    >
                      <Typography
                        variant="label"
                        className="font-bold tracking-wide text-inherit"
                      >
                        {item.metric}
                      </Typography>
                      {/* Used MetricArrow here for RTL/LTR support */}
                      <MetricArrow size={18} className="shrink-0" />
                    </div>
                    <a
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-center gap-2 transition-colors",
                        isReversed
                          ? "text-kz-brand-secondary hover:text-kz-brand-secondary-hover"
                          : "text-kz-brand-accent hover:text-kz-brand-accent-hover",
                      )}
                    >
                      <Typography variant="label" className="font-semibold">
                        {item.linkText}
                      </Typography>
                      <ArrowIcon
                        size={16}
                        className="transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                      />
                    </a>
                  </div>
                  <div className="w-full shrink-0 xl:w-[45%]">
                    {/* Changed the image wrapper to glassmorphism */}
                    <div className="relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-kz-border-main/50 bg-kz-bg-surface/20 p-4 shadow-kz-card backdrop-blur-xl md:h-[280px]">
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={400}
                        height={400}
                        className="h-full w-full object-contain transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </TiltCard>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </Section>
  );
};
