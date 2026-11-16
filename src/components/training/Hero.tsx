"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight, PlayCircle, GraduationCap } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { TiltCard, Magnetic, CountUp } from "@/components/ui/Fx";
import { HUDFigure } from "@/components/ui/HUDFigure";
import { Section } from "@/components/ui/Section";

interface HeroProps {
  data: any;
  lang: "fa" | "en";
}

export const Hero = ({ data, lang }: HeroProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const containerRef = useRef<HTMLElement>(null);

  return (
    <Section ref={containerRef} className="relative w-full !py-0">
      <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ───────── Text content ───────── */}
        <MotionContainer
          className="flex w-full flex-col items-start lg:order-1"
          stagger={0.15}
          delay={0.2}
        >
          <MotionItem className="mb-6">
            <LiveBadge
              variant="neutral"
              className="bg-kz-bg-surface/50 backdrop-blur-md"
            >
              {data.badge}
            </LiveBadge>
          </MotionItem>

          <MotionItem className="mb-4">
            <Typography
              variant="eyebrow"
              as="span"
              className="font-semibold text-kz-brand-accent"
            >
              {data.eyebrow}
            </Typography>
          </MotionItem>

          <MotionItem className="mb-6 w-full">
            <Typography
              variant="display"
              as="h1"
              className="text-kz-text-heading"
            >
              {data.titleLine1}
              <br />
              <span className="relative mt-2 inline-block text-kz-brand-accent">
                {data.titleLine2}
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-kz-brand-gradient shadow-kz-glow-accent rtl:origin-right"
                />
              </span>
            </Typography>
          </MotionItem>

          <MotionItem className="mb-8 w-full max-w-full lg:max-w-lg">
            <Typography
              variant="body"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {data.subtitle}
            </Typography>
          </MotionItem>

          <MotionItem className="flex w-full flex-wrap items-center gap-4">
            <Magnetic strength={0.22}>
              <Button
                variant="primary"
                size="md"
                className="kz-shimmer transition-shadow duration-300 hover:shadow-kz-glow-accent"
              >
                <Typography variant="button" as="span">
                  {data.primaryButton}
                </Typography>
                <ArrowIcon size={18} className={isRTL ? "mr-2" : "ml-2"} />
              </Button>
            </Magnetic>

            <Magnetic strength={0.22}>
              <Button
                variant="secondary"
                size="md"
                className="transition-shadow duration-300 hover:shadow-kz-glow-blue"
              >
                <PlayCircle size={18} className="text-kz-icon-secondary" />
                <Typography
                  variant="button"
                  as="span"
                  className={isRTL ? "mr-2" : "ml-2"}
                >
                  {data.secondaryButton}
                </Typography>
              </Button>
            </Magnetic>
          </MotionItem>
        </MotionContainer>

        {/* ───────── Image content ───────── */}
        <MotionContainer
          className="relative mx-auto w-full max-w-[85vw] sm:max-w-md md:max-w-lg lg:order-2 lg:max-w-none"
          stagger={0}
          delay={0.5}
        >
          <MotionItem variant="scaleBlur">
            <TiltCard
              tone="primary"
              maxTilt={9}
              blur={0}
              perspective={1300}
              hoverScale={1.02}
              className="aspect-square w-full rounded-[2rem]"
            >
              <HUDFigure
                src="/images/pic1.png"
                alt="Kian Zist Knowledge Hub"
                terminal={data.image.terminal}
                colonizationTitle={data.image.cardColonizationTitle}
                colonizationValue={data.image.cardColonizationValue}
                colonizationSub={data.image.cardColonizationSub}
              />
            </TiltCard>
          </MotionItem>

          {/* Network chip: centered on the image's bottom edge, only slightly overhanging. */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-3 z-20 flex justify-center px-3">
            <MotionItem
              variant="fadeUp"
              transition={{ delay: 0.8, duration: 0.6 }}
              className="pointer-events-auto max-w-full"
            >
              <div className="kz-float">
                <TiltCard
                  tone="secondary"
                  maxTilt={5}
                  blur={0}
                  bgClassName="bg-[#08130f]/85" // Dark glass matching Home Hero
                  className="rounded-full border border-white/15 shadow-kz-card"
                  contentClassName="flex items-center gap-3 py-2 ps-2 pe-5"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-kz-media-accent/30 bg-kz-media-accent/10 text-kz-media-accent"
                    style={{ transform: "translateZ(26px)" }}
                  >
                    <GraduationCap size={18} />
                  </div>
                  <div
                    className="flex flex-col"
                    style={{ transform: "translateZ(14px)" }}
                  >
                    <Typography
                      variant="tiny"
                      className="mb-0.5 text-kz-media-text/70 uppercase tracking-wider"
                    >
                      {data.image.cardNetworkTitle}
                    </Typography>
                    <Typography
                      variant="label"
                      className="font-semibold text-kz-media-accent"
                    >
                      <CountUp
                        value={data.image.cardNetworkValue}
                        delay={1.2}
                      />
                    </Typography>
                  </div>
                </TiltCard>
              </div>
            </MotionItem>
          </div>
        </MotionContainer>
      </div>
    </Section>
  );
};
