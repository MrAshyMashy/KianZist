"use client";

import Image from "next/image";
import { Leaf } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SECTION_CLASS } from "./SectionHeader";

export const FermentationHub = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  const isRTL = lang === "fa";

  return (
    <Section className={SECTION_CLASS}>
      {/* Header */}
      <MotionContainer
        className="mb-[var(--kz-sec-gap)] flex w-full flex-col items-center justify-center gap-4 text-center"
        stagger={0.15}
        delay={0.2}
      >
        <MotionItem>
          <LiveBadge variant="primary" icon={<Leaf size={14} />}>
            {data.badge}
          </LiveBadge>
        </MotionItem>
        <MotionItem className="max-w-4xl">
          <Typography
            variant="sectionTitle"
            as="h2"
            className="text-kz-text-heading md:text-4xl lg:text-[42px]"
          >
            {data.title}
          </Typography>
        </MotionItem>
        <MotionItem className="max-w-3xl">
          <Typography
            variant="bodyLarge"
            as="p"
            className="leading-relaxed text-kz-text-muted"
          >
            {data.subtitle}
          </Typography>
        </MotionItem>
      </MotionContainer>

      {/* Image Showcase */}
      <MotionContainer stagger={0} delay={0.4} className="w-full">
        <MotionItem variant="fadeUp">
          <TiltCard
            tone="primary"
            maxTilt={2}
            blur={10}
            className="w-full rounded-[2rem]"
            contentClassName="relative aspect-[21/9] min-h-[300px] w-full overflow-hidden rounded-[inherit] p-2 md:p-3"
          >
            <div className="relative h-full w-full overflow-hidden rounded-[1.5rem]">
              <Image
                src={data.image}
                alt={data.title}
                fill
                className="object-cover object-center"
                sizes="100vw"
                loading="eager"
                fetchPriority="low"
              />

              {/* Gradient Overlay for text legibility */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Bottom Left Content */}
              <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col justify-end gap-1 md:bottom-8 md:left-8 md:right-8">
                <Typography
                  variant="cardTitle"
                  className="text-lg font-bold text-white md:text-xl"
                >
                  {data.imageOverlayTitle}
                </Typography>
                <Typography
                  variant="caption"
                  className="font-mono text-white/70 uppercase tracking-wider md:text-sm"
                  dir="ltr"
                  style={{ textAlign: isRTL ? "right" : "left" }}
                >
                  {data.imageOverlaySubtitle}
                </Typography>
              </div>

              {/* Bottom Right Badge */}
              <div
                className={`absolute bottom-6 z-10 md:bottom-8 ${isRTL ? "left-6 md:left-8" : "right-6 md:right-8"}`}
              >
                <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 shadow-lg backdrop-blur-md">
                  <div className="h-1.5 w-1.5 rounded-full bg-kz-media-accent shadow-kz-glow-accent" />
                  <Typography
                    variant="label"
                    className="font-semibold text-white whitespace-nowrap"
                    dir="ltr"
                  >
                    {data.imageBadge}
                  </Typography>
                </div>
              </div>
            </div>
          </TiltCard>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
