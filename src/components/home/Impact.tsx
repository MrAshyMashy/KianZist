"use client";

import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

export const Impact = ({ data, lang }: { data: any; lang: "fa" | "en" }) => {
  return (
    <Section className={SECTION_CLASS}>
      <SectionHeader
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
      />

      <MotionContainer
        className="grid grid-cols-1 gap-[var(--kz-grid-gap)] lg:grid-cols-2"
        stagger={0.15}
        delay={0.3}
      >
        {/* ── Testimonial ── */}
        <MotionItem variant="fadeUp" className="h-full">
          <TiltCard
            tone="primary"
            maxTilt={3}
            blur={6}
            className="h-full rounded-[2rem]"
            contentClassName="flex h-full flex-col justify-between p-[var(--kz-card-pad)]"
          >
            <div className="relative" style={{ transform: "translateZ(14px)" }}>
              <Quote
                aria-hidden
                size={64}
                className="pointer-events-none absolute -top-2 text-kz-brand-accent/10 ltr:right-0 rtl:left-0"
              />
              <div className="mb-[var(--kz-block-gap)] flex flex-wrap items-center gap-1 text-kz-brand-accent">
                {Array.from({ length: data.testimonial.stars }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
                <Typography
                  variant="tiny"
                  className="font-medium text-kz-brand-accent/80 ltr:ml-2 rtl:mr-2"
                >
                  {data.testimonial.badge}
                </Typography>
              </div>

              <Typography
                variant="body"
                as="p"
                className="mb-[var(--kz-block-gap)] text-[length:var(--kz-fs-quote)] leading-[1.85] text-kz-text-heading"
              >
                “{data.testimonial.text}”
              </Typography>
            </div>

            <div
              className="flex items-center gap-3 border-t border-kz-border-main pt-[clamp(0.6rem,1.8vh,1.25rem)]"
              style={{ transform: "translateZ(18px)" }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kz-border-strong bg-kz-bg-sunken shadow-kz-inner">
                <Typography
                  variant="label"
                  className="font-semibold text-kz-text-heading"
                >
                  {data.testimonial.initials}
                </Typography>
              </div>
              <div>
                <Typography
                  variant="cardTitle"
                  as="h4"
                  className="font-medium text-kz-text-heading"
                >
                  {data.testimonial.authorName}
                </Typography>
                <Typography
                  variant="caption"
                  as="p"
                  className="text-kz-text-muted"
                >
                  {data.testimonial.authorTitle}
                </Typography>
              </div>
            </div>
          </TiltCard>
        </MotionItem>

        {/* ── Assay chart ── */}
        <MotionItem variant="fadeUp" className="h-full">
          <TiltCard
            tone="secondary"
            maxTilt={3}
            blur={6}
            className="h-full rounded-[2rem]"
            contentClassName="flex h-full flex-col p-[var(--kz-card-pad)]"
          >
            <div
              className="mb-[var(--kz-block-gap)] flex items-start justify-between gap-4"
              style={{ transform: "translateZ(14px)" }}
            >
              <div>
                <Typography
                  variant="eyebrow"
                  className="mb-1 font-medium text-kz-brand-secondary"
                >
                  {data.assay.eyebrow}
                </Typography>
                <Typography
                  variant="cardTitle"
                  as="h3"
                  className="font-medium text-kz-text-heading"
                >
                  {data.assay.title}
                </Typography>
              </div>
              <Badge
                variant="glass"
                className="shrink-0 border-kz-brand-secondary/30 bg-kz-brand-secondary/5 font-mono text-kz-text-heading"
              >
                {data.assay.badge}
              </Badge>
            </div>

            <div
              className="flex flex-grow flex-col justify-center gap-[clamp(0.8rem,2.4vh,1.5rem)]"
              style={{ transform: "translateZ(22px)" }}
            >
              {data.assay.bars.map((bar: any, i: number) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${bar.dotColor}`} />
                      <Typography
                        variant="caption"
                        className="font-medium text-kz-text-heading"
                      >
                        {bar.label}
                      </Typography>
                    </div>
                    <Typography
                      variant="label"
                      className={`font-medium ${bar.textColor}`}
                    >
                      {bar.value}
                    </Typography>
                  </div>
                  <div className="kz-neo-inset relative h-2.5 w-full overflow-hidden rounded-full bg-kz-bg-sunken">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: bar.percent / 100 }}
                      viewport={{ once: false }}
                      transition={{
                        duration: 1.2,
                        delay: 0.5 + i * 0.15,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`h-full w-full origin-left rtl:origin-right rounded-full ${bar.barColor} ${bar.shimmer ? "kz-shimmer" : ""}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-[var(--kz-block-gap)] border-t border-kz-border-main pt-3"
              style={{ transform: "translateZ(8px)" }}
            >
              <Typography
                variant="tiny"
                as="p"
                className="leading-relaxed text-kz-text-muted"
              >
                {data.assay.note}
              </Typography>
            </div>
          </TiltCard>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
