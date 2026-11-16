"use client";

import { Dna, FlaskConical, Timer, Snowflake } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";

const iconMap: Record<string, any> = {
  Dna,
  FlaskConical,
  Timer,
  Snowflake,
};

interface VerificationProtocolProps {
  data: any;
  lang: "fa" | "en";
}

export const VerificationProtocol = ({ data }: VerificationProtocolProps) => {
  return (
    <Section className="relative w-full !py-0">
      {/* ───────── Header ───────── */}
      <MotionContainer
        className="mb-10 flex flex-col items-center justify-center text-center"
        stagger={0.15}
        delay={0.2}
      >
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
            className="max-w-2xl text-kz-text-heading"
          >
            {data.title}
          </Typography>
        </MotionItem>
      </MotionContainer>

      {/* ───────── Cards Grid ───────── */}
      <MotionContainer
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const Icon = iconMap[item.icon] || Dna;
          const colors = getAlternateColors(index);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={colors.tone}
                maxTilt={4}
                blur={4}
                className="h-full rounded-[2rem]"
                bgClassName="bg-kz-bg-surface/60"
                contentClassName="flex h-full flex-col items-center p-6 text-center md:p-8"
              >
                <IconBox
                  tone={colors.tone}
                  size="lg"
                  className="mb-5"
                  style={{ transform: "translateZ(25px)" }}
                >
                  <Icon size={26} strokeWidth={1.5} />
                </IconBox>

                <div style={{ transform: "translateZ(15px)" }}>
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-3 text-lg font-bold text-kz-text-heading"
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
              </TiltCard>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </Section>
  );
};
