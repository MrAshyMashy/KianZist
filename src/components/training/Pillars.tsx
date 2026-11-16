"use client";

import {
  FlaskConical,
  Dna,
  Leaf,
  Droplets,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";

const iconMap: Record<string, any> = { FlaskConical, Dna, Leaf, Droplets };

interface PillarsProps {
  data: any;
  lang: "fa" | "en";
}

export const Pillars = ({ data, lang }: PillarsProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

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
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {data.items.map((item: any, i: number) => {
          const Icon = iconMap[item.icon] || Dna;
          const colors = getAlternateColors(i);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={colors.tone}
                maxTilt={6}
                blur={4}
                className="h-full rounded-[2rem]"
                contentClassName="flex h-full flex-col p-7"
              >
                <div className="mb-6 flex items-start justify-between">
                  <IconBox
                    tone={colors.tone}
                    size="md"
                    style={{ transform: "translateZ(32px)" }}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                  </IconBox>
                  <div style={{ transform: "translateZ(18px)" }}>
                    <Typography
                      variant="tiny"
                      className={`font-mono uppercase tracking-widest ${colors.text} opacity-80`}
                    >
                      {item.pillarLabel}
                    </Typography>
                  </div>
                </div>
                <div
                  className="mb-8 flex-grow"
                  style={{ transform: "translateZ(24px)" }}
                >
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-3 text-kz-text-heading"
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    as="p"
                    className="leading-relaxed text-kz-text-muted"
                  >
                    {item.description}
                  </Typography>
                </div>
                <div
                  className="group mt-auto cursor-pointer"
                  style={{ transform: "translateZ(16px)" }}
                >
                  <div
                    className={`flex items-center gap-2 ${colors.text} transition-colors duration-300 hover:opacity-80`}
                  >
                    <Typography
                      variant="label"
                      className="font-semibold tracking-wide"
                    >
                      {item.linkText}
                    </Typography>
                    <ArrowIcon
                      size={16}
                      className="transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                    />
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
