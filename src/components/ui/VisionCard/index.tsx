"use client";

import { ReactNode } from "react";
import Typography from "@/typography";
import { TiltCard } from "@/components/ui/Fx";
import { IconBox } from "@/components/ui/IconBox";
import { cn } from "@/lib/utils";

interface VisionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  tone?: "primary" | "secondary" | "pistachio";
  className?: string;
}

export const VisionCard = ({
  icon,
  title,
  description,
  tone = "primary",
  className,
}: VisionCardProps) => {
  return (
    <TiltCard
      tone={tone}
      maxTilt={4}
      className={cn("h-full rounded-[2rem]", className)}
      bgClassName="bg-kz-bg-surface/60"
      contentClassName="flex h-full flex-col items-start p-8"
    >
      {/* Fixed: Map 'pistachio' to 'primary' for IconBox compatibility */}
      <IconBox
        tone={tone === "pistachio" ? "primary" : tone}
        size="lg"
        className="mb-6"
        style={{ transform: "translateZ(25px)" }}
      >
        {icon}
      </IconBox>

      <div style={{ transform: "translateZ(15px)" }}>
        <Typography
          variant="cardTitle"
          as="h3"
          className="mb-3 text-xl font-bold text-kz-text-heading"
        >
          {title}
        </Typography>
        <Typography
          variant="body"
          as="p"
          className="leading-relaxed text-kz-text-muted"
        >
          {description}
        </Typography>
      </div>
    </TiltCard>
  );
};
