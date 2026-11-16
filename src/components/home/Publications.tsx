"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard, Magnetic } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { SectionHeader, SECTION_CLASS } from "./SectionHeader";

export const Publications = ({
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
      <SectionHeader
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        action={
          <a
            href={data.exploreLink}
            className="group flex items-center gap-2 rounded-full border border-kz-brand-accent/25 bg-kz-brand-accent/10 px-4 py-2 text-kz-brand-accent transition-colors hover:bg-kz-brand-accent/15"
          >
            <Typography variant="label" className="font-medium">
              {data.exploreText}
            </Typography>
            <ArrowIcon
              size={16}
              className="transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            />
          </a>
        }
      />

      <MotionContainer
        className="grid grid-cols-1 gap-[var(--kz-grid-gap)] md:grid-cols-2 lg:grid-cols-3"
        stagger={0.15}
        delay={0.3}
      >
        {data.items.map((item: any) => (
          <MotionItem
            key={item.id}
            variant="fadeUp"
            className="h-full"
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard
              tone="primary"
              maxTilt={3}
              blur={6}
              className="h-full rounded-[2rem]"
              contentClassName="flex h-full flex-col p-2.5"
            >
              {/* Thumbnail: fixed 16:9 on mobile, height-bound on desktop */}
              <div className="group/img relative aspect-video w-full overflow-hidden rounded-[1.5rem] border border-kz-border-main lg:aspect-auto lg:h-[clamp(7.5rem,24vh,14rem)]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover/img:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover/img:opacity-30" />
              </div>

              <div className="flex flex-grow flex-col px-2.5 pb-2.5 pt-[var(--kz-block-gap)]">
                <Typography
                  variant="eyebrow"
                  className="mb-2 font-medium text-kz-brand-accent"
                >
                  {item.category}
                </Typography>

                <Typography
                  variant="cardTitle"
                  as="h3"
                  className="mb-2 line-clamp-2 font-bold text-kz-text-heading leading-snug text-kz-text-heading"
                >
                  {item.title}
                </Typography>

                <Typography
                  variant="caption"
                  as="p"
                  className="mb-[var(--kz-block-gap)] line-clamp-2 flex-grow leading-relaxed text-kz-text-muted"
                >
                  {item.description}
                </Typography>

                <div className="mt-auto flex items-center justify-between border-t border-kz-border-main pt-[clamp(0.5rem,1.4vh,0.9rem)]">
                  <Typography
                    variant="tiny"
                    className="font-medium text-kz-text-muted"
                  >
                    {item.date}
                  </Typography>

                  <Magnetic strength={0.15}>
                    <a
                      href={item.href}
                      className="group flex items-center gap-1.5 text-kz-brand-accent transition-colors hover:text-kz-brand-accent-hover"
                    >
                      <Typography variant="label" className="font-medium">
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
        ))}
      </MotionContainer>
    </Section>
  );
};
