"use client";

import { useState } from "react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard, Magnetic } from "@/components/ui/Fx";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/Section";

interface FiltersBarProps {
  data: any;
  lang: "fa" | "en";
}

const FiltersBar = ({ data, lang }: FiltersBarProps) => {
  const isRTL = lang === "fa";
  const [activeTab, setActiveTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("all");

  const cropOptions = [
    {
      value: "all",
      label: isRTL ? "تمامی محصولات زراعی و باغی" : "All Target Crops",
    },
    { value: "pistachio", label: isRTL ? "پسته" : "Pistachio" },
    { value: "date", label: isRTL ? "نخل خرما" : "Date Palm" },
    { value: "citrus", label: isRTL ? "مرکبات" : "Citrus" },
    { value: "wheat", label: isRTL ? "گندم" : "Wheat" },
  ];

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer stagger={0.1} delay={0.2}>
        <MotionItem variant="fadeUp">
          <TiltCard
            tone="secondary"
            maxTilt={2}
            blur={4}
            className="w-full rounded-[2rem]"
            contentClassName="p-3 lg:p-5"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Tabs */}
              <div
                className="flex flex-wrap items-center gap-2 px-2 lg:w-1/2 lg:px-0"
                style={{ transform: "translateZ(15px)" }}
              >
                {data.tabs.map((tab: any) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Magnetic key={tab.id} strength={0.15}>
                      <Button
                        onClick={() => setActiveTab(tab.id)}
                        variant={isActive ? "primary" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-full px-5 py-2.5 transition-all duration-300",
                          isActive && "kz-shimmer shadow-kz-glow-accent",
                          !isActive &&
                            "border-transparent bg-kz-bg-sunken/60 text-kz-text-muted shadow-none hover:bg-kz-bg-sunken hover:text-kz-text-heading",
                        )}
                      >
                        <Typography
                          variant="label"
                          className={cn(
                            "whitespace-nowrap font-medium",
                            isActive && "text-kz-brand-primaryText",
                          )}
                        >
                          {tab.label}
                        </Typography>
                      </Button>
                    </Magnetic>
                  );
                })}
              </div>

              {/* Search & Dropdown Area */}
              <div
                className="flex w-full flex-col gap-3 px-2 pb-2 sm:flex-row lg:w-[600px] lg:px-0 lg:pb-0 xl:w-[650px]"
                style={{ transform: "translateZ(25px)" }}
              >
                {/* Search Input */}
                <div className="w-full flex-1">
                  <SearchInput
                    placeholder={data.searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>

                {/* Dropdown */}
                <div className="w-full shrink-0 sm:w-[260px]">
                  <Select
                    options={cropOptions}
                    value={selectedCrop}
                    onChange={setSelectedCrop}
                    placeholder={data.dropdownPlaceholder}
                  />
                </div>
              </div>
            </div>
          </TiltCard>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};

export default FiltersBar;
