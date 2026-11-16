"use client";

import Image from "next/image";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

export const Formulations = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  return (
    <Section className={SECTION_CLASS}>
      <SectionHeader
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        action={
          <LiveBadge variant="primary" className="bg-kz-brand-accent/5">
            {data.badge}
          </LiveBadge>
        }
      />

      <MotionContainer
        className="grid grid-cols-1 gap-[var(--kz-grid-gap)] lg:grid-cols-2"
        stagger={0.15}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const colors = getAlternateColors(index);

          return (
            <MotionItem
              key={item.id}
              variant="fadeUp"
              className="h-full"
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltCard
                tone={colors.tone}
                maxTilt={3}
                blur={6}
                className="h-full rounded-[2rem]"
                contentClassName="flex h-full flex-col p-[calc(var(--kz-card-pad)*0.8)]"
              >
                <div className="flex h-full flex-col gap-[var(--kz-block-gap)] lg:flex-row rtl:lg:flex-row-reverse">
                  {/* ── Image ── */}
                  <div className="relative flex w-full shrink-0 flex-col items-center justify-center rounded-2xl border border-kz-border-main bg-kz-bg-elevated/60 p-3 shadow-kz-inner lg:w-[40%]">
                    <div className="relative w-full overflow-hidden rounded-xl">
                      <Image
                        src={item.image}
                        alt={item.name + " " + item.nameHighlight}
                        width={400}
                        height={400}
                        className="mx-auto h-auto w-full max-w-[clamp(110px,24vh,200px)] rounded-xl object-contain drop-shadow-md"
                        priority={false}
                      />
                    </div>
                    <div className="mt-3 w-full rounded-full border border-kz-border-main bg-kz-bg-sunken/80 py-1 text-center">
                      <Typography
                        variant="tiny"
                        className="font-mono font-medium text-kz-text-heading"
                      >
                        {item.cfu}
                      </Typography>
                    </div>
                  </div>

                  {/* ── Content ── */}
                  <div className="flex min-w-0 flex-grow flex-col">
                    <Typography
                      variant="eyebrow"
                      className={cn("mb-1 font-medium", colors.text)}
                    >
                      {item.eyebrow}
                    </Typography>

                    <Typography
                      variant="sectionTitle"
                      as="h3"
                      className="mb-2 text-kz-text-heading"
                    >
                      {item.name}{" "}
                      <span className={colors.text}>{item.nameHighlight}</span>
                    </Typography>

                    <Typography
                      variant="body"
                      as="p"
                      className="mb-[var(--kz-block-gap)] line-clamp-2 leading-relaxed text-kz-text-muted"
                    >
                      {item.description}
                    </Typography>

                    <div className="mb-[var(--kz-block-gap)] mt-auto flex flex-col gap-2 rounded-xl border border-kz-border-main bg-kz-bg-sunken/50 p-3">
                      {item.specs.map((spec: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 border-b border-kz-border-subtle pb-1.5 last:border-0 last:pb-0"
                        >
                          <Typography
                            variant="caption"
                            className="text-kz-text-muted"
                          >
                            {spec.label}
                          </Typography>
                          <Typography
                            variant="label"
                            className={cn("font-medium", colors.text)}
                          >
                            {spec.value}
                          </Typography>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-end">
                      <Button
                        variant={colors.isGreen ? "primary" : "blue"}
                        size="sm"
                        className={cn(
                          "rounded-full px-6 transition-shadow duration-300",
                          colors.shadow,
                        )}
                      >
                        <Download
                          size={16}
                          className={
                            colors.isGreen
                              ? "text-kz-brand-primaryText"
                              : "text-white"
                          }
                        />
                        <Typography
                          variant="button"
                          as="span"
                          className={
                            colors.isGreen
                              ? "text-kz-brand-primaryText"
                              : "text-white"
                          }
                        >
                          {item.buttonText}
                        </Typography>
                      </Button>
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
