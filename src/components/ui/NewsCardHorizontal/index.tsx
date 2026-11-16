"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Typography from "@/typography";
import { TiltCard } from "@/components/ui/Fx";
import { cn } from "@/lib/utils";

interface NewsCardHorizontalProps {
  image: string;
  category: string;
  title: string;
  date: string;
  lang?: "fa" | "en";
}

export const NewsCardHorizontal = ({
  image,
  category,
  title,
  date,
  lang = "fa",
}: NewsCardHorizontalProps) => {
  const isRTL = lang === "fa";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <TiltCard
      tone="secondary"
      maxTilt={4}
      className="w-full rounded-2xl"
      contentClassName="flex flex-col sm:flex-row h-full"
    >
      {/* Image */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-t-2xl sm:h-auto sm:w-2/5 sm:rounded-s-2xl sm:rounded-tr-none">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Typography
              variant="tiny"
              className="font-bold text-kz-brand-secondary uppercase tracking-widest"
            >
              {category}
            </Typography>
            <Typography variant="tiny" className="font-mono text-kz-text-muted">
              {date}
            </Typography>
          </div>
          <Typography
            variant="cardTitle"
            className="mb-2 line-clamp-2 text-lg font-bold text-kz-text-heading"
          >
            {title}
          </Typography>
        </div>

        <div className="mt-4 flex items-center justify-end text-kz-brand-secondary">
          <ArrowIcon
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      </div>
    </TiltCard>
  );
};
