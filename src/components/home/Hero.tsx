"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  ShieldCheck,
  Hexagon,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { TiltCard, Magnetic, WordReveal, CountUp } from "@/components/ui/Fx";
import { HUDFigure } from "@/components/ui/HUDFigure";
import { Section } from "@/components/ui/Section";
import { SECTION_CLASS } from "./SectionHeader";
import { isFirstLoad } from "@/lib/appState";
import { INTRO } from "@/lib/siteStatus";

interface HeroProps {
  data: any;
  lang: "fa" | "en";
}

export const Hero = ({ data, lang }: HeroProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const containerRef = useRef<HTMLElement>(null);

  // NOTE: The scroll-linked parallax (opacity 1 -> 0) was removed on purpose.
  // When the Hero was re-mounted at the wrong moment (mid-scroll / off-screen),
  // its scroll progress was measured at a stale value and the opacity stayed at 0,
  // which produced the "empty Hero" bug. The Hero is now always visible and
  // only relies on its own entrance animations.

  // First load: wait for the navbar. Later mounts (route change / resize): play fast.
  const [base] = useState(() => (isFirstLoad() ? INTRO.hero : 0.2));

  return (
    <Section ref={containerRef} className={SECTION_CLASS}>
      <div className="w-full">
        <div className="grid w-full grid-cols-1 items-center gap-[clamp(1.5rem,5vh,4rem)] lg:grid-cols-2">
          {/* ───────── Text content ───────── */}
          <MotionContainer
            className="flex w-full flex-col items-start lg:order-1"
            stagger={0.15}
            delay={base}
          >
            <MotionItem className="mb-[var(--kz-block-gap)] max-w-full">
              <LiveBadge variant="primary" className="kz-neo-sm max-w-full">
                {data.badge}
              </LiveBadge>
            </MotionItem>

            <MotionItem className="mb-[clamp(0.35rem,1vh,0.6rem)]">
              <Typography
                variant="eyebrow"
                as="span"
                className="text-kz-brand-accent"
              >
                {data.eyebrow}
              </Typography>
            </MotionItem>

            <div className="mb-[var(--kz-block-gap)] w-full">
              <Typography
                variant="display"
                as="h1"
                className="text-kz-text-heading"
              >
                <WordReveal text={data.titleLine1} delay={base + 0.15} />
                <br />
                <span className="relative mt-1 inline-block text-kz-brand-accent">
                  <WordReveal text={data.titleLine2} delay={base + 0.4} />
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 1,
                      delay: base + 1.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-kz-brand-gradient shadow-kz-glow-accent rtl:origin-right"
                  />
                </span>
              </Typography>
            </div>

            <MotionItem className="mb-[calc(var(--kz-block-gap)*1.4)] w-full max-w-full lg:max-w-lg">
              <Typography
                variant="body"
                as="p"
                className="leading-relaxed text-kz-text-muted"
              >
                {data.subtitle}
              </Typography>
            </MotionItem>

            <MotionItem className="flex w-full flex-wrap items-center gap-3">
              <Magnetic strength={0.2}>
                <Button
                  variant="primary"
                  size="md"
                  className="kz-shimmer shadow-kz-glow transition-shadow duration-300 hover:shadow-kz-glow-accent"
                >
                  <Typography variant="button" as="span">
                    {data.primaryButton}
                  </Typography>
                  <ArrowIcon size={18} />
                </Button>
              </Magnetic>

              <Magnetic strength={0.2}>
                <Button
                  variant="secondary"
                  size="md"
                  className="transition-shadow duration-300 hover:shadow-kz-glow-blue"
                >
                  <Activity size={18} className="text-kz-icon-secondary" />
                  <Typography variant="button" as="span">
                    {data.secondaryButton}
                  </Typography>
                </Button>
              </Magnetic>
            </MotionItem>

            <MotionItem className="mt-[calc(var(--kz-block-gap)*1.6)] w-full max-w-full lg:max-w-lg">
              <TiltCard
                tone="primary"
                maxTilt={3}
                blur={6}
                className="rounded-2xl"
                contentClassName="flex items-center gap-4 px-4 py-[clamp(0.6rem,1.6vh,1rem)]"
              >
                <div
                  className="kz-neo-sm shrink-0 rounded-full border border-kz-brand-accent/25 bg-kz-brand-accent/10 p-2 text-kz-icon-primary"
                  style={{ transform: "translateZ(24px)" }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div style={{ transform: "translateZ(12px)" }}>
                  <Typography
                    variant="label"
                    as="h4"
                    className="font-normal text-kz-text-heading"
                  >
                    {data.trustTitle}
                  </Typography>
                  <Typography
                    variant="caption"
                    as="p"
                    className="mt-0.5 leading-relaxed text-kz-text-muted"
                  >
                    {data.trustSubtitle}
                  </Typography>
                </div>
              </TiltCard>
            </MotionItem>
          </MotionContainer>

          {/* ───────── Image content ───────── */}
          <MotionContainer
            className="relative mx-auto w-full max-w-[85vw] sm:max-w-md md:max-w-lg lg:order-2 lg:max-w-none"
            stagger={0}
            delay={base + 0.4}
          >
            <MotionItem variant="scaleBlur">
              {/* Height-bound: the square never exceeds the free viewport height */}
              <TiltCard
                tone="primary"
                maxTilt={6}
                blur={0}
                perspective={1300}
                hoverScale={1.015}
                className="mx-auto aspect-square w-full rounded-[2rem] lg:max-w-[min(100%,calc(100dvh-var(--kz-nav-h)-9rem))]"
              >
                <HUDFigure
                  src="/images/hero-root.png"
                  alt="Hero Root Visualization"
                  terminal={data.image.terminal}
                  colonizationTitle={data.image.cardColonizationTitle}
                  colonizationValue={data.image.cardColonizationValue}
                  colonizationSub={data.image.cardColonizationSub}
                />
              </TiltCard>
            </MotionItem>

            {/* Network chip: centered on the image's bottom edge, only slightly overhanging.
                The wrapper does the centering so framer's transform on MotionItem never fights it. */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-3 z-20 flex justify-center px-3">
              <MotionItem
                variant="fadeUp"
                transition={{ delay: base + 0.6, duration: 0.6 }}
                className="pointer-events-auto max-w-full"
              >
                <div className="kz-float">
                  <TiltCard
                    tone="secondary"
                    maxTilt={5}
                    blur={0}
                    bgClassName="bg-[#08130f]/85"
                    className="rounded-full border border-white/15 shadow-kz-card"
                    contentClassName="flex items-center gap-3 py-2 ps-2 pe-5"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-kz-media-accent/30 bg-kz-media-accent/10 text-kz-media-accent"
                      style={{ transform: "translateZ(26px)" }}
                    >
                      <Hexagon size={18} />
                    </div>
                    <div
                      className="flex flex-col"
                      style={{ transform: "translateZ(14px)" }}
                    >
                      <Typography
                        variant="tiny"
                        className="mb-0.5 text-kz-media-text/70"
                      >
                        {data.image.cardNetworkTitle}
                      </Typography>
                      <Typography
                        variant="label"
                        className="font-semibold text-kz-media-accent"
                      >
                        <CountUp
                          value={data.image.cardNetworkValue}
                          delay={base + 1.0}
                        />
                      </Typography>
                    </div>
                  </TiltCard>
                </div>
              </MotionItem>
            </div>
          </MotionContainer>
        </div>
      </div>
    </Section>
  );
};
