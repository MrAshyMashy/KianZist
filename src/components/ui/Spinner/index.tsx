"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  Spinner.tsx — "Rhizosphere Scanner" loading spinner + transition overlay
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  A microscope lens scans a soil sample. A neon laser sweeps top → bottom →
 *  top (ease-in-out). Every bacterium / soil microbe the beam crosses
 *  IGNITES: it swells, burns in the brand colours, fires a shock ring, locks
 *  a target reticle around itself and links to its glowing neighbours like a
 *  living colony — then cools down smoothly once the beam has passed.
 *
 *  The brand logo is placed exactly at the centre on a solid theme-aware
 *  circular background (masking particles and the laser underneath), wrapped
 *  in holographic auras and orbital rings.
 *
 *  Public API (unchanged from the previous spinner):
 *    <SpinnerProvider> · useSpinner() → { isActive, run, navigate, show, hide }
 *    <SpinnerOverlay /> · <LogoSpinner /> (alias of <RhizosphereScanner />)
 *
 *  Rendering notes:
 *   - Pure Canvas 2D, requestAnimationFrame, DPR aware, ResizeObserver, 1:1.
 *   - No ctx.shadowBlur. All glows are radial-gradient sprites / gradients.
 *   - Colours are read from CSS variables and re-read when the theme flips
 *     (class / data-theme mutation or prefers-color-scheme change).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Typography from "@/typography";
import { useLanguage } from "@/providers/LanguageProvider";

/* ───────────────────────── constants ───────────────────────── */

const PRIMARY = "var(--kz-brand-primary)";
const SECONDARY = "var(--kz-brand-secondary, #3b96ff)";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const SIZES = { xs: 56, sm: 84, md: 130, lg: 200, xl: 300 } as const;
export type SpinnerSize = keyof typeof SIZES | number;

const DEFAULT_DURATION = 2500; // ms the spinner shows before the action runs
const DEFAULT_SETTLE = 500; // ms the spinner stays after the action finishes
const NAV_TIMEOUT = 8000; // safety: hide even if the route never changes

const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const sleep = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, Math.max(0, ms)));

/* ───────────────────────── scanner constants ───────────────────────── */

const VIEW = 500; // Increased logical canvas units
const CX = VIEW / 2;
const CY = VIEW / 2;
const LENS_R = 190; // Increased glass radius
const LOGO_BG_R = 115; // Increased radius of the central logo background
const PARTICLE_COUNT = 45;
const TICKS = 72;
const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;

const LASER_LEG = 1.5; // seconds for one sweep (down or up)
const LASER_SPAN = LENS_R - 6; // laser travel is ±LASER_SPAN around the centre
const HEAT_DECAY = 2.1; // ignition cool-down rate (1/s)
const LINK_DIST = 80; // max distance for colony links

/* ───────────────────────── math / colour helpers ───────────────────────── */

type RGB = readonly [number, number, number];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgba = (c: RGB, a: number): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a).toFixed(3)})`;

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ───────────────────────── scanner types ───────────────────────── */

interface Particle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  base: number;
  speed: number;
  turnAmp: number;
  turnFreq: number;
  turnPhase: number;
  wa: number;
  wfx: number;
  wfy: number;
  wpx: number;
  wpy: number;
  r: number;
  kind: 0 | 1 | 2 | 3;
  angle: number;
  spin: number;
  spinDir: number;
  tone: 0 | 1;
  heat: number;
  pop: number;
  lock: number;
  e: number;
  sc: number;
}

interface Gfx {
  primary: RGB;
  secondary: RGB;
  surface: RGB;
  hot: RGB;
  isDark: boolean;
  spriteP: HTMLCanvasElement;
  spriteS: HTMLCanvasElement;
  spriteH: HTMLCanvasElement;
  ambient: CanvasGradient;
  vignette: CanvasGradient;
  rim: CanvasGradient;
  logoSrc: string;
}

interface StaticPaths {
  ticksShort: Path2D;
  ticksLong: Path2D;
  reticle: Path2D;
}

interface LatticeRow {
  y: number;
  xs: number[];
}

const buildStaticPaths = (): StaticPaths => {
  const ticksShort = new Path2D();
  const ticksLong = new Path2D();
  for (let i = 0; i < TICKS; i++) {
    const a = (i / TICKS) * TAU;
    const long = i % 6 === 0;
    const r1 = long ? LENS_R + 22 : LENS_R + 30;
    const r2 = LENS_R + 40;
    const path = long ? ticksLong : ticksShort;
    path.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    path.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
  }

  const reticle = new Path2D();
  for (let i = 0, d = LOGO_BG_R + 15; d < LENS_R - 18; d += 14, i++) {
    const h = i % 4 === 3 ? 6 : 3;
    for (const s of [-1, 1]) {
      reticle.moveTo(CX + s * d, CY - h);
      reticle.lineTo(CX + s * d, CY + h);
      reticle.moveTo(CX - h, CY + s * d);
      reticle.lineTo(CX + h, CY + s * d);
    }
  }
  return { ticksShort, ticksLong, reticle };
};

const buildLattice = (): LatticeRow[] => {
  const rows: LatticeRow[] = [];
  for (let gy = -11; gy <= 11; gy++) {
    const y = CY + gy * 16;
    const xs: number[] = [];
    for (let gx = -11; gx <= 11; gx++) {
      const x = CX + gx * 18 + (Math.abs(gy) % 2 === 1 ? 9 : 0);
      if (
        Math.hypot(x - CX, y - CY) < LENS_R - 8 &&
        Math.hypot(x - CX, y - CY) > LOGO_BG_R + 5
      ) {
        xs.push(x);
      }
    }
    if (xs.length) rows.push({ y, xs });
  }
  return rows;
};

const makeGlowSprite = (rgb: RGB, size: number): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return c;
  const h = size / 2;
  const grad = g.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0, rgba(rgb, 1));
  grad.addColorStop(0.16, rgba(rgb, 0.62));
  grad.addColorStop(0.42, rgba(rgb, 0.22));
  grad.addColorStop(0.72, rgba(rgb, 0.06));
  grad.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
};

/* ───────────────────────── RhizosphereScanner ───────────────────────── */

export interface RhizosphereScannerProps {
  size?: SpinnerSize;
  label?: string;
  hideLogo?: boolean;
  className?: string;
}

export const RhizosphereScanner = ({
  size = "md",
  label,
  className = "",
}: RhizosphereScannerProps) => {
  const { lang } = useLanguage();
  const isFa = lang === "fa";

  const px = typeof size === "number" ? size : SIZES[size];
  const text = label ?? (isFa ? "در حال بارگذاری" : "Loading");

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timeScale = reduceMotion ? 0.55 : 1;
    const rng = mulberry32((Math.random() * 4294967296) >>> 0);

    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:0;height:0;visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);

    const sampler = document.createElement("canvas");
    sampler.width = 1;
    sampler.height = 1;
    const sctx = sampler.getContext("2d", { willReadFrequently: true });

    const resolveCss = (value: string): RGB => {
      probe.style.color = "";
      probe.style.color = value;
      const computed = getComputedStyle(probe).color;
      if (sctx) {
        sctx.clearRect(0, 0, 1, 1);
        sctx.fillStyle = "rgb(0 0 0)";
        sctx.fillStyle = computed;
        sctx.fillRect(0, 0, 1, 1);
        const d = sctx.getImageData(0, 0, 1, 1).data;
        return [Number(d[0]), Number(d[1]), Number(d[2])];
      }
      const m = computed.match(/[\d.]+/g);
      if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
      return [128, 128, 128];
    };

    const resolveVar = (names: readonly string[]): RGB | null => {
      const rootStyle = getComputedStyle(document.documentElement);
      for (const name of names) {
        const raw = rootStyle.getPropertyValue(name).trim();
        if (!raw) continue;
        const value = /^[\d.\s,%/]+$/.test(raw) ? `rgb(${raw})` : raw;
        return resolveCss(value);
      }
      return null;
    };

    const buildGfx = (): Gfx => {
      const primary =
        resolveVar(["--kz-brand-primary", "--kz-brand-accent"]) ??
        resolveCss("currentColor");
      const secondary = resolveVar(["--kz-brand-secondary"]) ?? primary;
      const surface =
        resolveVar(["--kz-bg-body", "--kz-bg-surface"]) ?? resolveCss("Canvas");

      const luminance =
        (0.2126 * surface[0] + 0.7152 * surface[1] + 0.0722 * surface[2]) / 255;
      const isDark = luminance < 0.5;
      const hot = isDark
        ? lerpRGB(lerpRGB(primary, secondary, 0.4), [255, 255, 255], 0.72)
        : lerpRGB(primary, [0, 0, 0], 0.22);

      const ambient = ctx.createRadialGradient(
        CX,
        CY,
        0,
        CX,
        CY,
        LENS_R * 0.92,
      );
      ambient.addColorStop(0, rgba(primary, 0.17));
      ambient.addColorStop(0.5, rgba(secondary, 0.05));
      ambient.addColorStop(1, rgba(secondary, 0));

      const vignette = ctx.createRadialGradient(
        CX,
        CY,
        LENS_R * 0.55,
        CX,
        CY,
        LENS_R,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(
        1,
        isDark ? "rgba(0,0,0,0.38)" : rgba(primary, 0.12),
      );

      const rim = ctx.createLinearGradient(
        CX - LENS_R,
        CY - LENS_R,
        CX + LENS_R,
        CY + LENS_R,
      );
      rim.addColorStop(0, rgba(primary, 0.95));
      rim.addColorStop(0.5, rgba(secondary, 0.95));
      rim.addColorStop(1, rgba(primary, 0.95));

      const logoSrc = isFa
        ? isDark
          ? "/images/logo/fa/logo-dark.png"
          : "/images/logo/fa/logo-light.png"
        : "/images/logo/en/logo.png";

      return {
        primary,
        secondary,
        surface,
        hot,
        isDark,
        spriteP: makeGlowSprite(primary, 128),
        spriteS: makeGlowSprite(secondary, 128),
        spriteH: makeGlowSprite(hot, 128),
        ambient,
        vignette,
        rim,
        logoSrc,
      };
    };

    let gfx = buildGfx();
    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };

    const attrs = [
      "class",
      "style",
      "data-theme",
      "data-mode",
      "data-color-scheme",
    ];
    const mo = new MutationObserver(markDirty);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: attrs,
    });
    mo.observe(document.body, { attributes: true, attributeFilter: attrs });
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", markDirty);

    /* ---------- logo image loading ---------- */
    let logoImg = new Image();
    let loadedLogoSrc = "";
    const syncLogo = () => {
      if (gfx.logoSrc !== loadedLogoSrc) {
        loadedLogoSrc = gfx.logoSrc;
        logoImg = new Image();
        logoImg.src = loadedLogoSrc;
      }
    };
    syncLogo();

    /* ---------- static geometry ---------- */

    const paths = buildStaticPaths();
    const lattice = buildLattice();

    /* ---------- bio-particles ---------- */

    const spawn = (): Particle => {
      const a = rng() * TAU;
      const rad = LOGO_BG_R + Math.sqrt(rng()) * (LENS_R - LOGO_BG_R - 20);
      const k = rng();
      const kind: 0 | 1 | 2 | 3 = k < 0.4 ? 0 : k < 0.7 ? 1 : k < 0.86 ? 2 : 3;
      const x = CX + Math.cos(a) * rad;
      const y = CY + Math.sin(a) * rad;
      return {
        x,
        y,
        rx: x,
        ry: y,
        base: rng() * TAU,
        speed: 6 + rng() * 10,
        turnAmp: 0.7 + rng() * 1.1,
        turnFreq: 0.25 + rng() * 0.45,
        turnPhase: rng() * TAU,
        wa: 2 + rng() * 3.2,
        wfx: 0.8 + rng() * 1.4,
        wfy: 0.8 + rng() * 1.4,
        wpx: rng() * TAU,
        wpy: rng() * TAU,
        r: kind === 3 ? 2.4 + rng() * 1.2 : 3.6 + rng() * 2.6,
        kind,
        angle: rng() * TAU,
        spin: (rng() - 0.5) * 0.7,
        spinDir: rng() < 0.5 ? -1 : 1,
        tone: rng() < 0.6 ? 0 : 1,
        heat: 0,
        pop: 0,
        lock: 0,
        e: 0,
        sc: 1,
      };
    };
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, spawn);

    /* ---------- canvas sizing (1:1, DPR aware) ---------- */

    let cssSize = 0;
    let scale = 1;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const s = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const bufferSize = Math.max(1, Math.round(s * dpr));
      cssSize = s;
      scale = bufferSize / VIEW;
      canvas.width = bufferSize;
      canvas.height = bufferSize;
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("resize", resize);

    /* ---------- tiny draw helpers ---------- */

    const circlePath = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
    };
    const glow = (
      sprite: HTMLCanvasElement,
      x: number,
      y: number,
      s: number,
      a: number,
    ) => {
      if (a <= 0.003) return;
      ctx.globalAlpha = clamp01(a);
      ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
    };

    /* ---------- main loop ---------- */

    let raf = 0;
    let last = performance.now();
    let t = 0;
    let prevLaserY = Number.NaN;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (dirty) {
        gfx = buildGfx();
        syncLogo();
        dirty = false;
      }
      if (cssSize < 1) return;

      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * timeScale;
      last = now;
      t += dt;

      const { primary: P, secondary: S, surface: B, hot: H, isDark } = gfx;
      const glowOp: GlobalCompositeOperation = isDark
        ? "lighter"
        : "source-over";

      const hair = (VIEW / cssSize) * 0.9;
      const lw = (w: number) => Math.max(w, hair);
      const detail = cssSize >= 96;

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, VIEW, VIEW);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.setLineDash([]);

      /* ----- laser kinematics ----- */
      const phase = (t / LASER_LEG) % 2;
      const u = phase < 1 ? phase : 2 - phase;
      const dir = phase < 1 ? 1 : -1;
      const laserY = CY - LASER_SPAN + easeInOutSine(u) * LASER_SPAN * 2;
      if (Number.isNaN(prevLaserY)) prevLaserY = laserY;
      const bounceDist = Math.abs(phase - Math.round(phase));
      const bounce = Math.exp(-bounceDist * bounceDist * 70);

      /* ----- particle simulation ----- */
      for (const p of particles) {
        const hd = p.base + Math.sin(t * p.turnFreq + p.turnPhase) * p.turnAmp;
        p.x += Math.cos(hd) * p.speed * dt;
        p.y += Math.sin(hd) * p.speed * dt;

        const dx = p.x - CX;
        const dy = p.y - CY;
        const d2 = dx * dx + dy * dy;

        const innerLim = LOGO_BG_R + p.r + 5;
        if (d2 < innerLim * innerLim) {
          const d = Math.sqrt(d2) || 1;
          p.x = CX + (dx / d) * innerLim;
          p.y = CY + (dy / d) * innerLim;
          p.base = Math.atan2(dy, dx) + (rng() - 0.5) * 1.2;
        }

        const lim = LENS_R - 14 - p.r * 1.3;
        if (d2 > lim * lim) {
          const d = Math.sqrt(d2) || 1;
          p.x = CX + (dx / d) * lim;
          p.y = CY + (dy / d) * lim;
          p.base = Math.atan2(-dy, -dx) + (rng() - 0.5) * 1.2;
        }

        p.angle += (p.spin + p.heat * 2.4 * p.spinDir) * dt;
        p.rx = p.x + Math.sin(t * p.wfx + p.wpx) * p.wa;
        p.ry = p.y + Math.cos(t * p.wfy + p.wpy) * p.wa;

        const dL = Math.abs(laserY - p.ry);
        const crossed = (prevLaserY - p.ry) * (laserY - p.ry) < 0;
        if (crossed || dL < 6) {
          if (p.heat < 0.2) {
            p.pop = 1;
            p.lock = 1;
          }
          p.heat = 1;
        } else {
          p.heat *= Math.exp(-dt * HEAT_DECAY);
          if (p.heat < 0.003) p.heat = 0;
        }
        p.pop *= Math.exp(-dt * 5.5);
        p.lock *= Math.exp(-dt * 1.4);

        p.e = easeOutCubic(p.heat);
        p.sc = 1 + 2.4 * p.e + 0.6 * p.pop;
      }
      prevLaserY = laserY;

      /* ================= LENS BASE ================= */
      circlePath(CX, CY, LENS_R);
      ctx.fillStyle = rgba(B, 0.55);
      ctx.fill();

      /* ================= OUTER ORNAMENTS ================= */

      circlePath(CX, CY, LENS_R + 45);
      ctx.strokeStyle = rgba(P, 0.14);
      ctx.lineWidth = lw(1);
      ctx.stroke();

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(t * 0.06);
      ctx.strokeStyle = rgba(P, 0.34);
      ctx.lineWidth = lw(1.1);
      ctx.stroke(paths.ticksShort);
      ctx.strokeStyle = rgba(S, 0.85);
      ctx.lineWidth = lw(2);
      ctx.stroke(paths.ticksLong);
      ctx.restore();

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(-t * 0.15);
      ctx.setLineDash([0.1, 7.5]);
      ctx.strokeStyle = rgba(S, 0.55);
      ctx.lineWidth = lw(2);
      ctx.beginPath();
      ctx.arc(0, 0, LENS_R + 20, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);

      const a1 = t * 2.1;
      const strokeArc = (
        r: number,
        from: number,
        to: number,
        color: RGB,
        w: number,
        alpha: number,
      ) => {
        ctx.beginPath();
        ctx.arc(CX, CY, r, from, to);
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = lw(w);
        ctx.stroke();
      };
      ctx.globalCompositeOperation = glowOp;
      strokeArc(LENS_R + 50, a1, a1 + 1.25, S, 8, 0.08);
      strokeArc(LENS_R + 50, a1, a1 + 1.25, S, 4.5, 0.17);
      strokeArc(LENS_R + 50, a1 + Math.PI, a1 + Math.PI + 0.42, P, 6, 0.1);
      ctx.globalCompositeOperation = "source-over";
      strokeArc(LENS_R + 50, a1, a1 + 1.25, S, 2.2, 0.95);
      strokeArc(LENS_R + 50, a1 + Math.PI, a1 + Math.PI + 0.42, P, 1.6, 0.9);
      ctx.globalCompositeOperation = glowOp;
      const hx = CX + Math.cos(a1 + 1.25) * (LENS_R + 50);
      const hy = CY + Math.sin(a1 + 1.25) * (LENS_R + 50);
      glow(gfx.spriteS, hx, hy, 26, 0.9);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      /* ================= LENS RIM ================= */

      ctx.globalCompositeOperation = glowOp;
      circlePath(CX, CY, LENS_R);
      ctx.strokeStyle = rgba(S, 0.1 + 0.4 * bounce);
      ctx.lineWidth = lw(8);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      circlePath(CX, CY, LENS_R);
      ctx.strokeStyle = gfx.rim;
      ctx.lineWidth = lw(2);
      ctx.stroke();

      circlePath(CX, CY, LENS_R - 7);
      ctx.strokeStyle = rgba(P, 0.2 + 0.18 * Math.sin(t * 2.4) + 0.25 * bounce);
      ctx.lineWidth = lw(1);
      ctx.stroke();

      ctx.lineCap = "butt";
      ctx.strokeStyle = rgba(S, 0.9);
      ctx.lineWidth = lw(2.4);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const c = Math.cos(k * HALF_PI);
        const s = Math.sin(k * HALF_PI);
        ctx.moveTo(CX + c * (LENS_R - 10), CY + s * (LENS_R - 10));
        ctx.lineTo(CX + c * (LENS_R + 3), CY + s * (LENS_R + 3));
      }
      ctx.stroke();
      ctx.lineCap = "round";

      /* ================= LENS INTERIOR (clipped) ================= */
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, LENS_R - 1, 0, TAU);
      ctx.clip();

      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 1.4);
      ctx.fillStyle = gfx.ambient;
      ctx.fillRect(0, 0, VIEW, VIEW);
      ctx.globalAlpha = 1;
      ctx.fillStyle = gfx.vignette;
      ctx.fillRect(0, 0, VIEW, VIEW);

      if (detail) {
        ctx.globalCompositeOperation = glowOp;
        const sz = lw(1.5);
        for (const row of lattice) {
          const d = Math.abs(row.y - laserY);
          if (d > 60) continue;
          const k = 1 - d / 60;
          ctx.fillStyle = rgba(P, k * k * 0.6);
          for (const x of row.xs)
            ctx.fillRect(x - sz / 2, row.y - sz / 2, sz, sz);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      if (detail) {
        ctx.globalCompositeOperation = glowOp;
        ctx.lineWidth = lw(1.1);
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          if (a.heat < 0.06) continue;
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            if (b.heat < 0.06) continue;
            const dx = a.rx - b.rx;
            const dy = a.ry - b.ry;
            const d2 = dx * dx + dy * dy;
            if (d2 > LINK_DIST * LINK_DIST) continue;
            const w = Math.min(a.e, b.e) * (1 - Math.sqrt(d2) / LINK_DIST);
            ctx.strokeStyle = rgba(
              lerpRGB(a.tone === 1 ? S : P, b.tone === 1 ? S : P, 0.5),
              w * 0.85,
            );
            ctx.beginPath();
            ctx.moveTo(a.rx, a.ry);
            ctx.lineTo(b.rx, b.ry);
            ctx.stroke();
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.globalCompositeOperation = glowOp;
      for (const p of particles) {
        const sprite = p.tone === 1 ? gfx.spriteS : gfx.spriteP;
        glow(sprite, p.rx, p.ry, p.r * 5, 0.16);
        if (p.e > 0.01) {
          glow(sprite, p.rx, p.ry, p.r * p.sc * 7.5, p.e * 0.95);
          if (p.e > 0.5) {
            glow(gfx.spriteH, p.rx, p.ry, p.r * p.sc * 3.2, (p.e - 0.5) * 1.6);
          }
        }
        if (!reduceMotion && p.pop > 0.02) {
          ctx.globalAlpha = 1;
          circlePath(p.rx, p.ry, p.r * (1.6 + 7 * easeOutCubic(1 - p.pop)));
          ctx.strokeStyle = rgba(p.tone === 1 ? S : P, p.pop * 0.8);
          ctx.lineWidth = lw(0.4 + 1.6 * p.pop);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      const dormant = isDark ? 0.28 : 0.38;
      for (const p of particles) {
        const col = p.tone === 1 ? S : P;
        const r = p.r * p.sc;
        const fillA = dormant + (1 - dormant) * p.e;
        ctx.fillStyle = rgba(col, fillA);
        ctx.strokeStyle = rgba(col, 0.45 + 0.5 * p.e);
        ctx.lineWidth = lw(0.9);

        const ang = p.angle + Math.sin(t * 0.9 + p.wpx) * 0.5;
        switch (p.kind) {
          case 0:
            circlePath(p.rx, p.ry, r);
            ctx.fill();
            ctx.stroke();
            break;
          case 1: {
            const hl = r * 1.15;
            const ca = Math.cos(ang) * hl;
            const sa = Math.sin(ang) * hl;
            ctx.strokeStyle = rgba(col, fillA);
            ctx.lineWidth = r * 1.5;
            ctx.beginPath();
            ctx.moveTo(p.rx - ca, p.ry - sa);
            ctx.lineTo(p.rx + ca, p.ry + sa);
            ctx.stroke();
            break;
          }
          case 2: {
            const off = r * 0.8;
            const ox = Math.cos(ang) * off;
            const oy = Math.sin(ang) * off;
            circlePath(p.rx - ox, p.ry - oy, r * 0.75);
            ctx.fill();
            ctx.stroke();
            circlePath(p.rx + ox, p.ry + oy, r * 0.75);
            ctx.fill();
            ctx.stroke();
            break;
          }
          default:
            circlePath(p.rx, p.ry, r * 0.6);
            ctx.fill();
            break;
        }

        if (p.e > 0.04) {
          circlePath(p.rx, p.ry, r * 0.38);
          ctx.fillStyle = rgba(H, Math.min(1, p.e * 1.1));
          ctx.fill();
        }
      }

      if (detail) {
        ctx.lineCap = "butt";
        ctx.lineWidth = lw(1.2);
        for (const p of particles) {
          if (p.lock < 0.04) continue;
          const hs = p.r * p.sc + 4 + 14 * p.lock * p.lock * p.lock;
          const cl = 4;
          ctx.strokeStyle = rgba(H, Math.min(1, p.lock * 1.4) * 0.9);
          ctx.beginPath();
          for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
              ctx.moveTo(p.rx + sx * hs, p.ry + sy * (hs - cl));
              ctx.lineTo(p.rx + sx * hs, p.ry + sy * hs);
              ctx.lineTo(p.rx + sx * (hs - cl), p.ry + sy * hs);
            }
          }
          ctx.stroke();
        }
        ctx.lineCap = "round";
      }

      /* ================= CENTRAL NUCLEUS (LOGO) ================= */

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(CX, CY, LOGO_BG_R, 0, TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      ctx.arc(CX, CY, LOGO_BG_R, 0, TAU);
      ctx.strokeStyle = rgba(P, 0.4 + 0.2 * bounce);
      ctx.lineWidth = lw(1.5);
      ctx.stroke();

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // Define specific scale factors to make FA larger than EN while reducing both
        const logoScale = isFa ? 0.85 : 0.8;

        const maxW = LOGO_BG_R * 1.8 * logoScale;
        const maxH = LOGO_BG_R * 1.05 * logoScale;

        let w = logoImg.naturalWidth;
        let h = logoImg.naturalHeight;
        const ratio = Math.min(maxW / w, maxH / h);

        // Rounded dimensions prevent sub-pixel blurring
        const dw = Math.round(w * ratio);
        const dh = Math.round(h * ratio);

        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, LOGO_BG_R, 0, TAU);
        ctx.clip();

        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(-t * 0.8);
        ctx.setLineDash([8, 12]);
        ctx.strokeStyle = rgba(S, 0.4);
        ctx.lineWidth = lw(1.5);
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          Math.max(dw, dh) * 0.75,
          Math.max(dw, dh) * 0.45,
          0,
          0,
          TAU,
        );
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;

        // Ensure maximum crispness
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Rounded coordinates prevent anti-aliasing artifacts on edges
        const dx = Math.round(CX - dw / 2);
        const dy = Math.round(CY - dh / 2);

        ctx.drawImage(logoImg, dx, dy, dw, dh);
      }

      ctx.strokeStyle = rgba(P, 0.4);
      ctx.lineWidth = lw(1);
      ctx.beginPath();
      ctx.moveTo(CX - (LOGO_BG_R + 4), CY);
      ctx.lineTo(CX - (LENS_R - 14), CY);
      ctx.moveTo(CX + (LOGO_BG_R + 4), CY);
      ctx.lineTo(CX + (LENS_R - 14), CY);
      ctx.moveTo(CX, CY - (LOGO_BG_R + 4));
      ctx.lineTo(CX, CY - (LENS_R - 14));
      ctx.moveTo(CX, CY + (LOGO_BG_R + 4));
      ctx.lineTo(CX, CY + (LENS_R - 14));
      ctx.stroke();

      ctx.strokeStyle = rgba(P, 0.3);
      ctx.stroke(paths.reticle);

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(-t * 0.5);
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = rgba(S, 0.45);
      ctx.lineWidth = lw(1);
      ctx.beginPath();
      ctx.arc(0, 0, LOGO_BG_R + 10, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);

      ctx.restore(); // end lens clip

      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,255,255,${isDark ? 0.16 : 0.6})`;
      ctx.lineWidth = lw(2.4);
      ctx.beginPath();
      ctx.arc(CX, CY, LENS_R - 9, Math.PI * 1.08, Math.PI * 1.34);
      ctx.stroke();
      ctx.strokeStyle = rgba(S, 0.28);
      ctx.lineWidth = lw(1.6);
      ctx.beginPath();
      ctx.arc(CX, CY, LENS_R - 9, Math.PI * 0.06, Math.PI * 0.2);
      ctx.stroke();
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", resize);
      mql.removeEventListener("change", markDirty);
      probe.remove();
    };
  }, [lang]);

  return (
    <div
      ref={wrapRef}
      role="status"
      aria-label={text}
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <span className="sr-only">{text}</span>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
};

/** Backwards-compatible aliases so existing imports keep working. */
export const LogoSpinner = RhizosphereScanner;
export type LogoSpinnerProps = RhizosphereScannerProps;

/* ───────────────────────── SpinnerOverlay ───────────────────────── */

export interface SpinnerOverlayProps {
  visible: boolean;
  size?: SpinnerSize;
  label?: string;
  blur?: boolean;
}

export const SpinnerOverlay = ({
  visible,
  size = "xl",
  label,
  blur = true,
}: SpinnerOverlayProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="kz-spinner-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ zIndex: 9999990, transform: "translateZ(0)" }}
          className={`pointer-events-auto fixed inset-0 flex flex-col items-center justify-center bg-kz-bg-body/80 ${
            blur ? "backdrop-blur-md" : ""
          }`}
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${mix(PRIMARY, 14)} 0%, ${mix(SECONDARY, 6)} 40%, transparent 68%)`,
            }}
          />

          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <RhizosphereScanner size={size} label={label} />
            {label && (
              <Typography
                variant="eyebrow"
                className="text-kz-brand-primary"
                style={{ textShadow: `0 0 12px ${mix(PRIMARY, 70)}` }}
              >
                {label}
              </Typography>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/* ───────────────────────── Provider + hook ───────────────────────── */

export interface RunOptions {
  duration?: number;
  settle?: number;
}

export interface NavigateOptions extends RunOptions {
  replace?: boolean;
  scroll?: boolean;
}

interface SpinnerContextValue {
  isActive: boolean;
  run: (
    action?: () => void | Promise<void>,
    options?: RunOptions,
  ) => Promise<void>;
  navigate: (href: string, options?: NavigateOptions) => Promise<void>;
  show: () => void;
  hide: () => void;
}

const SpinnerContext = createContext<SpinnerContextValue | null>(null);

export interface SpinnerProviderProps {
  children: ReactNode;
  defaultDuration?: number;
  defaultSettle?: number;
  size?: SpinnerSize;
  label?: string;
  blur?: boolean;
}

export const SpinnerProvider = ({
  children,
  defaultDuration = DEFAULT_DURATION,
  defaultSettle = DEFAULT_SETTLE,
  size = "xl",
  label,
  blur = true,
}: SpinnerProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const runId = useRef(0);
  const pathnameRef = useRef(pathname);
  const pendingNav = useRef<(() => void) | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
    pendingNav.current?.();
    pendingNav.current = null;
  }, [pathname]);

  const show = useCallback(() => {
    runId.current += 1;
    setIsActive(true);
  }, []);

  const hide = useCallback(() => {
    runId.current += 1;
    setIsActive(false);
  }, []);

  const run = useCallback<SpinnerContextValue["run"]>(
    async (action, options) => {
      const id = ++runId.current;
      const duration = options?.duration ?? defaultDuration;
      const settle = options?.settle ?? defaultSettle;

      setIsActive(true);
      await sleep(duration);
      if (id !== runId.current) return;

      try {
        await action?.();
      } finally {
        await sleep(settle);
        if (id === runId.current) setIsActive(false);
      }
    },
    [defaultDuration, defaultSettle],
  );

  const navigate = useCallback<SpinnerContextValue["navigate"]>(
    (href, options) =>
      run(
        () =>
          new Promise<void>((resolve) => {
            const target = href.split(/[?#]/)[0] || "/";
            const sameRoute = target === pathnameRef.current;

            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              resolve();
            };
            const timer = setTimeout(finish, NAV_TIMEOUT);

            if (!sameRoute) pendingNav.current = finish;

            const opts = { scroll: options?.scroll ?? true };
            if (options?.replace) router.replace(href, opts);
            else router.push(href, opts);

            if (sameRoute) finish();
          }),
        options,
      ),
    [router, run],
  );

  const value = useMemo(
    () => ({ isActive, run, navigate, show, hide }),
    [isActive, run, navigate, show, hide],
  );

  return (
    <SpinnerContext.Provider value={value}>
      {children}
      <SpinnerOverlay
        visible={isActive}
        size={size}
        label={label}
        blur={blur}
      />
    </SpinnerContext.Provider>
  );
};

export const useSpinner = () => {
  const ctx = useContext(SpinnerContext);
  if (!ctx) {
    throw new Error("useSpinner must be used inside <SpinnerProvider>");
  }
  return ctx;
};
