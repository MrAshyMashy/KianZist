"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ShoppingBag, Eye } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { TiltCard } from "@/components/ui/Fx"; // Removed Magnetic from import
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface ProductShowcaseProps {
  data: any;
  lang: "fa" | "en";
}

export const ProductShowcase = ({ data, lang }: ProductShowcaseProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const showcases = data.showcases || [];

  if (showcases.length === 0) return null;

  return (
    <div className="kz-spacing-inner w-full">
      <MotionContainer
        className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8"
        stagger={0.2}
        delay={0.2}
      >
        {showcases.map((content: any, index: number) => {
          const colors = getAlternateColors(index);

          return (
            <MotionItem
              key={content.id || index}
              variant="fadeUp"
              className="h-full"
            >
              <Section className="relative h-full w-full !py-0">
                <TiltCard
                  tone={colors.tone}
                  maxTilt={3}
                  blur={16}
                  className="h-full w-full rounded-[2rem]"
                  bgClassName="bg-kz-bg-surface/30"
                  contentClassName="flex h-full flex-col p-3 md:p-4"
                >
                  {/* ───────── Image Area ───────── */}
                  <div
                    className={cn(
                      "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[1.5rem] aspect-[16/9] mb-4",
                      colors.isGreen
                        ? "bg-gradient-to-br from-kz-brand-primary/10 to-kz-brand-secondary/5"
                        : "bg-gradient-to-br from-kz-brand-secondary/10 to-kz-brand-primary/5",
                    )}
                    style={{ transform: "translateZ(20px)" }}
                  >
                    {/* Floating Top Badges */}
                    <div className="absolute inset-x-3 top-3 flex items-start justify-between z-10">
                      <LiveBadge
                        variant={colors.isGreen ? "primary" : "secondary"}
                        className="bg-kz-bg-surface/80 border-none shadow-sm backdrop-blur-md px-3 py-1.5"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                          {content.badge1}
                        </span>
                      </LiveBadge>

                      <div className="rounded-full bg-kz-bg-surface/80 px-3 py-1.5 shadow-sm backdrop-blur-md border border-kz-border-subtle/50">
                        <Typography
                          variant="tiny"
                          className="font-mono text-kz-text-heading font-semibold text-[11px]"
                        >
                          {content.volume}
                        </Typography>
                      </div>
                    </div>

                    {/* Product Image */}
                    <div className="relative h-full w-full p-4 pt-14">
                      <Image
                        src={content.image}
                        alt={`${content.title} ${content.titleHighlight}`}
                        fill
                        className="object-contain drop-shadow-xl transition-transform duration-700 hover:scale-105"
                      />
                    </div>
                  </div>

                  {/* ───────── Details Area ───────── */}
                  <div
                    className="flex flex-1 flex-col px-1"
                    style={{ transform: "translateZ(15px)" }}
                  >
                    {/* Category & Title */}
                    <div className="mb-2">
                      <Typography
                        variant="eyebrow"
                        className={cn(
                          "mb-1 block font-semibold uppercase tracking-wider text-[10px]",
                          colors.text,
                        )}
                      >
                        {content.subtitle}
                      </Typography>
                      <Typography
                        variant="cardTitle"
                        as="h2"
                        className="text-xl font-bold text-kz-text-heading md:text-2xl"
                      >
                        {content.title}{" "}
                        <span className={colors.text}>
                          {content.titleHighlight}
                        </span>
                      </Typography>
                    </div>

                    {/* Short Description (Clamped) */}
                    <Typography
                      variant="caption"
                      className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-kz-text-muted"
                    >
                      {content.description}
                    </Typography>

                    {/* Specs & Price Row */}
                    <div className="mt-auto flex items-end justify-between border-t border-kz-border-subtle/50 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <Typography
                          variant="tiny"
                          className="text-kz-text-muted uppercase tracking-wider text-[10px]"
                        >
                          {isRTL ? "مشخصات" : "Key Specs"}
                        </Typography>
                        <Typography
                          variant="label"
                          className="font-mono text-kz-text-heading text-xs"
                        >
                          {content.cfu}
                        </Typography>
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <Typography
                          variant="tiny"
                          className="text-kz-text-muted uppercase tracking-wider text-[10px]"
                        >
                          {isRTL ? "قیمت پایه" : "Base Price"}
                        </Typography>
                        <Typography
                          variant="label"
                          className={cn("font-bold text-sm", colors.text)}
                        >
                          {isRTL ? "تماس بگیرید" : "Contact for Price"}
                        </Typography>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {/* Removed Magnetic wrapper, used a standard div with flex-1 */}
                      <div className="flex-1 w-full">
                        <Button
                          variant={colors.isGreen ? "primary" : "blue"}
                          size="md"
                          className="w-full rounded-full gap-2 shadow-md transition-all duration-300 hover:shadow-lg py-2.5"
                        >
                          <Eye size={16} />
                          <Typography
                            variant="button"
                            className="font-semibold text-xs"
                          >
                            {isRTL ? "مشاهده و خرید" : "View & Buy"}
                          </Typography>
                        </Button>
                      </div>

                      {/* Removed Magnetic wrapper, used a standard div with shrink-0 */}
                      <div className="shrink-0">
                        <Button
                          variant="secondary"
                          size="md"
                          className="rounded-full w-[42px] h-[42px] p-0 border-none bg-kz-bg-surface/50 backdrop-blur-md hover:bg-kz-bg-surface/80 text-kz-text-heading transition-colors flex items-center justify-center"
                        >
                          <ShoppingBag size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </Section>
            </MotionItem>
          );
        })}
      </MotionContainer>
    </div>
  );
};
