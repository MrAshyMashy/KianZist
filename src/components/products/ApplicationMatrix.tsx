"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { cn } from "@/lib/utils";
import { getAlternateColors } from "@/lib/color-switcher";

interface ApplicationMatrixProps {
  data: any;
  lang: "fa" | "en";
}

export const ApplicationMatrix = ({ data, lang }: ApplicationMatrixProps) => {
  const isRTL = lang === "fa";
  const [hectares, setHectares] = useState<number>(10);

  const handleHectareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setHectares(isNaN(val) || val < 0 ? 0 : val);
  };

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer stagger={0} delay={0.2}>
        <MotionItem variant="fadeUp">
          <TiltCard
            tone="primary"
            maxTilt={2}
            blur={4}
            className="w-full rounded-[2rem]"
            bgClassName="bg-kz-bg-surface/60"
            contentClassName="flex flex-col p-6 md:p-8 lg:p-10"
          >
            {/* ───────── Header ───────── */}
            <div className="mb-8 flex w-full flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-3xl">
                <Typography
                  variant="eyebrow"
                  className="mb-2 font-mono uppercase tracking-widest text-kz-brand-accent"
                >
                  {data.eyebrow}
                </Typography>
                <Typography
                  variant="sectionTitle"
                  as="h2"
                  className="text-kz-text-heading"
                >
                  {data.title}
                </Typography>
              </div>

              {/* Calculator Widget */}
              <div className="flex-shrink-0 self-start lg:self-auto">
                <GlassSurface
                  variant="light"
                  className="flex items-center gap-3 rounded-full border border-kz-brand-accent/30 bg-kz-brand-accent/5 px-4 py-2"
                >
                  <Calculator size={18} className="text-kz-brand-accent" />
                  <Typography
                    variant="caption"
                    className="font-medium text-kz-text-heading"
                  >
                    {data.calculatorLabel}
                  </Typography>
                  <input
                    type="number"
                    value={hectares || ""}
                    onChange={handleHectareChange}
                    className="w-12 bg-transparent text-center font-mono text-lg font-bold text-kz-brand-accent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={data.calculatorLabel}
                  />
                  <Typography
                    variant="caption"
                    className="font-medium text-kz-text-muted"
                  >
                    {data.calculatorUnit}
                  </Typography>
                </GlassSurface>
              </div>
            </div>

            {/* ───────── Table / Matrix ───────── */}
            <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-kz-border-subtle/50">
              {/* Table Header (Desktop) */}
              <div className="hidden w-full grid-cols-6 gap-4 bg-kz-bg-sunken/80 px-6 py-4 lg:grid">
                {data.columns.map((col: string, i: number) => (
                  <Typography
                    key={i}
                    variant="label"
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider text-kz-text-muted",
                      i === 3 && "text-center",
                      i === 1 && isRTL && "text-right",
                    )}
                  >
                    {col}
                  </Typography>
                ))}
              </div>

              {/* Table Body */}
              <div className="flex flex-col">
                {data.rows.map((row: any, index: number) => {
                  const colors = getAlternateColors(index);

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "grid w-full grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-6 lg:items-center",
                        "border-t border-kz-border-subtle/30 transition-colors hover:bg-kz-bg-surface/40",
                      )}
                    >
                      {/* Phase */}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            colors.bg.replace("/10", ""),
                            colors.shadow,
                          )}
                        />
                        <Typography
                          variant="label"
                          className="font-semibold text-kz-text-heading"
                        >
                          {row.phase}
                        </Typography>
                      </div>

                      {/* Formulation */}
                      <div>
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-kz-text-muted lg:hidden">
                          {data.columns[1]}
                        </span>
                        <Typography
                          variant="label"
                          className={cn("font-semibold", colors.text)}
                        >
                          {row.formulation}
                        </Typography>
                      </div>

                      {/* Dose */}
                      <div>
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-kz-text-muted lg:hidden">
                          {data.columns[2]}
                        </span>
                        <Typography
                          variant="caption"
                          className="font-mono text-kz-text-heading"
                          dir="ltr"
                        >
                          {row.dose}
                        </Typography>
                      </div>

                      {/* Calculated Batch */}
                      <div className="lg:text-center">
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-kz-text-muted lg:hidden">
                          {data.columns[3]}
                        </span>
                        <Typography
                          variant="stat"
                          className="font-bold text-kz-text-heading"
                        >
                          {row.doseMultiplier * hectares}{" "}
                          <span className="text-sm font-normal text-kz-text-muted">
                            {lang === "fa" ? "لیتر" : "Liters"}
                          </span>
                        </Typography>
                      </div>

                      {/* Application Vector */}
                      <div>
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-kz-text-muted lg:hidden">
                          {data.columns[4]}
                        </span>
                        <Typography
                          variant="caption"
                          className="text-kz-text-muted"
                        >
                          {row.vector}
                        </Typography>
                      </div>

                      {/* Agronomic Objective */}
                      <div>
                        <span className="mb-1 block text-[11px] uppercase tracking-wider text-kz-text-muted lg:hidden">
                          {data.columns[5]}
                        </span>
                        <Typography
                          variant="caption"
                          className="leading-relaxed text-kz-text-muted"
                        >
                          {row.objective}
                        </Typography>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TiltCard>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
