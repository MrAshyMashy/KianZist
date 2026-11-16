"use client";

import { ReactNode } from "react";
import { TiltCard } from "@/components/ui/Fx";
import { cn } from "@/lib/utils";

interface BentoGridCardProps {
  children: ReactNode;
  className?: string; // For grid spans (e.g., lg:col-span-2 row-span-2)
  tone?: "primary" | "secondary" | "pistachio";
  bgImage?: string;
}

export const BentoGridCard = ({
  children,
  className,
  tone = "primary",
  bgImage,
}: BentoGridCardProps) => {
  return (
    <TiltCard
      tone={tone}
      maxTilt={3}
      className={cn(
        "relative h-full min-h-[250px] overflow-hidden rounded-[2rem]",
        className,
      )}
      contentClassName="relative z-10 flex h-full flex-col p-6 md:p-8"
    >
      {bgImage && (
        <div
          className="absolute inset-0 z-0 opacity-10 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      {children}
    </TiltCard>
  );
};
