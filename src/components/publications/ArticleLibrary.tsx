"use client";

import { useState } from "react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { ArticleListRow } from "@/components/ui/ArticleListRow";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Pagination } from "@/components/ui/Pagination";
import { Section } from "@/components/ui/Section";

interface ArticleLibraryProps {
  data: any;
  lang: "fa" | "en";
}

export const ArticleLibrary = ({ data, lang }: ArticleLibraryProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  return (
    <Section className="relative w-full !py-0">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <MotionContainer stagger={0.15} delay={0.2}>
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
              className="text-kz-text-heading"
            >
              {data.title}
            </Typography>
          </MotionItem>
        </MotionContainer>

        <MotionContainer stagger={0.15} delay={0.3}>
          <MotionItem>
            <SegmentTabs tabs={data.tabs} onChange={setActiveTab} />
          </MotionItem>
        </MotionContainer>
      </div>

      <MotionContainer
        className="flex flex-col gap-4"
        stagger={0.1}
        delay={0.4}
      >
        {data.articles.map((article: any, idx: number) => (
          <MotionItem key={article.id} variant="fadeUp">
            <ArticleListRow
              index={idx} // Passed index for color switching
              title={article.title}
              abstract={article.abstract}
              date={article.date}
              category={article.category}
              author={article.author}
              lang={lang}
            />
          </MotionItem>
        ))}
      </MotionContainer>

      <MotionContainer className="mt-10" stagger={0} delay={0.5}>
        <MotionItem>
          <Pagination
            currentPage={page}
            totalPages={5}
            onPageChange={setPage}
            lang={lang}
          />
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
