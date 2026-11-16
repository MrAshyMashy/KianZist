"use client";

import Image from "next/image";
import {
  Sprout,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { IconBox } from "@/components/ui/IconBox";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";
import { SECTION_CLASS } from "./SectionHeader";

const iconMap: Record<string, any> = {
  Sprout,
  TrendingDown,
  ShieldCheck,
};

export const FieldEvidence = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Section className={SECTION_CLASS}>
      <div className="grid w-full grid-cols-1 items-center gap-[clamp(2rem,5vh,4rem)] lg:grid-cols-2">
        {/* Right: Text & Stats */}
        <MotionContainer
          className="flex w-full flex-col justify-center lg:order-1"
          stagger={0.15}
          delay={0.2}
        >
          <MotionItem className="mb-4">
            <LiveBadge variant="primary">{data.badge}</LiveBadge>
          </MotionItem>

          <MotionItem className="mb-6">
            <Typography
              variant="sectionTitle"
              as="h2"
              className="text-kz-text-heading leading-tight"
            >
              {data.title}
            </Typography>
          </MotionItem>

          <MotionItem className="mb-8">
            <Typography
              variant="body"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {data.subtitle}
            </Typography>
          </MotionItem>

          <div className="flex flex-col gap-4">
            {data.stats.map((stat: any, idx: number) => {
              const Icon = iconMap[stat.icon] || Sprout;
              const colors = getAlternateColors(idx);

              return (
                <MotionItem key={stat.id} variant="fadeUp">
                  {/* ───────── Exact TiltCard Glass & Border Structure (As a Link) ───────── */}
                  <a
                    href="#"
                    className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-kz-card"
                  >
                    {/* 1. Glass Background Layer */}
                    <div className="absolute inset-0 bg-kz-bg-surface/30 backdrop-blur-xl transition-colors duration-300 group-hover:bg-kz-bg-surface/50" />

                    {/* 2. Static Gradient Border (The hidden layer trick) */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-kz-brand-gradient opacity-[0.14] dark:opacity-[0.22]"
                      style={{
                        padding: 1,
                        WebkitMask:
                          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                      }}
                    />

                    {/* 3. Content Layer */}
                    <div className="relative z-20 flex w-full items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <IconBox
                          tone={colors.tone}
                          size="sm"
                          shape="square"
                          className="bg-kz-bg-surface/50 backdrop-blur-md"
                        >
                          <Icon size={18} />
                        </IconBox>
                        <Typography
                          variant="label"
                          className="text-kz-text-heading"
                        >
                          {stat.title}
                        </Typography>
                      </div>
                      <div className="flex items-center gap-2">
                        <Typography
                          variant="tiny"
                          className={cn("font-bold", colors.text)}
                        >
                          {stat.value}
                        </Typography>
                        <ArrowIcon
                          size={14}
                          className={cn(
                            "opacity-0 transition-all duration-300 group-hover:opacity-100 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1",
                            colors.text,
                          )}
                        />
                      </div>
                    </div>
                  </a>
                </MotionItem>
              );
            })}
          </div>
        </MotionContainer>

        {/* Left: Image Composition */}
        <MotionContainer stagger={0} delay={0.3} className="w-full lg:order-2">
          <MotionItem variant="fadeUp">
            <TiltCard
              tone="primary"
              maxTilt={3}
              blur={10}
              className="w-full rounded-[2rem]"
              contentClassName="relative aspect-[4/3] w-full overflow-hidden rounded-[inherit] p-2"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-kz-border-subtle/30">
                <Image
                  src="/images/field-before.png"
                  alt="Degraded Soil"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  loading="eager"
                  fetchPriority="low"
                />

                {/* Clipped Image (Right Half) */}
                <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden shadow-[-10px_0_20px_rgba(0,0,0,0.15)]">
                  <div className="relative h-full w-[200%] ltr:right-0 rtl:left-0">
                    <Image
                      src="/images/field-after.png"
                      alt="Restored Orchard"
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      loading="eager"
                      fetchPriority="low"
                    />
                  </div>
                </div>

                {/* ───────── Crisp White Divider ───────── */}
                <div className="absolute inset-y-0 left-1/2 z-10 w-[2px] -translate-x-1/2 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.3)]" />

                <div className="absolute left-4 top-4 z-10">
                  <LiveBadge
                    variant="glass"
                    className="border-none bg-white/80 px-3 py-1 text-[11px] text-red-600 shadow-sm backdrop-blur-md"
                    icon={<span className="h-2 w-2 rounded-full bg-red-500" />}
                  >
                    {isRTL ? "تنش شوری شدید" : "Severe Salt Stress"}
                  </LiveBadge>
                </div>
                <div className="absolute right-4 top-4 z-10">
                  <LiveBadge
                    variant="glass"
                    className="border-none bg-white/80 px-3 py-1 text-[11px] text-emerald-600 shadow-sm backdrop-blur-md"
                    icon={
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    }
                  >
                    {isRTL ? "باغ احیاشده" : "Bio-Enhanced Orchard"}
                  </LiveBadge>
                </div>
              </div>
            </TiltCard>
          </MotionItem>
        </MotionContainer>
      </div>
    </Section>
  );
};
