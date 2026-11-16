"use client";

import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { AuthorCard } from "@/components/ui/AuthorCard";
import { Section } from "@/components/ui/Section";

interface ResearchTeamProps {
  data: any;
  lang: "fa" | "en";
}

export const ResearchTeam = ({ data, lang }: ResearchTeamProps) => {
  return (
    <Section className="relative w-full !py-0">
      <MotionContainer
        className="mb-12 flex flex-col items-center text-center"
        stagger={0.15}
        delay={0.2}
      >
        <MotionItem>
          <Typography
            variant="eyebrow"
            className="mb-2 font-mono uppercase tracking-widest text-kz-brand-accent"
          >
            {data.eyebrow}
          </Typography>
        </MotionItem>
        <MotionItem>
          <Typography
            variant="sectionTitle"
            as="h2"
            className="mb-4 text-kz-text-heading"
          >
            {data.title}
          </Typography>
        </MotionItem>
        <MotionItem>
          <Typography variant="body" className="max-w-2xl text-kz-text-muted">
            {data.subtitle}
          </Typography>
        </MotionItem>
      </MotionContainer>

      {/* Removed max-w-4xl and mx-auto to allow full width */}
      <MotionContainer
        className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8"
        stagger={0.15}
        delay={0.3}
      >
        {data.authors.map((author: any, idx: number) => (
          <MotionItem key={author.id} variant="fadeUp" className="h-full">
            <AuthorCard
              index={idx}
              name={author.name}
              role={author.role}
              initials={author.initials}
              papersCount={author.papersCount}
              lang={lang}
            />
          </MotionItem>
        ))}
      </MotionContainer>
    </Section>
  );
};
