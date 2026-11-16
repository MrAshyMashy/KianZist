"use client";

import { FlaskConical, Activity, ShieldCheck, Leaf } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";

const iconMap: Record<string, any> = {
  FlaskConical,
  Activity,
  ShieldCheck,
  Leaf,
};

interface HeroProps {
  data: any;
}

const Hero = ({ data }: HeroProps) => {
  const { hero, stats } = data;

  return (
    <Section className="relative w-full !py-0">
      <div className="flex flex-col items-center justify-center text-center">
        <MotionContainer stagger={0.15} delay={0.2}>
          {/* Header Badge */}
          <MotionItem className="mb-6">
            <LiveBadge variant="neutral">{hero.badge}</LiveBadge>
          </MotionItem>

          {/* Title & Subtitle */}
          <MotionItem className="mb-6">
            <Typography
              variant="display"
              as="h1"
              className="max-w-4xl text-kz-text-heading"
            >
              {hero.titleLine1}{" "}
              <span className="text-kz-brand-accent">
                {hero.titleHighlight}
              </span>
            </Typography>
          </MotionItem>

          <MotionItem className="mb-12 lg:mb-16">
            <Typography
              variant="bodyLarge"
              as="p"
              className="mx-auto max-w-3xl leading-relaxed text-kz-text-muted"
            >
              {hero.subtitle}
            </Typography>
          </MotionItem>
        </MotionContainer>

        {/* Stats Bar inside a TiltCard for hover effects */}
        <MotionContainer className="w-full" stagger={0.1} delay={0.4}>
          <MotionItem variant="fadeUp">
            <TiltCard
              tone="primary"
              maxTilt={2}
              blur={4}
              className="w-full rounded-[2rem]"
              contentClassName="px-6 py-8 md:px-10"
            >
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
                {stats.map((stat: any) => {
                  const Icon = iconMap[stat.icon] || FlaskConical;
                  return (
                    <div
                      key={stat.id}
                      className="flex flex-col items-center justify-center gap-2 text-center lg:border-r lg:border-kz-border-subtle/50 lg:last:border-0"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <div className="mb-1 flex items-center gap-3">
                        <Icon size={20} className="text-kz-icon-primary" />
                        <Typography
                          variant="stat"
                          className="text-kz-text-heading"
                        >
                          {stat.value}
                        </Typography>
                      </div>
                      <Typography
                        variant="tiny"
                        className="font-medium tracking-wide text-kz-text-muted"
                      >
                        {stat.label}
                      </Typography>
                    </div>
                  );
                })}
              </div>
            </TiltCard>
          </MotionItem>
        </MotionContainer>
      </div>
    </Section>
  );
};

export default Hero;
