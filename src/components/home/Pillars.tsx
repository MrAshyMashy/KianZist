"use client";

import {
  FlaskConical,
  Microscope,
  Dna,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

const iconMap: Record<string, any> = {
  FlaskConical,
  Microscope,
  Dna,
  ShieldCheck,
};

export const Pillars = ({ data, lang }: { data: any; lang: "fa" | "en" }) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Section className={SECTION_CLASS}>
      <SectionHeader
        align="center"
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
      />

      <MotionContainer
        className="grid grid-cols-1 gap-[var(--kz-grid-gap)] md:grid-cols-2 xl:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {data.items.map((item: any, i: number) => {
          const Icon = iconMap[item.icon] || FlaskConical;
          const colors = getAlternateColors(i);

          return (
            <MotionItem
              key={item.id}
              variant="fadeUp"
              className="h-full"
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltCard
                tone={colors.tone}
                maxTilt={5}
                blur={6}
                className="h-full rounded-[2rem]"
                contentClassName="flex h-full flex-col p-[var(--kz-card-pad)]"
              >
                <div className="mb-[var(--kz-block-gap)] flex items-start justify-between">
                  <IconBox
                    tone={colors.tone}
                    size="md"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                  </IconBox>

                  <div style={{ transform: "translateZ(16px)" }}>
                    <Typography
                      variant="tiny"
                      className={`font-medium ${colors.text} opacity-80`}
                    >
                      {item.pillarLabel}
                    </Typography>
                  </div>
                </div>

                <div
                  className="mb-[var(--kz-block-gap)] flex-grow"
                  style={{ transform: "translateZ(22px)" }}
                >
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-2 font-medium text-kz-text-heading"
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
                  className="group mt-auto cursor-pointer border-t border-kz-border-subtle pt-[clamp(0.5rem,1.4vh,0.9rem)]"
                  style={{ transform: "translateZ(14px)" }}
                >
                  <div
                    className={`flex items-center gap-2 ${colors.text} transition-opacity duration-300 hover:opacity-80`}
                  >
                    <Typography variant="label" className="font-medium">
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