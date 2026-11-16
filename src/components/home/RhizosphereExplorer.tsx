"use client";

import Image from "next/image";
import { Microscope } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Badge } from "@/components/ui/Badge";
import { SECTION_CLASS } from "./SectionHeader";
import { cn } from "@/lib/utils";

export const RhizosphereExplorer = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  const isRTL = lang === "fa";

  return (
    <Section className={SECTION_CLASS}>
      <div className="grid w-full grid-cols-1 items-center gap-[clamp(2rem,5vh,4rem)] lg:grid-cols-2">
        {/* ───────── Left: Text & Steps ───────── */}
        <MotionContainer
          className="flex w-full flex-col justify-center"
          stagger={0.15}
          delay={0.2}
        >
          <MotionItem className="mb-4">
            <LiveBadge
              variant="primary"
              className="kz-neo-sm"
              icon={<Microscope size={14} />}
            >
              {data.badge}
            </LiveBadge>
          </MotionItem>

          <MotionItem className="mb-4">
            <Typography
              variant="sectionTitle"
              as="h2"
              className="text-kz-text-heading leading-tight md:text-4xl lg:text-[42px]"
            >
              {data.title}
            </Typography>
          </MotionItem>

          <MotionItem className="mb-8">
            <Typography
              variant="bodyLarge"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {data.subtitle}
            </Typography>
          </MotionItem>

          {/* Steps List */}
          <div className="flex flex-col gap-3">
            {data.steps.map((step: any, idx: number) => (
              <MotionItem key={step.id} variant="fadeUp">
                {/* Glass Card matching TiltCard background & border trick */}
                <div className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-kz-card sm:p-5">
                  {/* 1. Glass Background Layer */}
                  <div className="absolute inset-0 bg-kz-bg-surface/30 backdrop-blur-xl transition-colors duration-300 group-hover:bg-kz-bg-surface/50" />

                  {/* 2. Static Gradient Border */}
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
                  <div className="relative z-20 flex w-full items-start gap-4">
                    {/* Step Number */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-kz-brand-accent/20 bg-kz-brand-accent/10 text-kz-brand-accent shadow-sm">
                      <Typography variant="label" className="font-bold">
                        {step.num}
                      </Typography>
                    </div>

                    {/* Step Content */}
                    <div className="flex flex-col gap-1">
                      <Typography
                        variant="label"
                        className="font-bold text-kz-text-heading"
                      >
                        {step.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="leading-relaxed text-kz-text-muted"
                      >
                        {step.desc}
                      </Typography>
                    </div>
                  </div>
                </div>
              </MotionItem>
            ))}
          </div>
        </MotionContainer>

        {/* ───────── Right: Image Composition ───────── */}
        <MotionContainer stagger={0} delay={0.4} className="w-full">
          <MotionItem variant="fadeUp">
            <TiltCard
              tone="primary"
              maxTilt={3}
              blur={10}
              className="w-full rounded-[2rem]"
              contentClassName="relative aspect-square w-full overflow-hidden rounded-[inherit] p-2 sm:aspect-[4/3] lg:aspect-[5/4]"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-kz-border-subtle/30">
                <Image
                  src={data.image}
                  alt={data.title}
                  fill
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  loading="eager"
                  fetchPriority="low"
                />

                {/* Dark gradient overlay for text legibility at the bottom */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Glass Overlay Box at the bottom */}
                <div className="absolute inset-x-4 bottom-4 z-10 md:inset-x-6 md:bottom-6">
                  <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/20 bg-black/40 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:p-5">
                    <div className="flex flex-col gap-1">
                      <Typography
                        variant="tiny"
                        // Changed font-mono to font-sans to fix Persian font rendering
                        className="font-sans font-medium uppercase tracking-widest text-white/70"
                      >
                        {data.overlayLabel}
                      </Typography>
                      <Typography
                        variant="cardTitle"
                        className="text-lg font-bold text-white md:text-xl"
                      >
                        {data.overlayValue}
                      </Typography>
                    </div>
                    <Badge
                      variant="outline"
                      // Changed font-mono to font-sans for the badge
                      className="shrink-0 border-kz-media-accent/40 bg-kz-media-accent/10 px-3 py-1 text-[10px] tracking-wider text-kz-media-accent"
                    >
                      {data.overlayBadge}
                    </Badge>
                  </div>
                </div>
              </div>
            </TiltCard>
          </MotionItem>
        </MotionContainer>
      </div>
    </Section>
  );
};