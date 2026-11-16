"use client";

import { useRef } from "react";
import CellSignalBackground from "./CellSignalBackground";
import { useLanguage } from "@/providers/LanguageProvider";
import { useEffects } from "@/providers/EffectsProvider";
import { enPublicationsData } from "@/data/en/publications";
import { faPublicationsData } from "@/data/fa/publications";
import { PublicationsHero } from "./PublicationsHero";
import { FeaturedArticles } from "./FeaturedArticles";
import { ArticleLibrary } from "./ArticleLibrary";
import { ResearchTeam } from "./ResearchTeam";
import { PublicationsFAQ } from "./PublicationsFAQ";
import { NewsletterSignup } from "@/components/ui/NewsletterSignup";
import { MainWrapper } from "@/components/ui/MainWrapper";
import { PageSection } from "@/components/ui/PageSection";

const PublicationsComponent = () => {
  const { effectsEnabled } = useEffects();
  const { lang } = useLanguage();
  const data = lang === "fa" ? faPublicationsData : enPublicationsData;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      {effectsEnabled && (
        <CellSignalBackground scrollContainerRef={scrollRef} />
      )}

      <MainWrapper>
        {/* 
        <PageSection isFirst>
          <PublicationsHero data={data} lang={lang} />
        </PageSection>

        <PageSection>
          <FeaturedArticles data={data.featured} lang={lang} />
        </PageSection>

        <PageSection>
          <ArticleLibrary data={data.library} lang={lang} />
        </PageSection>

        <PageSection>
          <ResearchTeam data={data.team} lang={lang} />
        </PageSection>

        <PageSection>
          <PublicationsFAQ data={data.faq} lang={lang} />
        </PageSection>

        <PageSection>
          <NewsletterSignup
            title={
              lang === "fa"
                ? "از جدیدترین مقالات ما باخبر شوید"
                : "Stay Updated with Our Research"
            }
            subtitle={
              lang === "fa"
                ? "ایمیل خود را وارد کنید تا جدیدترین مقالات علمی، یافته‌های پژوهشی و وبینارها را دریافت کنید."
                : "Enter your email to receive our latest scientific papers, research findings, and webinars."
            }
            buttonText={lang === "fa" ? "عضویت" : "Subscribe"}
            placeholder={
              lang === "fa" ? "ایمیل خود را وارد کنید" : "Enter your email"
            }
          />
        </PageSection>
      */}
      </MainWrapper>
    </div>
  );
};

export default PublicationsComponent;
