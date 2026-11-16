"use client";

import { Radar, Zap, Network, ShieldCheck } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

const iconMap: Record<string, any> = {
  sensors: Radar,
  bolt: Zap,
  account_tree: Network,
  Shield: ShieldCheck,
  Radar,
  Zap,
  Network,
  ShieldCheck,
};

export const Chronology = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  return (
    <Section className={SECTION_CLASS}>
      <SectionHeader
        align="center"
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
      />

      <MotionContainer
        className="relative grid grid-cols-1 gap-[var(--kz-grid-gap)] md:grid-cols-2 lg:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {/* connector line behind the cards (desktop) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-[calc(var(--kz-card-pad)+1rem)] hidden h-px bg-gradient-to-r from-transparent via-kz-brand-accent/30 to-transparent lg:block"
        />

        {data.items.map((item: any, i: number) => {
          const Icon = iconMap[item.icon] || Radar;
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
                <div className="mb-[var(--kz-block-gap)] flex items-center justify-between">
                  <IconBox
                    tone={colors.tone}
                    size="sm"
                    shape="circle"
                    style={{ transform: "translateZ(28px)" }}
                  >
                    <Typography
                      variant="label"
                      className={cn("font-semibold", colors.text)}
                    >
                      {item.step}
                    </Typography>
                  </IconBox>

                  <div
                    className="rounded-full border border-kz-border-main bg-kz-bg-sunken/60 px-2.5 py-0.5"
                    style={{ transform: "translateZ(14px)" }}
                  >
                    <Typography
                      variant="tiny"
                      className="font-medium text-kz-text-muted"
                    >
                      {item.time}
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
                  className={cn(
                    "mt-auto flex items-center gap-2 border-t border-kz-border-subtle pt-[clamp(0.5rem,1.4vh,0.9rem)]",
                    colors.text,
                  )}
                  style={{ transform: "translateZ(14px)" }}
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
