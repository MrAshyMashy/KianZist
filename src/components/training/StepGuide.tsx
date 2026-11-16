"use client";

import { TestTube, Droplets, Sprout, Activity } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = { TestTube, Droplets, Sprout, Activity };

interface StepGuideProps {
  data: any;
  lang: "fa" | "en";
}

export const StepGuide = ({ data, lang }: StepGuideProps) => {
  return (
    <Section className="relative w-full !py-0">
      <MotionContainer
        className="mb-16 flex w-full flex-col items-center justify-center gap-4 text-center"
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
        <MotionItem className="max-w-4xl">
          <Typography
            variant="sectionTitle"
            as="h2"
            className="text-kz-text-heading"
          >
            {data.title}
          </Typography>
        </MotionItem>
        <MotionItem className="max-w-3xl">
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
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {data.items.map((item: any, i: number) => {
          const Icon = iconMap[item.icon] || TestTube;
          const colors = getAlternateColors(i);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={colors.tone}
                maxTilt={6}
                blur={4}
                className="h-full rounded-[2rem]"
                contentClassName="flex h-full flex-col p-6"
              >
                <div className="mb-6 flex items-center justify-between">
                  <IconBox
                    tone={colors.tone}
                    size="sm"
                    shape="circle"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    <Typography
                      variant="label"
                      className={cn("font-semibold", colors.text)}
                    >
                      {item.step}
                    </Typography>
                  </IconBox>
                  <div style={{ transform: "translateZ(15px)" }}>
                    <Typography
                      variant="tiny"
                      className="font-mono uppercase tracking-widest text-kz-text-muted"
                    >
                      {item.time}
                    </Typography>
                  </div>
                </div>
                <div
                  className="mb-6 flex-grow"
                  style={{ transform: "translateZ(25px)" }}
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
                  className={cn("mt-auto flex items-center gap-2", colors.text)}
                  style={{ transform: "translateZ(15px)" }}
                >
                  <Icon size={16} className="shrink-0" />
                  <Typography variant="label" className="font-medium">
                    {item.footerText}
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
