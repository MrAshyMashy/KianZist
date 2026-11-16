"use client";

import { Phone, MapPin, Send, ShieldCheck, Microscope } from "lucide-react";
import Typography from "@/typography";
import { MotionContainer, MotionItem } from "@/components/ui/Motion";
import { TiltCard } from "@/components/ui/Fx";
import { Section } from "@/components/ui/Section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { GradientButton } from "@/components/ui/GradientButton";
import { cn } from "@/lib/utils";
import { SECTION_CLASS } from "./SectionHeader";

const field = "flex flex-col gap-1.5";

export const Consultation = ({
  data,
  lang,
}: {
  data: any;
  lang: "fa" | "en";
}) => {
  const isRTL = lang === "fa";

  return (
    <Section className={SECTION_CLASS}>
      <div className="grid w-full grid-cols-1 items-center gap-[clamp(1.25rem,5vh,4rem)] lg:grid-cols-2 lg:gap-x-16">
        {/* ───────── Left: text + contact ───────── */}
        <MotionContainer
          className="flex w-full flex-col justify-center"
          stagger={0.15}
          delay={0.2}
        >
          <MotionItem className="mb-[var(--kz-block-gap)]">
            <LiveBadge
              variant="primary"
              icon={<Microscope size={14} />}
              textClassName="font-sans font-semibold normal-case tracking-normal"
            >
              {data.badge}
            </LiveBadge>
          </MotionItem>

          <MotionItem className="mb-[var(--kz-block-gap)]">
            <Typography
              variant="sectionTitle"
              as="h2"
              className="text-kz-text-heading"
            >
              {data.title}
            </Typography>
          </MotionItem>

          <MotionItem className="mb-[calc(var(--kz-block-gap)*1.5)] w-full lg:max-w-lg">
            <Typography
              variant="body"
              as="p"
              className="leading-relaxed text-kz-text-muted"
            >
              {data.subtitle}
            </Typography>
          </MotionItem>

          <MotionItem className="w-full">
            <TiltCard
              tone="primary"
              maxTilt={3}
              blur={6}
              className="w-full rounded-2xl lg:max-w-lg"
              contentClassName="flex flex-col gap-[var(--kz-block-gap)] p-[var(--kz-card-pad)]"
            >
              <div
                className="flex items-center gap-4"
                style={{ transform: "translateZ(18px)" }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kz-brand-accent/25 bg-kz-brand-accent/10 text-kz-brand-accent">
                  <Phone size={18} />
                </div>
                <div className="flex flex-col">
                  <Typography
                    variant="tiny"
                    className="mb-0.5 font-medium text-kz-text-muted"
                  >
                    {data.hotlineLabel}
                  </Typography>
                  <Typography
                    variant="stat"
                    className="font-medium text-kz-brand-accent"
                    dir="ltr"
                  >
                    {data.hotlineValue}
                  </Typography>
                </div>
              </div>

              <div className="h-px w-full bg-kz-border-main" />

              <div
                className="flex items-center gap-4"
                style={{ transform: "translateZ(14px)" }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kz-border-main bg-kz-bg-sunken text-kz-text-heading">
                  <MapPin size={18} />
                </div>
                <div className="flex flex-col">
                  <Typography
                    variant="tiny"
                    className="mb-0.5 font-medium text-kz-text-muted"
                  >
                    {data.addressLabel}
                  </Typography>
                  <Typography
                    variant="label"
                    className="font-medium text-kz-text-heading"
                  >
                    {data.addressValue}
                  </Typography>
                </div>
              </div>
            </TiltCard>
          </MotionItem>
        </MotionContainer>

        {/* ───────── Right: form ───────── */}
        <MotionContainer className="w-full" stagger={0.1} delay={0.3}>
          <MotionItem>
            <TiltCard
              tone="secondary"
              maxTilt={1.5}
              blur={6}
              className="w-full rounded-[2rem]"
              contentClassName="p-[calc(var(--kz-card-pad)*1.2)]"
            >
              <form
                className="flex flex-col gap-[clamp(0.7rem,2vh,1.25rem)]"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 gap-[clamp(0.7rem,2vh,1.25rem)] md:grid-cols-2">
                  <div className={field}>
                    <Label htmlFor="fullName">{data.form.nameLabel}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={data.form.namePlaceholder}
                    />
                  </div>
                  <div className={field}>
                    <Label htmlFor="farmName">{data.form.farmLabel}</Label>
                    <Input
                      id="farmName"
                      type="text"
                      placeholder={data.form.farmPlaceholder}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-[clamp(0.7rem,2vh,1.25rem)] md:grid-cols-2">
                  <div className={field}>
                    <Label htmlFor="cropType">{data.form.cropLabel}</Label>
                    <Input
                      id="cropType"
                      type="text"
                      placeholder={data.form.cropPlaceholder}
                    />
                  </div>
                  <div className={field}>
                    <Label htmlFor="phoneNumber">{data.form.phoneLabel}</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder={data.form.phonePlaceholder}
                      dir="ltr"
                      style={{ textAlign: isRTL ? "right" : "left" }}
                    />
                  </div>
                </div>

                <div className={field}>
                  <Label htmlFor="message">{data.form.messageLabel}</Label>
                  <Textarea
                    id="message"
                    rows={3}
                    placeholder={data.form.messagePlaceholder}
                  />
                </div>

                {/* Footer: content-sized button on ≥sm + shrinkable privacy
                    note (min-w-0 lets its text wrap instead of overflowing). */}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <GradientButton
                    type="submit"
                    className="w-full max-w-full px-6 py-3 sm:w-auto"
                    icon={
                      <Send size={16} className={cn(isRTL && "-scale-x-100")} />
                    }
                  >
                    {data.form.submitButton}
                  </GradientButton>

                  <div className="flex min-w-0 items-center justify-center gap-2 text-kz-text-muted sm:justify-end">
                    <ShieldCheck size={16} className="shrink-0" />
                    <Typography
                      variant="tiny"
                      className="font-medium text-center sm:text-end"
                    >
                      {data.form.privacyText}
                    </Typography>
                  </div>
                </div>
              </form>
            </TiltCard>
          </MotionItem>
        </MotionContainer>
      </div>
    </Section>
  );
};
