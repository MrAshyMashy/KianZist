"use client";

import { ReactNode } from "react";
import Typography from "@/typography";
import { CountUp, TiltCard } from "@/components/ui/Fx";
import { IconBox } from "@/components/ui/IconBox"; // Imported IconBox
import { getAlternateColors } from "@/lib/color-switcher";
import { cn } from "@/lib/utils";

interface MetricBlockProps {
  index: number;
  value: string;
  label: string;
  icon?: ReactNode;
  className?: string;
}

export const MetricBlock = ({
  index,
  value,
  label,
  icon,
  className,
}: MetricBlockProps) => {
  const colors = getAlternateColors(index);

  return (
    <TiltCard
      tone={colors.tone}
      maxTilt={4}
      className={cn("h-full rounded-2xl", className)}
      contentClassName="flex flex-col items-center justify-center gap-2 px-4 py-6 md:py-8"
    >
      {icon && (
        // Replaced the custom div with the project's IconBox component
        <IconBox
          tone={colors.tone}
          size="md"
          shape="square"
          className="mb-2"
          style={{ transform: "translateZ(20px)" }}
        >
          {icon}
        </IconBox>
      )}
      <Typography
        variant="metric"
        className="text-kz-text-heading drop-shadow-sm"
        style={{ transform: "translateZ(15px)" }}
      >
        <CountUp value={value} />
      </Typography>
      <Typography
        variant="tiny"
        className="font-medium uppercase tracking-wider text-kz-text-muted"
        style={{ transform: "translateZ(10px)" }}
      >
        {label}
      </Typography>
    </TiltCard>
  );
};
