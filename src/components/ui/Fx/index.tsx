"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  motionValue,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { GlassBase } from "@/components/ui/GlassBase";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   Tones — main glow + complementary glow (green ↔ azure)
   ════════════════════════════════════════════════════════════ */
export type Tone = "primary" | "secondary" | "pistachio";

const TONES: Record<Tone, { main: string; alt: string }> = {
  primary: { main: "39,215,166", alt: "59,150,255" },
  secondary: { main: "59,150,255", alt: "39,215,166" },
  pistachio: { main: "170,230,80", alt: "39,215,166" },
};

export const toneFromAccent = (accent?: string): Tone =>
  accent === "secondary" || accent === "pistachio" ? accent : "primary";

/* ════════════════════════════════════════════════════════════
   Tilt context — lets children react to the pointer (parallax)
   px / py are in the range -0.5 … 0.5
   ════════════════════════════════════════════════════════════ */
const ZERO = motionValue(0);
const TiltCtx = createContext<{
  px: MotionValue<number>;
  py: MotionValue<number>;
}>({
  px: ZERO,
  py: ZERO,
});

/** Returns x / y MotionValues (in px) that follow the card pointer. */
export const useTiltShift = (range = 12) => {
  const { px, py } = useContext(TiltCtx);
  const x = useTransform(px, [-0.5, 0.5], [-range, range]);
  const y = useTransform(py, [-0.5, 0.5], [-range, range]);
  return { x, y };
};

/* ════════════════════════════════════════════════════════════
   TiltCard — soft-neumorphic glass card with 3D perspective tilt,
   cursor-following green/azure glow, a static gradient border, 
   and a lit border that follows the cursor.
   ════════════════════════════════════════════════════════════ */
interface TiltCardProps {
  children: ReactNode;
  /** Put the radius here, e.g. "rounded-3xl". Children inherit it. */
  className?: string;
  contentClassName?: string;
  /** Override the background class (default is highly transparent for a true glass effect) */
  bgClassName?: string;
  tone?: Tone;
  maxTilt?: number;
  /** backdrop blur in px (12–16 looks best for glass) */
  blur?: number;
  perspective?: number;
  hoverScale?: number;
}

export const TiltCard = ({
  children,
  className = "",
  contentClassName = "",
  // CHANGED: Reduced opacity from /85 to /30 for a true glassmorphism effect
  bgClassName = "bg-kz-bg-surface/30",
  tone = "primary",
  maxTilt = 4,
  // CHANGED: Increased default blur from 6 to 16 for a deeper frosted glass look
  blur = 16,
  perspective = 1100,
  hoverScale = 1.008,
}: TiltCardProps) => {
  const { main, alt } = TONES[tone];
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const hover = useMotionValue(0);

  const sx = useSpring(px, { stiffness: 170, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 170, damping: 20, mass: 0.6 });
  const glow = useSpring(hover, { stiffness: 120, damping: 22 });

  const rotateX = useTransform(sy, (v) => -v * maxTilt * 2);
  const rotateY = useTransform(sx, (v) => v * maxTilt * 2);
  const scale = useTransform(glow, [0, 1], [1, hoverScale]);

  // mirrored point → second (complementary) glow
  const ax = useTransform(gx, (v) => (ref.current?.offsetWidth ?? 0) - v);
  const ay = useTransform(gy, (v) => (ref.current?.offsetHeight ?? 0) - v);

  const glowMain = useMotionTemplate`radial-gradient(380px circle at ${gx}px ${gy}px, rgba(${main},0.14), transparent 62%)`;
  const glowAlt = useMotionTemplate`radial-gradient(300px circle at ${ax}px ${ay}px, rgba(${alt},0.09), transparent 65%)`;
  const borderGlow = useMotionTemplate`radial-gradient(260px circle at ${gx}px ${gy}px, rgba(${main},0.75), rgba(${alt},0.32) 45%, transparent 72%)`;

  useEffect(() => {
    enabled.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const onEnter = () => {
    if (enabled.current) hover.set(1);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    gx.set(x);
    gy.set(y);
    px.set(x / r.width - 0.5);
    py.set(y / r.height - 0.5);
  };

  const onLeave = () => {
    px.set(0);
    py.set(0);
    hover.set(0);
  };

  const blurStyle = blur > 0 ? `blur(${blur}px)` : undefined;

  return (
    <div
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative ${className}`}
      style={{ perspective }}
    >
      <TiltCtx.Provider value={{ px: sx, py: sy }}>
        <motion.div
          className="relative h-full w-full rounded-[inherit]"
          style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}
        >
          {/* Glass + soft neumorphic surface (Lighter layer) */}
          <GlassBase
            aria-hidden
            variant="transparent" // Using transparent variant so it doesn't force a solid bg
            className={cn(
              "kz-neo pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] border border-kz-border-main",
              bgClassName, // Applying the highly transparent background here
            )}
            style={{
              backdropFilter: blurStyle,
              WebkitBackdropFilter: blurStyle,
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: glowMain, opacity: glow }}
            />
            <motion.div
              className="absolute inset-0"
              style={{ background: glowAlt, opacity: glow }}
            />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
          </GlassBase>

          {/* Static Gradient Border (Masked to prevent bleed, z-10) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-kz-brand-gradient opacity-[0.14] dark:opacity-[0.22]"
            style={{
              padding: 1,
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Lit border that follows the cursor (z-20, on top of static border) */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
            style={{
              padding: 1,
              background: borderGlow,
              opacity: glow,
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Content */}
          <div
            className={`relative z-30 h-full rounded-[inherit] ${contentClassName}`}
            style={{ transformStyle: "preserve-3d" }}
          >
            {children}
          </div>
        </motion.div>
      </TiltCtx.Provider>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   Magnetic — element gently follows the cursor (buttons, CTAs)
   ════════════════════════════════════════════════════════════ */
export const Magnetic = ({
  children,
  strength = 0.25,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2 - x.get();
    const cy = r.top + r.height / 2 - y.get();
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.div>
  );
};

/* ════════════════════════════════════════════════════════════
   CountUp — counts a number inside any string, keeps prefix/suffix,
   thousands separators, decimals and Persian / Arabic digits.
   Writes straight to the DOM → no re-renders.
   ════════════════════════════════════════════════════════════ */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
const toLatin = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
const toFa = (s: string) => s.replace(/\d/g, (d) => FA[+d]);

export const CountUp = ({
  value,
  duration = 1.6,
  delay = 0,
  className,
}: {
  value: string;
  duration?: number;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.6 });

  const parsed = useMemo(() => {
    const m = value.match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬.٫]*/);
    if (!m || m.index === undefined) return null;
    const raw = m[0];
    const clean = toLatin(raw).replace(/[,٬]/g, "").replace(/٫/g, ".");
    const target = parseFloat(clean);
    if (Number.isNaN(target)) return null;
    return {
      pre: value.slice(0, m.index),
      post: value.slice(m.index + raw.length),
      target,
      decimals: (clean.split(".")[1] ?? "").length,
      group: /[,٬]/.test(raw),
      fa: /[۰-۹]/.test(raw),
      dec: raw.includes("٫") ? "٫" : ".",
    };
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!parsed || !el || !inView) return;

    const fmt = (v: number) => {
      const [i0, f] = v.toFixed(parsed.decimals).split(".");
      const i = parsed.group ? i0.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : i0;
      let s = f ? i + parsed.dec + f : i;
      if (parsed.fa) s = toFa(s);
      return parsed.pre + s + parsed.post;
    };

    const controls = animate(0, parsed.target, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => {
      controls.stop();
      el.textContent = value;
    };
  }, [inView, parsed, duration, delay, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════
   WordReveal — masked word-by-word rise (safe for Persian joining:
   splits on spaces only, never inside a word)
   ════════════════════════════════════════════════════════════ */
export const WordReveal = ({
  text,
  delay = 0,
  step = 0.07,
}: {
  text: string;
  delay?: number;
  step?: number;
}) => {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="-mb-[0.18em] inline-block overflow-hidden pb-[0.18em] align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "115%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
                delay: delay + i * step,
              }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
};
