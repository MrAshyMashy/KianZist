import Image from "next/image";
import { ReactNode } from "react";
import { TiltCard, Tone } from "@/components/ui/Fx";
import { cn } from "@/lib/utils";

interface ImageBackgroundCardProps {
  image: string;
  alt: string;
  children: ReactNode;
  className?: string;
  tone?: Tone;
}

export const ImageBackgroundCard = ({
  image,
  alt,
  children,
  className,
  tone = "primary",
}: ImageBackgroundCardProps) => {
  return (
    <TiltCard
      tone={tone}
      maxTilt={3}
      blur={16}
      className={cn("group h-full min-h-[380px] rounded-[2rem]", className)}
      bgClassName="bg-kz-bg-surface/30" // Deep glass effect
      contentClassName="relative flex h-full flex-col justify-between p-6 md:p-8"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover opacity-50 dark:opacity-30 transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlay to ensure text readability while keeping the top image visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-kz-bg-surface via-kz-bg-surface/80 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </TiltCard>
  );
};
