"use client";

import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { FaqAccordion } from "@/components/ui/FaqAccordion"; // Imported new UI component
import { Section } from "@/components/ui/Section";

interface PublicationsFAQProps {
  data: any;
  lang: "fa" | "en";
}

export const PublicationsFAQ = ({ data, lang }: PublicationsFAQProps) => {
  return (
    <Section className="relative w-full !py-0">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        {/* ───────── Header ───────── */}
        <MotionContainer
          className="flex flex-col justify-start lg:col-span-5"
          stagger={0.15}
          delay={0.2}
        >
          <MotionItem className="mb-3">
            <Typography
              variant="eyebrow"
              className="font-mono uppercase tracking-widest text-kz-brand-accent"
            >
              {data.eyebrow}
            </Typography>
          </MotionItem>
          <MotionItem className="mb-4">
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
        </MotionContainer>

        {/* ───────── Accordion ───────── */}
        <MotionContainer className="lg:col-span-7" stagger={0} delay={0.3}>
          <MotionItem variant="fadeUp">
            <FaqAccordion items={data.items} />
          </MotionItem>
        </MotionContainer>
      </div>
    </Section>
  );
};
