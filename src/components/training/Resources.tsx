"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  PlayCircle,
  FileText,
} from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard, Magnetic } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface ResourcesProps {
  data: any;
  lang: "fa" | "en";
}

export const Resources = ({ data, lang }: ResourcesProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Section className="relative w-full !py-0">
      {/* ───────── Header ───────── */}
      <MotionContainer
        className="mb-12 flex w-full flex-col justify-between gap-6 lg:flex-row lg:items-end"
        stagger={0.15}
        delay={0.2}
      >
        <div className="w-full max-w-3xl">
          <MotionItem className="mb-3">
            <Typography
              variant="eyebrow"
              className="font-mono uppercase tracking-widest text-kz-brand-accent"
            >
              {data.eyebrow}
            </Typography>
          </MotionItem>
          <MotionItem className="mb-3">
            <Typography
              variant="sectionTitle"
              as="h2"
              className="text-kz-text-heading"
            >
              {data.title}
            </Typography>
          </MotionItem>
          <MotionItem>
            <Typography
              variant="body"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {data.subtitle}
            </Typography>
          </MotionItem>
        </div>

        {/* Explore Link */}
        <MotionItem className="flex-shrink-0 self-start lg:self-auto">
          <a
            href={data.exploreLink}
            className="group flex items-center gap-2 text-kz-brand-accent transition-colors hover:text-kz-brand-accent-hover"
          >
            <Typography variant="label" className="font-semibold">
              {data.exploreText}
            </Typography>
            <ArrowIcon
              size={16}
              className="transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            />
          </a>
        </MotionItem>
      </MotionContainer>

      {/* ───────── Cards Grid ───────── */}
      <MotionContainer
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        stagger={0.15}
        delay={0.3}
      >
        {data.items.map((item: any, index: number) => {
          const colors = getAlternateColors(index);

          return (
            <MotionItem key={item.id} variant="fadeUp" className="h-full">
              <TiltCard
                tone={colors.tone}
                maxTilt={4}
                blur={4}
                className="h-full rounded-[2rem]"
                // Added padding (p-3) around the entire card content
                contentClassName="flex h-full flex-col p-3"
              >
                {/* Image Container - Now acts as an inset thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden rounded-[1.5rem] border border-kz-border-subtle/30 shadow-sm">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
                </div>

                {/* Content Container */}
                <div className="flex flex-grow flex-col px-3 pb-3 pt-5">
                  {/* Category & Icon */}
                  <div className="mb-3 flex items-center gap-2">
                    {item.category.includes("VIDEO") ||
                    item.category.includes("ویدیو") ? (
                      <PlayCircle
                        size={16}
                        className={cn("shrink-0", colors.text)}
                      />
                    ) : item.category.includes("WEBINAR") ||
                      item.category.includes("وبینار") ? (
                      <BookOpen
                        size={16}
                        className={cn("shrink-0", colors.text)}
                      />
                    ) : (
                      <FileText
                        size={16}
                        className={cn("shrink-0", colors.text)}
                      />
                    )}
                    <Typography
                      variant="eyebrow"
                      className={cn(
                        "font-mono text-[11px] uppercase tracking-widest",
                        colors.text,
                      )}
                    >
                      {item.category}
                    </Typography>
                  </div>

                  {/* Title */}
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-2 text-lg font-bold leading-tight text-kz-text-heading transition-colors group-hover:text-kz-brand-accent"
                  >
                    {item.title}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="caption"
                    as="p"
                    className="mb-6 flex-grow leading-relaxed text-kz-text-muted"
                  >
                    {item.description}
                  </Typography>

                  {/* Footer: Meta & Link */}
                  <div className="mt-auto flex items-center justify-between border-t border-kz-border-subtle/50 pt-4">
                    <Typography
                      variant="tiny"
                      className="font-mono text-kz-text-muted"
                    >
                      {item.meta}
                    </Typography>

                    <Magnetic strength={0.15}>
                      <a
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-1.5 transition-colors",
                          colors.text,
                          colors.isGreen
                            ? "hover:text-kz-brand-primary-hover"
                            : "hover:text-kz-brand-secondary-hover",
                        )}
                      >
                        <Typography variant="label" className="font-semibold">
                          {item.linkText}
                        </Typography>
                        <ArrowIcon
                          size={14}
                          className="transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                        />
                      </a>
                    </Magnetic>
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
