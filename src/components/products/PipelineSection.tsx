"use client";

import {
  ShieldCheck,
  FlaskConical,
  Droplets,
  ArrowRight,
  ArrowLeft,
  Activity,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { Section } from "@/components/ui/Section";
import { TiltCard, Magnetic } from "@/components/ui/Fx";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  ShieldCheck,
  FlaskConical,
  Droplets,
  Activity,
};

interface PipelineSectionProps {
  data: any;
  lang: "fa" | "en";
}

export const PipelineSection = ({ data, lang }: PipelineSectionProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Section className="relative w-full !py-0">
      {/* Header */}
      <MotionContainer
        className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        stagger={0.15}
        delay={0.2}
      >
        <div className="max-w-3xl">
          <MotionItem className="mb-3">
            <Typography
              variant="eyebrow"
              className="font-mono uppercase tracking-widest text-kz-brand-accent"
            >
              {data.eyebrow}
            </Typography>
          </MotionItem>
          <MotionItem>
            <Typography
              variant="sectionTitle"
              as="h2"
              className="text-2xl font-bold text-kz-text-heading md:text-3xl xl:text-4xl"
            >
              {data.title}
            </Typography>
          </MotionItem>
        </div>
        <MotionItem className="flex shrink-0">
          <LiveBadge
            variant="primary"
            className="border-kz-brand-accent/30 bg-kz-brand-accent/5"
          >
            {data.badge}
          </LiveBadge>
        </MotionItem>
      </MotionContainer>

      {/* Cards Grid */}
      <MotionContainer
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        stagger={0.12}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const Icon = iconMap[item.icon] || Activity;
          const colors = getAlternateColors(index);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={colors.tone}
                maxTilt={4}
                blur={4}
                className="h-full rounded-[2rem]"
                bgClassName="bg-kz-bg-surface/60"
                contentClassName="flex h-full flex-col p-6 md:p-8"
              >
                {/* Top Meta */}
                <div className="mb-6 flex items-center justify-between">
                  <div
                    className={cn(
                      "rounded-full border px-3 py-1",
                      colors.bg,
                      colors.border,
                    )}
                  >
                    <Typography
                      variant="tiny"
                      className={cn(
                        "font-bold uppercase tracking-wider",
                        colors.text,
                      )}
                    >
                      {item.stage}
                    </Typography>
                  </div>
                  <Typography
                    variant="tiny"
                    className="font-mono text-kz-text-muted"
                  >
                    {item.refCode}
                  </Typography>
                </div>

                {/* Dynamic IconBox */}
                <IconBox
                  tone={colors.tone}
                  size="md"
                  className="mb-6"
                  style={{ transform: "translateZ(20px)" }}
                >
                  <Icon size={24} strokeWidth={1.5} />
                </IconBox>

                {/* Content */}
                <div
                  className="mb-8 flex-grow"
                  style={{ transform: "translateZ(15px)" }}
                >
                  <Typography
                    variant="tiny"
                    className="mb-2 block font-medium tracking-wide text-kz-text-muted"
                  >
                    {item.tag}
                  </Typography>

                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Typography
                      variant="cardTitle"
                      as="h3"
                      className="text-kz-text-heading"
                    >
                      {item.title}
                    </Typography>
                    {item.titleEn && (
                      <Typography
                        variant="bodyMedium"
                        className="font-mono text-sm text-kz-text-muted"
                        dir="ltr"
                      >
                        {item.titleEn}
                      </Typography>
                    )}
                  </div>

                  <Typography
                    variant="caption"
                    as="p"
                    className="leading-relaxed text-kz-text-muted"
                  >
                    {item.description}
                  </Typography>
                </div>

                {/* Footer */}
                <div
                  className="mt-auto flex flex-col gap-4 border-t border-kz-border-subtle/50 pt-4 sm:flex-row sm:items-end sm:justify-between"
                  style={{ transform: "translateZ(25px)" }}
                >
                  <div className="flex flex-col gap-1">
                    <Typography
                      variant="tiny"
                      className="uppercase tracking-wider text-kz-text-muted"
                    >
                      {isRTL ? "نتیجه کلیدی" : "KEY METRIC"}
                    </Typography>
                    <Typography
                      variant="label"
                      className={cn("font-bold", colors.text)}
                    >
                      {item.featureValue}
                    </Typography>
                  </div>

                  <Magnetic strength={0.2}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "group w-fit gap-1 rounded-full px-0 hover:bg-transparent",
                        colors.text,
                        colors.isGreen
                          ? "hover:text-kz-brand-primary-hover"
                          : "hover:text-kz-brand-secondary-hover",
                      )}
                    >
                      <Typography
                        variant="label"
                        className="font-semibold whitespace-nowrap"
                      >
                        {item.btnLink}
                      </Typography>
                      <ArrowIcon
                        size={16}
                        className="shrink-0 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                      />
                    </Button>
                  </Magnetic>
                </div>
              </TiltCard>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </Section>
  );
};
