"use client";

import { useRef } from "react";
import NitrogenCycleBackground from "./NitrogenCycleBackground";
import { useLanguage } from "@/providers/LanguageProvider";
import { useEffects } from "@/providers/EffectsProvider";
import { enTrainingData } from "@/data/en/training";
import { faTrainingData } from "@/data/fa/training";
import { Hero } from "./Hero";
import { Pillars } from "./Pillars";
import { StepGuide } from "./StepGuide";
import { Resources } from "./Resources";
import { CaseStudies } from "./CaseStudies";
import { FAQ } from "./FAQ";
import { CTA } from "./CTA";
import { MainWrapper } from "@/components/ui/MainWrapper";
import { PageSection } from "@/components/ui/PageSection";

const TrainingComponent = () => {
  const { effectsEnabled } = useEffects();
  const { lang } = useLanguage();
  const data = lang === "fa" ? faTrainingData : enTrainingData;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      {effectsEnabled && (
        <NitrogenCycleBackground scrollContainerRef={scrollRef} />
      )}

      <MainWrapper>
        {/* <PageSection isFirst>
          <Hero data={data.hero} lang={lang} />
        </PageSection>

        <PageSection>
          <Pillars data={data.pillars} lang={lang} />
        </PageSection>

        <PageSection>
          <StepGuide data={data.stepGuide} lang={lang} />
        </PageSection>

        <PageSection>
          <Resources data={data.resources} lang={lang} />
        </PageSection>

        <PageSection>
          <CaseStudies data={data.caseStudies} lang={lang} />
        </PageSection>

        <PageSection>
          <FAQ data={data.faq} lang={lang} />
        </PageSection>

        <PageSection>
          <CTA data={data.cta} lang={lang} />
        </PageSection> */}
      </MainWrapper>
    </div>
  );
};

export default TrainingComponent;
