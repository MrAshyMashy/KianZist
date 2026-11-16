"use client";

import { useRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useEffects } from "@/providers/EffectsProvider";
import { enProductsData } from "@/data/en/products";
import { faProductsData } from "@/data/fa/products";
import Hero from "./Hero";
import FiltersBar from "./FiltersBar";
import { ProductShowcase } from "./ProductShowcase";
import { PipelineSection } from "./PipelineSection";
import { ApplicationMatrix } from "./ApplicationMatrix";
import { VerificationProtocol } from "./VerificationProtocol";
import { PilotTrialForm } from "./PilotTrialForm";
import { MainWrapper } from "@/components/ui/MainWrapper";
import { PageSection } from "@/components/ui/PageSection";
import RhizosphereBackground2D from "./RhizosphereBackground2D"; // Changed to 2D explicitly

const ProductsComponent = () => {
  const { effectsEnabled } = useEffects();
  const { lang } = useLanguage();
  const data = lang === "fa" ? faProductsData : enProductsData;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar relative h-[calc(100vh-4rem)] w-full overflow-y-auto overflow-x-hidden lg:scroll-smooth"
    >
      {effectsEnabled && (
        <RhizosphereBackground2D scrollContainerRef={scrollRef} />
      )}

      <MainWrapper>
        <PageSection isFirst>
          <Hero data={data} />
        </PageSection>

        <PageSection>
          <FiltersBar data={data.filters} lang={lang} />
        </PageSection>

        <PageSection>
          <ProductShowcase data={data} lang={lang} />
        </PageSection>

        {data.pipeline && (
          <PageSection>
            <PipelineSection data={data.pipeline} lang={lang} />
          </PageSection>
        )}

        {data.matrix && (
          <PageSection>
            <ApplicationMatrix data={data.matrix} lang={lang} />
          </PageSection>
        )}

        {data.verification && (
          <PageSection>
            <VerificationProtocol data={data.verification} lang={lang} />
          </PageSection>
        )}

        {data.pilotForm && (
          <PageSection>
            <PilotTrialForm data={data.pilotForm} lang={lang} />
          </PageSection>
        )}
      </MainWrapper>
    </div>
  );
};

export default ProductsComponent;
