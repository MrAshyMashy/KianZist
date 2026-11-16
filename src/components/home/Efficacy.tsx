"use client";

import { motion } from "framer-motion";
import { Brain, Leaf, TrendingUp, ShieldCheck, Activity } from "lucide-react";
import Typography from "@/typography";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { TiltCard, CountUp, toneFromAccent } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { IconBox } from "@/components/ui/IconBox";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

const iconMap: Record<string, any> = { Brain, Leaf, TrendingUp, ShieldCheck };

const colorMap = {
  primary: {
    text: "text-kz-brand-accent",
    bg: "bg-kz-brand-accent",
    valueShadow: "drop-shadow-kz-accent",
    glow: "shadow-kz-glow-accent",
  },
  secondary: {
    text: "text-kz-text-secondary",
    bg: "bg-kz-brand-secondary",
    valueShadow: "drop-shadow-kz-blue",
    glow: "shadow-kz-glow-blue",
  },
  pistachio: {
    text: "text-kz-text-pistachio",
    bg: "bg-kz-brand-pistachio",
    valueShadow: "drop-shadow-kz-pistachio",
    glow: "shadow-kz-glow-pistachio",
  },
};

const LINE_PATH = "M 0 35 Q 30 20, 60 25 T 100 5";
const AREA_PATH = `${LINE_PATH} L 100 40 L 0 40 Z`;
const EASE = [0.22, 1, 0.36, 1] as const;

export const Efficacy = ({ data, lang }: { data: any; lang: "fa" | "en" }) => {
  return (
    <Section className={SECTION_CLASS}>
      <SectionHeader
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        action={
          <LiveBadge
            variant="glass"
            icon={<Activity size={16} className="text-kz-icon-primary" />}
            textClassName="font-sans font-medium normal-case tracking-normal"
          >
            <CountUp value={data.badge} delay={0.5} />
          </LiveBadge>
        }
      />

      {/* ───────── Metric cards ───────── */}
      <MotionContainer
        className="grid grid-cols-1 gap-[var(--kz-grid-gap)] md:grid-cols-2 lg:grid-cols-4"
        stagger={0.12}
        delay={0.3}
      >
        {data.metrics.map((metric: any, i: number) => {
          const Icon = iconMap[metric.icon] || Activity;
          const accent = metric.theme?.accent || "primary";
          const c =
            colorMap[accent as keyof typeof colorMap] || colorMap.primary;
          const gradId = `kz-fill-${metric.id}`;

          const tone =
            accent === "secondary"
              ? "secondary"
              : accent === "pistachio"
                ? "neutral"
                : "primary";

          return (
            // Changed from motion.div to MotionItem to respect global rules
            <MotionItem
              key={metric.id}
              variant="fadeUp"
              className="h-full"
              transition={{ duration: 0.8, delay: i * 0.09, ease: EASE }}
            >
              <TiltCard
                tone={toneFromAccent(accent)}
                maxTilt={5}
                blur={6}
                className="h-full rounded-3xl"
                contentClassName="flex h-full flex-col p-[var(--kz-card-pad)]"
              >
                <div className="mb-[var(--kz-block-gap)] flex items-start justify-between">
                  <div style={{ transform: "translateZ(18px)" }}>
                    <Typography
                      variant="tiny"
                      className={`${c.text} rounded-full bg-current/0 font-medium`}
                    >
                      {metric.label}
                    </Typography>
                  </div>
                  <IconBox
                    tone={tone as any}
                    size="sm"
                    shape="circle"
                    style={{ transform: "translateZ(36px)" }}
                  >
                    <Icon size={18} />
                  </IconBox>
                </div>

                <div
                  className="mb-1.5"
                  style={{ transform: "translateZ(44px)" }}
                >
                  <Typography
                    variant="metric"
                    as="span"
                    className={`${c.text} ${c.valueShadow}`}
                  >
                    <CountUp value={metric.value} delay={0.3 + i * 0.1} />
                  </Typography>
                </div>

                <div
                  className="mb-[var(--kz-block-gap)] flex-grow"
                  style={{ transform: "translateZ(20px)" }}
                >
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-1.5 font-medium text-kz-text-heading"
                  >
                    {metric.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    as="p"
                    className="leading-relaxed text-kz-text-muted"
                  >
                    {metric.description}
                  </Typography>
                </div>

                <div
                  className="relative mt-auto h-[clamp(2.25rem,5.5vh,3rem)] w-full"
                  style={{ transform: "translateZ(8px)" }}
                >
                  {metric.type === "chart" ? (
                    <div className="relative h-full w-full">
                      <svg
                        className={`h-full w-full overflow-visible ${c.text}`}
                        preserveAspectRatio="none"
                        viewBox="0 0 100 40"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id={gradId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="currentColor"
                              stopOpacity="0.26"
                            />
                            <stop
                              offset="100%"
                              stopColor="currentColor"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>

                        {[10, 22, 34].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            x2="100"
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.14"
                            strokeDasharray="2 3"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}

                        <motion.path
                          d={AREA_PATH}
                          fill={`url(#${gradId})`}
                          stroke="none"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: false }}
                          transition={{ delay: 1.2, duration: 0.8 }}
                        />
                        <motion.path
                          d={LINE_PATH}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: false }}
                          transition={{
                            delay: 0.5,
                            duration: 1.4,
                            ease: "easeInOut",
                          }}
                        />
                      </svg>
                      <span className="absolute right-0 top-[12.5%] -translate-y-1/2 translate-x-1/2">
                        <motion.span
                          className="relative block"
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: false }}
                          transition={{ delay: 1.8, duration: 0.3 }}
                        >
                          <span
                            className={`absolute inset-0 animate-ping rounded-full opacity-40 ${c.bg}`}
                          />
                          <span
                            className={`relative block h-2.5 w-2.5 rounded-full ${c.bg} ${c.glow}`}
                          />
                        </motion.span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center gap-3 pb-1">
                      <div className="kz-neo-inset h-2.5 flex-grow overflow-hidden rounded-full bg-kz-bg-sunken">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: false }}
                          transition={{
                            duration: 1.5,
                            delay: 0.5,
                            ease: EASE,
                          }}
                          className={`kz-shimmer h-full w-full origin-left rtl:origin-right rounded-full ${c.bg} ${c.glow}`}
                        />
                      </div>
                      <Typography
                        variant="tiny"
                        className={`${c.text} whitespace-nowrap font-medium`}
                      >
                        {metric.progressText}
                      </Typography>
                    </div>
                  )}
                </div>
              </TiltCard>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </Section>
  );
};
