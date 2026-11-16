"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Typography from "@/typography";
import { CountUp, useTiltShift } from "@/components/ui/Fx";

interface HUDFigureProps {
  src: string;
  alt: string;
  terminal: string;
  colonizationTitle: string;
  colonizationValue: string;
  colonizationSub: string;
  /** Optional class to override the image container border radius */
  className?: string;
}

export const HUDFigure = ({
  src,
  alt,
  terminal,
  colonizationTitle,
  colonizationValue,
  colonizationSub,
  className = "rounded-[inherit]",
}: HUDFigureProps) => {
  const photo = useTiltShift(16);

  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Photo + scrim + HUD (flattened layer) */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <motion.div
          className="absolute -inset-5"
          style={{ x: photo.x, y: photo.y }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover object-center"
            priority
          />
        </motion.div>

        {/* Legibility scrim: same in light & dark so overlay text never disappears */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {/* Scan line */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="kz-scan absolute inset-x-0 top-0 h-[16%]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(39,215,166,0.07) 70%, rgba(39,215,166,0.35) 99%, transparent)",
            }}
          />
        </div>

        {/* HUD corner brackets */}
        <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 rounded-tl-md border-l-2 border-t-2 border-white/35" />
        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 rounded-tr-md border-r-2 border-t-2 border-white/35" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 rounded-bl-md border-b-2 border-l-2 border-white/35" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 rounded-br-md border-b-2 border-r-2 border-white/35" />
      </div>

      {/* Terminal pill — always dark glass over the photo */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-[5px] rtl:left-auto rtl:right-4"
        style={{ transform: "translateZ(55px)" }}
      >
        <Typography
          variant="tiny"
          className="font-mono tracking-wider text-kz-media-text/85"
        >
          {terminal}
        </Typography>
        <div className="h-1.5 w-1.5 rounded-full bg-kz-media-accent shadow-kz-glow-accent" />
      </div>

      {/* Colonization readout */}
      <div
        className="absolute bottom-20 left-4 right-4 z-10"
        style={{ transform: "translateZ(40px)" }}
      >
        <div className="mb-1 flex items-end justify-between">
          <Typography
            variant="tiny"
            className="uppercase tracking-widest text-kz-media-text/80"
          >
            {colonizationTitle}
          </Typography>
          <Typography
            variant="stat"
            className="text-kz-media-accent drop-shadow-kz-media"
          >
            <CountUp value={colonizationValue} delay={0.9} />
          </Typography>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "94.8%" }}
            viewport={{ once: false }}
            transition={{ duration: 1.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="kz-shimmer h-full rounded-full bg-kz-media-accent shadow-kz-glow-accent"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <Typography variant="tiny" className="text-kz-media-text/70">
            {colonizationSub}
          </Typography>
        </div>
      </div>
    </div>
  );
};
