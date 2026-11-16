"use client";

/* =========================================================
   KianZist — Shared engine for biological page backgrounds
   ---------------------------------------------------------
   Handles everything that must be identical across scenes:
   - canvas sizing (DPR capped at 2) + debounced resize
   - OFF below 768px by default (a scene can opt in with `minWidth`),
     "lite" mode below 1024px, "compact" mode on phones (< 768px)
   - adaptive frame-rate (30fps → 20fps if frames get heavy)
   - paused while the tab is hidden
   - prefers-reduced-motion → one static frame
   - light / dark palette read from the --kz-* CSS variables
   Each scene only implements: resize / theme / step / draw.
========================================================= */

import { useEffect, useRef, type RefObject } from "react";

export type RGB = [number, number, number];
export const TAU = Math.PI * 2;

export interface BioPalette {
  dark: boolean;
  pri: RGB; // emerald (dark) / deep green (light)
  sec: RGB; // azure
  pist: RGB; // pistachio
  k: number; // global softness multiplier for alpha
  blend: GlobalCompositeOperation; // "lighter" on dark, "source-over" on light
  key: string; // change detector
}

export interface BioEnv {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number; // full scrollable content height
  viewportH: number;
  scrollY: number;
  dpr: number;
  scale: number;
  lite: boolean; // tablet / phone / weak device
  compact: boolean; // phone (< 768px). Only ever true if the scene opted in via minWidth
  pal: BioPalette;
}

export interface BioScene {
  /** Rebuild geometry (viewport changed) */
  resize(env: BioEnv): void;
  /** Rebuild sprites / cached layers (palette changed) */
  theme(env: BioEnv): void;
  /** Advance simulation. dt is in 60fps units */
  step(dt: number, env: BioEnv): void;
  draw(env: BioEnv): void;
  /** Jump to a finished, static state (reduced motion) */
  settle?(env: BioEnv): void;
}

/* ---------------- small helpers ---------------- */

export const clamp = (v: number, a: number, b: number) =>
  v < a ? a : v > b ? b : v;

export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const rgba = (c: RGB, a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Deterministic RNG so geometry doesn't change on every resize */
export const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------------- palette ---------------- */

const parseColor = (raw: string, fb: RGB): RGB => {
  const v = raw.trim();
  const ch = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/.exec(v);
  if (ch) return [+ch[1], +ch[2], +ch[3]];
  const hx = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v);
  if (hx)
    return [parseInt(hx[1], 16), parseInt(hx[2], 16), parseInt(hx[3], 16)];
  const sh = /^#([a-f\d])([a-f\d])([a-f\d])$/i.exec(v);
  if (sh) {
    return [
      parseInt(sh[1] + sh[1], 16),
      parseInt(sh[2] + sh[2], 16),
      parseInt(sh[3] + sh[3], 16),
    ];
  }
  return fb;
};

const readPalette = (): BioPalette => {
  const root = document.documentElement;
  const st = getComputedStyle(root);
  const dark =
    root.classList.contains("dark") ||
    root.getAttribute("data-theme") === "dark";
  const get = (n: string) => st.getPropertyValue(n);

  // Slight desaturation so nothing ever "screams"
  const soften = (c: RGB): RGB =>
    mixRGB(c, dark ? [150, 190, 190] : [90, 120, 120], 0.16);

  const pri = soften(
    parseColor(
      get(dark ? "--kz-brand-accent" : "--kz-brand-primary"),
      dark ? [39, 215, 166] : [13, 101, 85],
    ),
  );
  const sec = soften(
    parseColor(
      get("--kz-brand-secondary"),
      dark ? [0, 163, 255] : [0, 102, 204],
    ),
  );
  const pist = soften(
    parseColor(
      get("--kz-brand-pistachio"),
      dark ? [176, 222, 140] : [124, 176, 80],
    ),
  );

  return {
    dark,
    pri,
    sec,
    pist,
    k: dark ? 0.8 : 0.95,
    blend: dark ? "lighter" : "source-over",
    key: `${dark}|${pri}|${sec}|${pist}`,
  };
};

/* ---------------- sprites (pre-rendered once per theme) ---------------- */

export const makeGlowSprite = (c: RGB, pal: BioPalette) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d")!;
  const core = pal.dark ? mixRGB(c, [255, 255, 255], 0.55) : c;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(core, 1));
  gr.addColorStop(0.18, rgba(c, 0.9));
  gr.addColorStop(0.3, rgba(c, 0.5));
  gr.addColorStop(0.5, rgba(c, 0.15));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return cv;
};

/** Rod-shaped bacterium (bacillus) with a soft halo */
export const makeRodSprite = (c: RGB, pal: BioPalette) => {
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 32;
  const g = cv.getContext("2d")!;
  const x0 = 13;
  const x1 = 51;
  const cy = 16;
  const r = 4.2;
  g.shadowColor = rgba(c, pal.dark ? 0.85 : 0.5);
  g.shadowBlur = 8;
  g.fillStyle = rgba(c, 0.9);
  g.beginPath();
  g.arc(x0, cy, r, Math.PI / 2, Math.PI * 1.5);
  g.arc(x1, cy, r, -Math.PI / 2, Math.PI / 2);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = rgba(mixRGB(c, [255, 255, 255], pal.dark ? 0.6 : 0.35), 0.5);
  g.fillRect(x0, cy - 2.6, x1 - x0, 1.8);
  return cv;
};

/** Rounded label chip, e.g. "NH₄⁺" */
export const makePill = (label: string, c: RGB, pal: BioPalette) => {
  const S = 2;
  const W = 58;
  const H = 30;
  const pw = 46;
  const ph = 18;
  const cv = document.createElement("canvas");
  cv.width = W * S;
  cv.height = H * S;
  const g = cv.getContext("2d")!;
  g.scale(S, S);
  const x = (W - pw) / 2;
  const y = (H - ph) / 2;
  const r = ph / 2;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arc(x + pw - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  g.closePath();
  g.shadowColor = rgba(c, pal.dark ? 0.7 : 0.4);
  g.shadowBlur = 8;
  g.fillStyle = rgba(c, pal.dark ? 0.14 : 0.1);
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 1;
  g.strokeStyle = rgba(c, pal.dark ? 0.6 : 0.5);
  g.stroke();
  g.font =
    "600 10.5px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const tc = pal.dark
    ? mixRGB(c, [255, 255, 255], 0.5)
    : mixRGB(c, [0, 0, 0], 0.3);
  g.fillStyle = rgba(tc, 0.95);
  g.fillText(label, W / 2, H / 2 + 0.5);
  return { cv, w: W, h: H };
};

/* ---------------- edge strips ----------------
   Both scenes live in the left / right margins only. Instead of a full-screen
   cached layer we cache two narrow strips side by side in ONE small canvas:
   less memory and a much cheaper blit every frame. */

export interface StripLayer {
  cv: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  sw: number;
  clear(): void;
  open(side: 0 | 1): void; // draw in normal screen coordinates until close()
  close(): void;
  blit(ctx: CanvasRenderingContext2D, sourceY: number, viewH: number): void;
}

export const makeStrips = (env: BioEnv, sw: number): StripLayer => {
  const { w, h, dpr } = env;
  // The cached world layer is very tall; cap its DPR independently from the
  // viewport canvas to avoid multiplying memory use on high-density displays.
  const stripDpr = Math.min(dpr, 1.25);
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(2 * sw * stripDpr);
  cv.height = Math.ceil(h * stripDpr);
  const g = cv.getContext("2d")!;
  return {
    cv,
    g,
    sw,
    clear() {
      g.setTransform(stripDpr, 0, 0, stripDpr, 0, 0);
      g.clearRect(0, 0, 2 * sw, h);
    },
    open(side) {
      g.save();
      g.beginPath();
      g.rect(side * sw, 0, sw, h);
      g.clip();
      if (side === 1) g.translate(2 * sw - w, 0);
    },
    close() {
      g.restore();
    },
    blit(ctx, sourceY, viewH) {
      const sy = clamp(sourceY, 0, Math.max(0, h - viewH));
      const sh = Math.min(viewH, h - sy);
      if (sh <= 0) return;
      ctx.drawImage(
        cv,
        0,
        sy * stripDpr,
        sw * stripDpr,
        sh * stripDpr,
        0,
        0,
        sw,
        sh,
      );
      ctx.drawImage(
        cv,
        sw * stripDpr,
        sy * stripDpr,
        sw * stripDpr,
        sh * stripDpr,
        w - sw,
        0,
        sw,
        sh,
      );
    },
  };
};

/* ---------------- the hook ---------------- */

const MOBILE_MAX = 768;

/**
 * Shared viewport Canvas hook.
 * The canvas is pinned to the exact visible rectangle of the supplied scroll
 * container, while scenes work in full-page world coordinates via scrollY.
 * Content height is observed dynamically; scenes receive resize() only when
 * real geometry changes, not on every scroll event.
 */
export interface BioCanvasOptions {
  /** Smallest viewport width (px) the scene is shown at. Default 768. */
  minWidth?: number;
  /**
   * Re-render immediately on every scroll event (for cheap cached scenes).
   * Without this, scrolling waits for the next RAF tick (~16–33ms), which is
   * fine for expensive scenes but shows a small lag for cached-layer scenes.
   */
  scrollSync?: boolean;
}

export const useBioCanvas = (
  factory: () => BioScene,
  scrollContainerRef?: RefObject<HTMLElement | null>,
  options?: BioCanvasOptions,
) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const scene = factory();
    const minWidth = options?.minWidth ?? MOBILE_MAX;
    const scrollSync = options?.scrollSync ?? false;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const env: BioEnv = {
      ctx,
      w: 0,
      h: 0,
      viewportH: 0,
      scrollY: 0,
      dpr: 1,
      scale: 1,
      lite: false,
      compact: false,
      pal: readPalette(),
    };

    let raf = 0;
    let last = 0;
    let base = 1000 / 30;
    let interval = base;
    let ema = 0;
    let layoutTimer = 0;
    let enabled = false;
    let initialized = false;
    let themed = false;
    let lastLeft = Number.NaN;
    let lastTop = Number.NaN;

    const getContainer = () => scrollContainerRef?.current ?? null;

    const updateCanvasPosition = () => {
      const container = getContainer();
      const rect = container?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight;

      // Inline positioning deliberately overrides utility-class insets.
      canvas.style.position = "fixed";
      canvas.style.inset = "auto";
      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.style.right = "auto";
      canvas.style.bottom = "auto";
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastLeft = left;
      lastTop = top;
    };

    const renderOnce = () => {
      if (!enabled) return;
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
      ctx.clearRect(0, 0, env.w, env.viewportH);
      scene.draw(env);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = now - last;
      if (elapsed < interval - 2) return;
      last = now;

      const t0 = performance.now();
      ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
      ctx.clearRect(0, 0, env.w, env.viewportH);
      scene.step(Math.min(elapsed, 50) / 16.667, env);
      scene.draw(env);
      ema = ema * 0.9 + (performance.now() - t0) * 0.1;

      // Adaptive frame rate: preserve responsiveness on slower devices.
      if (ema > (env.compact ? 6 : 8) && interval < 50) interval = 50;
      else if (ema < 3 && interval > base) interval = base;
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const start = () => {
      if (raf || reduce || !enabled || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const layout = () => {
      const container = getContainer();
      const rect = container?.getBoundingClientRect();
      const nextW = Math.max(1, rect?.width ?? window.innerWidth);
      const nextCompact = nextW < MOBILE_MAX;
      // Phones get a lower pixel budget
      const dpr = Math.min(window.devicePixelRatio || 1, nextCompact ? 1.5 : 2);
      const nextViewportH = Math.max(1, rect?.height ?? window.innerHeight);
      const nextH = Math.max(
        nextViewportH,
        container?.scrollHeight ?? nextViewportH,
      );
      const nextScrollY = container?.scrollTop ?? window.scrollY;
      const nextScale = clamp(
        Math.min(nextW, nextViewportH) / 900,
        nextCompact ? 0.6 : 0.72,
        1.1,
      );
      const nextLite =
        nextW < 1024 || (navigator.hardwareConcurrency || 8) <= 2;

      const geometryChanged =
        !initialized ||
        Math.abs(nextW - env.w) > 0.5 ||
        Math.abs(nextViewportH - env.viewportH) > 0.5 ||
        Math.abs(nextH - env.h) > 0.5 ||
        Math.abs(nextScale - env.scale) > 0.001 ||
        nextLite !== env.lite ||
        nextCompact !== env.compact ||
        dpr !== env.dpr;

      env.dpr = dpr;
      env.w = nextW;
      env.viewportH = nextViewportH;
      env.h = nextH;
      env.scrollY = nextScrollY;
      env.scale = nextScale;
      env.lite = nextLite;
      env.compact = nextCompact;

      base = env.compact ? 1000 / 20 : env.lite ? 1000 / 24 : 1000 / 30;
      interval = base;
      enabled = env.w >= minWidth;

      updateCanvasPosition();

      if (!enabled) {
        stop();
        canvas.style.display = "none";
        initialized = true;
        return;
      }

      canvas.style.display = "";
      const pixelW = Math.max(1, Math.round(env.w * dpr));
      const pixelH = Math.max(1, Math.round(env.viewportH * dpr));
      if (canvas.width !== pixelW) canvas.width = pixelW;
      if (canvas.height !== pixelH) canvas.height = pixelH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (geometryChanged) {
        scene.resize(env);
        if (reduce) scene.settle?.(env);
      }
      if (!themed) {
        scene.theme(env);
        themed = true;
      }
      initialized = true;
      renderOnce();
      start();
    };

    const scheduleLayout = () => {
      window.clearTimeout(layoutTimer);
      layoutTimer = window.setTimeout(layout, 40);
    };

    const onScroll = () => {
      const container = getContainer();
      env.scrollY = container?.scrollTop ?? window.scrollY;
      // The container normally stays in place, but its viewport rectangle can
      // move when the document itself is scrolled or a sticky header changes.
      const rect = container?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      if (left !== lastLeft || top !== lastTop) updateCanvasPosition();
      if (reduce || scrollSync) renderOnce();
    };

    const onWindowScroll = () => {
      if (!getContainer()) onScroll();
      else {
        const rect = getContainer()!.getBoundingClientRect();
        if (rect.left !== lastLeft || rect.top !== lastTop)
          updateCanvasPosition();
      }
    };

    const contentObserver = new ResizeObserver(scheduleLayout);
    const mutationObserver = new MutationObserver(() => {
      // Observe structural changes too: product lists may be populated or
      // replaced asynchronously without a window resize.
      const container = getContainer();
      if (container) {
        contentObserver.disconnect();
        contentObserver.observe(container);
        for (const child of Array.from(container.children)) {
          contentObserver.observe(child);
        }
      }
      scheduleLayout();
    });

    const observeContent = () => {
      const container = getContainer();
      if (!container) return;
      contentObserver.observe(container);
      for (const child of Array.from(container.children)) {
        contentObserver.observe(child);
      }
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
      });
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const paletteObserver = new MutationObserver(() => {
      const palette = readPalette();
      if (palette.key === env.pal.key) return;
      env.pal = palette;
      if (!enabled) return;
      scene.theme(env);
      if (reduce || !raf) renderOnce();
    });
    paletteObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    layout();
    observeContent();
    const container = getContainer();
    if (container)
      container.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("resize", scheduleLayout);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(layoutTimer);
      window.removeEventListener("resize", scheduleLayout);
      window.removeEventListener("scroll", onWindowScroll);
      if (container) container.removeEventListener("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
      contentObserver.disconnect();
      mutationObserver.disconnect();
      paletteObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // The ref is intentionally captured once; route remount creates a new scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
};
