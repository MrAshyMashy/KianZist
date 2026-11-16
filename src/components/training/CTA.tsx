"use client";

import { CheckCircle2, Send } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { Section } from "@/components/ui/Section";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TiltCard } from "@/components/ui/Fx";
import { GradientButton } from "@/components/ui/GradientButton";
import { cn } from "@/lib/utils";

interface CTAProps {
  data: any;
  lang: "fa" | "en";
}

export const CTA = ({ data, lang }: CTAProps) => {
  const isRTL = lang === "fa";

  return (
    <Section className="relative w-full !py-0">
      <MotionContainer stagger={0} delay={0.2}>
        <MotionItem variant="fadeUp">
          <TiltCard
            tone="primary"
            maxTilt={2}
            blur={16} // Changed from 4 to 16 to match Fx standard
            className="w-full rounded-[2.5rem]"
            bgClassName="bg-kz-bg-surface/30" // Changed from /60 to /30 to match Fx standard
            contentClassName={cn(
              "relative flex w-full flex-col overflow-hidden rounded-[inherit]",
              "lg:flex-row-reverse lg:items-center lg:justify-between p-8 lg:p-12 xl:p-16",
              isRTL && "lg:flex-row",
            )}
          >
            {/* ───────── Text Content ───────── */}
            <div className="relative z-10 flex w-full flex-col lg:w-1/2">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-kz-border-subtle bg-kz-bg-sunken/50 px-4 py-1.5">
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kz-brand-accent opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-kz-brand-accent" />
                </span>
                <Typography
                  variant="tiny"
                  className="font-mono tracking-widest text-kz-text-heading"
                >
                  {data.badge}
                </Typography>
              </div>

              <Typography
                variant="display"
                as="h2"
                className="mb-6 font-bold leading-tight text-kz-text-heading md:text-4xl lg:text-[40px]"
              >
                {data.title}
              </Typography>

              <Typography
                variant="bodyLarge"
                as="p"
                className="mb-8 max-w-xl leading-relaxed text-kz-text-muted"
              >
                {data.description}
              </Typography>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {data.features.map((feature: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-kz-text-heading"
                  >
                    <CheckCircle2 size={18} className="text-kz-brand-accent" />
                    <Typography variant="label" className="font-medium">
                      {feature}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>

            {/* ───────── Form Card ───────── */}
            <div className="relative z-10 mt-10 w-full lg:mt-0 lg:w-[45%] xl:w-[40%]">
              {/* Changed inner background to be glassy to match the outer card */}
              <div className="w-full rounded-[1.5rem] border border-kz-border-main/50 bg-kz-bg-surface/20 p-6 shadow-kz-card backdrop-blur-xl md:p-8">
                <div className="mb-6 text-center lg:text-start">
                  <Typography
                    variant="cardTitle"
                    as="h3"
                    className="mb-2 text-xl font-bold text-kz-text-heading"
                  >
                    {data.form.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    as="p"
                    className="leading-relaxed text-kz-text-muted"
                  >
                    {data.form.subtitle}
                  </Typography>
                </div>

                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => e.preventDefault()}
                >
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ctaName" className="text-kz-text-heading">
                      {data.form.nameLabel}
                    </Label>
                    <Input
                      id="ctaName"
                      type="text"
                      placeholder={data.form.namePlaceholder}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ctaEmail" className="text-kz-text-heading">
                      {data.form.emailLabel}
                    </Label>
                    <Input
                      id="ctaEmail"
                      type="email"
                      placeholder={data.form.emailPlaceholder}
                      dir="ltr"
                      style={{ textAlign: isRTL ? "right" : "left" }}
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ctaPhone" className="text-kz-text-heading">
                      {data.form.phoneLabel}
                    </Label>
                    <Input
                      id="ctaPhone"
                      type="tel"
                      placeholder={data.form.phonePlaceholder}
                      dir="ltr"
                      style={{ textAlign: isRTL ? "right" : "left" }}
                    />
                  </div>

                  {/* Submit Button */}
                  <GradientButton
                    type="submit"
                    className="mt-4 w-full py-3.5"
                    icon={
                      <Send size={16} className={cn(isRTL && "-scale-x-100")} />
                    }
                  >
                    {data.form.submitButton}
                  </GradientButton>
                </form>
              </div>
            </div>
          </TiltCard>
        </MotionItem>
      </MotionContainer>
    </Section>
  );
};
