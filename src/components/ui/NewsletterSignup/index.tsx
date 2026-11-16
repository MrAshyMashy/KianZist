"use client";

import { Send } from "lucide-react";
import Typography from "@/typography";
import { TiltCard, Magnetic } from "@/components/ui/Fx";
import { Input } from "@/components/ui/Input";
import { GradientButton } from "@/components/ui/GradientButton";
import { cn } from "@/lib/utils";

interface NewsletterSignupProps {
  title: string;
  subtitle: string;
  placeholder?: string;
  buttonText?: string;
  className?: string;
}

export const NewsletterSignup = ({
  title,
  subtitle,
  placeholder = "ایمیل خود را وارد کنید",
  buttonText = "عضویت",
  className,
}: NewsletterSignupProps) => {
  return (
    <TiltCard
      tone="primary"
      maxTilt={4}
      blur={16} // Changed from 4 to 16 to match Fx standard
      className={cn("w-full rounded-[2.5rem]", className)}
      bgClassName="bg-kz-bg-surface/30" // Changed from /80 to /30 to match Fx standard
      contentClassName="flex flex-col items-center justify-center p-8 text-center md:p-12"
    >
      <Typography
        variant="cardTitle"
        as="h3"
        className="mb-3 text-2xl font-bold text-kz-text-heading"
      >
        {title}
      </Typography>
      <Typography
        variant="body"
        as="p"
        className="mb-8 max-w-md text-kz-text-muted"
      >
        {subtitle}
      </Typography>

      <form
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
        onSubmit={(e) => e.preventDefault()}
        style={{ transform: "translateZ(20px)" }}
      >
        <Input
          type="email"
          placeholder={placeholder}
          // Changed to /20 to allow the card's glass effect to shine through the input
          className="flex-1 rounded-full bg-kz-bg-surface/20 py-3 backdrop-blur-md border-kz-border-main/50"
        />
        <Magnetic strength={0.15}>
          <GradientButton type="submit" className="w-full px-8 py-3 sm:w-auto">
            <span className="flex items-center gap-2">
              {buttonText}
              <Send size={16} className="rtl:-scale-x-100" />
            </span>
          </GradientButton>
        </Magnetic>
      </form>
    </TiltCard>
  );
};
