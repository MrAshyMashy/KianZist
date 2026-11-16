"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { setSiteStatus } from "@/lib/siteStatus";
import { applyPerfTier, type PerfTier } from "@/lib/perf";

interface LoadingScreenProps {
  onComplete: () => void;
}

const PRIMARY = "var(--kz-brand-primary)";
const SECONDARY = "var(--kz-brand-secondary, #3b96ff)";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_CINEMA = [0.76, 0, 0.24, 1] as const;

// Minimum time the loader stays on screen (ms).
const MIN_MS = 4200;
// How long the glowing plant stays visible after growth completes (ms).
const BLOOM_HOLD_MS = 2800;

const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/* ------------------------------------------------------------------ */
/*  Plant scene (virtual coordinates, procedurally generated per load) */
/* ------------------------------------------------------------------ */

const VW = 400;
const VH = 560;
// Extra drawing room around the scene so the longer glows and bursts never get clipped
const PAD = 130;
const CW = VW + PAD * 2;
const CH = VH + PAD * 2;
const SOIL = 330; // y of the soil line
const RAMP = 24;
const RAMP_Y0 = 40;
const RAMP_Y1 = 540;
const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const GOLDEN_ANGLE = 2.399963;

const FLOW_COUNT = 30;
const MICROBES = 22;
const SPORES = 40;
const SOIL_DOTS = 54;
const STREAKS = 8;
const MAX_ROOTS = 34; // hard cap on root branches (keeps the scene light and tidy)

// Timing of the "revival wave" after growth completes (seconds since completion)
const WAVE_T = 0.62; // moment the wave leaves the crown and the plant straightens
const RISE_DUR = 1.0; // how long the straightening takes

interface Branch {
  xs: Float32Array;
  ys: Float32Array;
  cum: Float32Array;
  ci: Uint8Array; // precomputed colour-ramp index per segment
  n: number;
  total: number;
  start: number;
  end: number;
  w: number;
}

interface Leaf {
  x: number;
  y: number;
  ang: number;
  size: number;
  start: number;
  end: number;
  phase: number;
  tone: 0 | 1;
  wr: number; // width ratio (leaf slenderness)
  ci: number; // colour-ramp index
  h: number; // relative height 0..1 (lower leaves ignite first)
}

interface Flower {
  petals: number; // 0 = no flower, only the glow
  size: number;
  rot: number;
  layers: number;
  c1: number;
  c2: number;
  wr: number;
}

interface Pt {
  x: number;
  y: number;
  a: number;
}

interface Scene {
  sx: number;
  roots: Branch[];
  rootsEnd: number;
  stems: Branch[]; // stems[0] is the main stem
  twigs: Branch[];
  leaves: Leaf[];
  flower: Flower;
  buds: { x: number; y: number }[];
  apexX: number;
  apexY: number;
  soil: Float32Array;
  mbRoot: Uint8Array;
  mbFrac: Float32Array;
  mbPhase: Float32Array;
  mbRad: Float32Array;
  mbSpeed: Float32Array;
  dir: number; // which way the wilted plant droops (-1 / 1)
  drp: number; // droop strength multiplier
}

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// A fresh seed on every mount => a different plant on every page load
const newSeed = (): number => {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] ^ ((performance.now() * 1000) | 0)) >>> 0;
  } catch {
    return ((Math.random() * 4294967296) ^ Date.now()) >>> 0;
  }
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Builds one smoothly curving branch as a polyline with cumulative lengths
const growBranch = (
  rng: () => number,
  x0: number,
  y0: number,
  ang: number,
  len: number,
  segs: number,
  curl: number,
  target: number,
  pull: number,
  w: number,
  start: number,
  end: number,
): Branch => {
  const xs = new Float32Array(segs + 1);
  const ys = new Float32Array(segs + 1);
  const cum = new Float32Array(segs + 1);
  const ci = new Uint8Array(segs);
  const st = len / segs;
  let a = ang;
  xs[0] = x0;
  ys[0] = y0;
  for (let i = 1; i <= segs; i++) {
    a += (target - a) * pull + (rng() - 0.5) * curl;
    xs[i] = xs[i - 1] + Math.cos(a) * st;
    ys[i] = ys[i - 1] + Math.sin(a) * st;
    cum[i] = cum[i - 1] + st;
  }
  for (let i = 0; i < segs; i++) {
    const t = clamp01(
      ((ys[i] + ys[i + 1]) * 0.5 - RAMP_Y0) / (RAMP_Y1 - RAMP_Y0),
    );
    ci[i] = (t * (RAMP - 1)) | 0;
  }
  return { xs, ys, cum, ci, n: segs + 1, total: len, start, end, w };
};

// Position and tangent angle at a fraction of the branch length
const sample = (b: Branch, f: number, o: Pt) => {
  const d = clamp01(f) * b.total;
  const last = b.n - 2;
  let i = 0;
  while (i < last && b.cum[i + 1] < d) i++;
  const seg = b.cum[i + 1] - b.cum[i] || 1;
  const t = (d - b.cum[i]) / seg;
  const dx = b.xs[i + 1] - b.xs[i];
  const dy = b.ys[i + 1] - b.ys[i];
  o.x = b.xs[i] + dx * t;
  o.y = b.ys[i] + dy * t;
  o.a = Math.atan2(dy, dx);
};

// Shifts the whole plant horizontally so that its bounding box is centred
// on the middle of the scene (= the middle of the soil line).
const centerScene = (s: Scene, flowerOn: boolean) => {
  let minX = Infinity;
  let maxX = -Infinity;
  const acc = (x: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  };
  const eachBranch = (list: Branch[], fn: (b: Branch) => void) => {
    for (const b of list) fn(b);
  };
  const scan = (b: Branch) => {
    for (let i = 0; i < b.n; i++) acc(b.xs[i]);
  };
  eachBranch(s.roots, scan);
  eachBranch(s.stems, scan);
  eachBranch(s.twigs, scan);
  for (const l of s.leaves) {
    const c = Math.cos(l.ang);
    const sn = Math.sin(l.ang);
    const hw = Math.abs(sn) * l.size * l.wr * 0.9;
    acc(l.x);
    acc(l.x + c * l.size);
    acc(l.x + c * l.size * 0.5 - hw);
    acc(l.x + c * l.size * 0.5 + hw);
  }
  if (flowerOn) {
    acc(s.apexX - s.flower.size);
    acc(s.apexX + s.flower.size);
  }
  const dx = VW / 2 - (minX + maxX) / 2;
  const move = (b: Branch) => {
    for (let i = 0; i < b.n; i++) b.xs[i] += dx;
  };
  eachBranch(s.roots, move);
  eachBranch(s.stems, move);
  eachBranch(s.twigs, move);
  for (const l of s.leaves) l.x += dx;
  for (const b of s.buds) b.x += dx;
  s.apexX += dx;
  s.sx += dx;
};

const buildScene = (seed: number): Scene => {
  const rng = mulberry32(seed);
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const flip = () => (rng() < 0.5 ? -1 : 1);
  const pt: Pt = { x: 0, y: 0, a: 0 };

  // Per-plant "personality"
  const sx = rand(135, 265); // x of the seed / stem base (re-centred at the end)
  const leafScale = rand(0.88, 1.12);
  const leafWr = rand(0.3, 0.4);
  const leafA = ri(0, 3);
  const leafB = ri(5, 10);
  const toneOff = ri(0, 1);

  /* ---- roots: taproot, laterals, fine roots, surface roots ---- */
  const roots: Branch[] = [];
  const tapDrift = rand(-0.3, 0.3);
  const tap = growBranch(
    rng,
    sx,
    SOIL,
    HALF_PI + tapDrift,
    rand(150, 205),
    16,
    rand(0.25, 0.45),
    HALF_PI + tapDrift * 0.4,
    0.04,
    rand(4, 4.8),
    0.02,
    rand(0.26, 0.32),
  );
  roots.push(tap);

  const latN = ri(4, 8);
  let side = flip();
  for (let k = 0; k < latN; k++) {
    const f = 0.1 + (0.78 * (k + 0.5)) / latN + rand(-0.03, 0.03);
    side = rng() < 0.8 ? -side : side;
    sample(tap, f, pt);
    const s0 = tap.start + f * (tap.end - tap.start);
    const lat = growBranch(
      rng,
      pt.x,
      pt.y,
      pt.a + side * rand(0.8, 1.25),
      rand(60, 112),
      10,
      rand(0.4, 0.6),
      HALF_PI,
      0.05,
      rand(2.3, 2.8),
      s0,
      s0 + 0.17,
    );
    roots.push(lat);

    const fineN = roots.length < MAX_ROOTS - 8 ? ri(1, 3) : 1;
    for (let j = 0; j < fineN && roots.length < MAX_ROOTS; j++) {
      const ff =
        fineN === 1
          ? rand(0.5, 0.85)
          : 0.35 + (0.55 * (j + 0.5)) / fineN + rand(-0.04, 0.04);
      sample(lat, ff, pt);
      const s1 = s0 + ff * 0.17;
      roots.push(
        growBranch(
          rng,
          pt.x,
          pt.y,
          pt.a + flip() * rand(0.7, 1.1),
          rand(28, 52),
          6,
          0.6,
          HALF_PI,
          0.06,
          1.3,
          s1,
          s1 + 0.1,
        ),
      );
    }
  }

  const surfN = ri(1, 3);
  let ss = flip();
  for (let i = 0; i < surfN; i++) {
    const st = rand(0.04, 0.1);
    const a = ss > 0 ? rand(0.1, 0.5) : Math.PI - rand(0.1, 0.5);
    roots.push(
      growBranch(
        rng,
        sx,
        SOIL + 3,
        a,
        rand(60, 100),
        9,
        0.4,
        HALF_PI,
        0.03,
        rand(2, 2.4),
        st,
        st + 0.2,
      ),
    );
    ss = -ss;
  }
  let rootsEnd = 0;
  for (const b of roots) if (b.end > rootsEnd) rootsEnd = b.end;

  /* ---- stems: one main stem plus 0..2 secondary stems ---- */
  const stems: Branch[] = [];
  const r0 = rng();
  const nStem = r0 < 0.45 ? 1 : r0 < 0.8 ? 2 : 3;
  const lean0 = rand(-0.3, 0.3);
  const mainLen = rand(235, 285);
  const main = growBranch(
    rng,
    sx,
    SOIL,
    -HALF_PI + lean0,
    mainLen,
    36,
    rand(0.06, 0.16),
    -HALF_PI + lean0 * rand(-0.2, 0.6),
    0.05,
    rand(5, 6),
    0.28,
    rand(0.76, 0.82),
  );
  stems.push(main);

  let sd = flip();
  for (let i = 1; i < nStem; i++) {
    const st = rand(0.32, 0.44);
    const lean = sd * rand(0.2, 0.55);
    stems.push(
      growBranch(
        rng,
        sx + sd * rand(10, 38),
        SOIL,
        -HALF_PI + lean,
        mainLen * rand(0.55, 0.82),
        28,
        rand(0.06, 0.14),
        -HALF_PI + lean * rand(0.1, 0.6),
        0.05,
        rand(3.2, 4.2),
        st,
        st + rand(0.3, 0.38),
      ),
    );
    sd = -sd;
  }

  sample(main, 1, pt);
  const apexX = pt.x;
  const apexY = pt.y;
  const heightOf = (y: number) => clamp01((SOIL - y) / (SOIL - apexY));

  /* ---- twigs + leaves ---- */
  const twigs: Branch[] = [];
  const leaves: Leaf[] = [];

  const mkLeaf = (
    x: number,
    y: number,
    ang: number,
    size: number,
    start: number,
    end: number,
    tone: 0 | 1,
  ) => {
    leaves.push({
      x,
      y,
      ang,
      size: size * leafScale,
      start,
      end: Math.min(end, 0.96),
      phase: rng() * TAU,
      tone,
      wr: leafWr + rand(-0.04, 0.04),
      ci: tone ? leafB + ri(0, 2) : leafA + ri(0, 1),
      h: heightOf(y),
    });
  };

  const addTwigs = (stem: Branch, n: number, lenMul: number) => {
    let s = flip();
    for (let i = 0; i < n; i++) {
      const f = 0.27 + (0.52 * (i + 0.5)) / n + rand(-0.03, 0.03);
      s = rng() < 0.8 ? -s : s;
      sample(stem, f, pt);
      const baseA = pt.a;
      const s0 = stem.start + f * (stem.end - stem.start);
      const tw = growBranch(
        rng,
        pt.x,
        pt.y,
        baseA + s * rand(0.75, 1.2),
        Math.max(34, rand(60, 84) - i * 4) * lenMul,
        9,
        0.3,
        baseA + s * rand(0.35, 0.65),
        0.05,
        rand(1.8, 2.3),
        s0,
        s0 + 0.11,
      );
      twigs.push(tw);

      const k = 0.75 + 0.25 * lenMul;
      sample(tw, 1, pt);
      mkLeaf(
        pt.x,
        pt.y,
        pt.a + s * 0.15,
        rand(38, 50) * k,
        tw.end - 0.02,
        tw.end + 0.12,
        ((i + toneOff) & 1) as 0 | 1,
      );
      if (rng() < 0.85) {
        sample(tw, rand(0.45, 0.65), pt);
        mkLeaf(
          pt.x,
          pt.y,
          pt.a - s * rand(0.7, 1.0),
          rand(22, 30) * k,
          s0 + 0.07,
          s0 + 0.17,
          ((i + toneOff + 1) & 1) as 0 | 1,
        );
      }
    }
  };

  const addCrown = (
    stem: Branch,
    scale: number,
    pairs: number,
    center: boolean,
  ) => {
    sample(stem, 1, pt);
    const x = pt.x;
    const y = pt.y;
    const a = pt.a;
    const t0 = stem.end;
    if (center) mkLeaf(x, y, a, rand(52, 62) * scale, t0 - 0.04, t0 + 0.13, 0);
    const spread = rand(0.55, 0.95);
    for (let j = 0; j < pairs; j++) {
      const sp = spread + j * rand(0.45, 0.6);
      const sz = rand(44, 50) * scale * (1 - 0.18 * j);
      const st = t0 - 0.01 + 0.015 * j;
      const en = t0 + 0.15 + 0.01 * j;
      mkLeaf(x, y + 4, a - sp, sz, st, en, 1);
      mkLeaf(x, y + 4, a + sp, sz * rand(0.9, 1.05), st, en, 0);
    }
  };

  addTwigs(main, nStem === 1 ? ri(3, 5) : nStem === 2 ? ri(2, 4) : ri(2, 3), 1);
  const mainPairs = ri(1, 2);
  addCrown(main, 1, mainPairs, mainPairs === 1 ? rng() < 0.85 : rng() < 0.8);

  const buds: { x: number; y: number }[] = [];
  for (let i = 1; i < stems.length; i++) {
    const sec = stems[i];
    addTwigs(sec, ri(1, 2), 0.8);
    const pairs = rng() < 0.5 ? 0 : 1;
    addCrown(sec, 0.7, pairs, pairs === 0 ? true : rng() < 0.6);
    sample(sec, 1, pt);
    buds.push({ x: pt.x, y: pt.y });
  }

  /* ---- flower on the main crown (or just a glow when petals = 0) ---- */
  const c1 = ri(0, RAMP - 1);
  const flower: Flower = {
    petals: rng() < 0.65 ? ri(5, 8) : 0,
    size: rand(24, 36),
    rot: rand(0, TAU),
    layers: rng() < 0.5 ? 2 : 1,
    c1,
    c2: (c1 + ri(5, 11)) % RAMP,
    wr: rand(0.28, 0.42),
  };

  /* ---- soil specks and rhizosphere microbes ---- */
  const soil = new Float32Array(SOIL_DOTS * 3);
  for (let i = 0; i < SOIL_DOTS; i++) {
    soil[i * 3] = rand(30, VW - 30);
    soil[i * 3 + 1] = rand(SOIL + 10, VH - 20);
    soil[i * 3 + 2] = rand(0.6, 1.5);
  }
  const mbRoot = new Uint8Array(MICROBES);
  const mbFrac = new Float32Array(MICROBES);
  const mbPhase = new Float32Array(MICROBES);
  const mbRad = new Float32Array(MICROBES);
  const mbSpeed = new Float32Array(MICROBES);
  for (let i = 0; i < MICROBES; i++) {
    mbRoot[i] = (rng() * roots.length) | 0;
    mbFrac[i] = rand(0.25, 0.95);
    mbPhase[i] = rng() * TAU;
    mbRad[i] = rand(6, 15);
    mbSpeed[i] = rand(0.6, 1.6);
  }

  const scene: Scene = {
    sx,
    roots,
    rootsEnd,
    stems,
    twigs,
    leaves,
    flower,
    buds,
    apexX,
    apexY,
    soil,
    mbRoot,
    mbFrac,
    mbPhase,
    mbRad,
    mbSpeed,
    dir: flip(),
    drp: rand(0.85, 1.1),
  };

  // Whatever shape the plant ended up with: centre it on the soil line
  centerScene(scene, flower.petals > 0);
  return scene;
};

/* ------------------------------------------------------------------ */
/*  Canvas renderer                                                    */
/* ------------------------------------------------------------------ */

const parseHex = (v: string, fb: number[]): number[] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};

const makeSprite = (c: number[]): HTMLCanvasElement => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const sc = cv.getContext("2d");
  if (!sc) return cv;
  const [r, g, b] = c;
  const hi = `rgb(${Math.round(r + (255 - r) * 0.75)},${Math.round(g + (255 - g) * 0.75)},${Math.round(b + (255 - b) * 0.75)})`;
  const base = (a: number) => `rgba(${r},${g},${b},${a})`;
  const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, hi);
  grad.addColorStop(0.14, base(1));
  grad.addColorStop(0.32, base(0.9));
  grad.addColorStop(0.5, base(0.3));
  grad.addColorStop(0.75, base(0.08));
  grad.addColorStop(1, base(0));
  sc.fillStyle = grad;
  sc.fillRect(0, 0, 64, 64);
  return cv;
};

/* ------------------------------------------------------------------ */
/*  Story readout: percent + stage title + stage label                 */
/*  Written straight to the DOM (no React re-renders while loading).   */
/* ------------------------------------------------------------------ */

type Pair = [string, string]; // [title, metric label]
interface Stage {
  to: number; // upper bound of the stage, in % of the overall progress
  fa: Pair;
  en: Pair;
}

// Stages follow what the canvas really shows: roots & microbes -> weak, limp
// stem -> nutrients arrive -> they climb to the crown.
const STAGES: Stage[] = [
  {
    to: 34,
    fa: ["تشکیل ریشه و استقرار میکروب‌های مفید", "کلونیزاسیون ریزوسفر"],
    en: [
      "Root formation and beneficial microbes settling",
      "Rhizosphere colonization",
    ],
  },
  {
    to: 70,
    fa: ["ساقهٔ ضعیف و رشد ناقص؛ گیاه پژمرده است", "فشار تورگر"],
    en: [
      "A weak stem and stunted growth — the plant is wilting",
      "Turgor pressure",
    ],
  },
  {
    to: 86,
    fa: ["مواد زیستی کود به ریشه‌ها می‌رسد", "جذب مواد مغذی"],
    en: ["Bio-fertiliser nutrients reach the roots", "Nutrient uptake"],
  },
  {
    to: 100,
    fa: ["مواد مغذی به سمت تاج گیاه بالا می‌رود", "انتقال به تاج گیاه"],
    en: [
      "Nutrients are rising through the stem to the crown",
      "Transport to the crown",
    ],
  },
];

// After 100%: the wave leaves the crown, the plant straightens, growth resumes
const REVIVED: { fa: Pair; en: Pair } = {
  fa: ["مواد زیستی کود به گیاه رسید؛ گیاه زنده شد و رشد کرد", "بازیابی تورگر"],
  en: [
    "Bio-fertiliser nutrients reached the plant — it revived and is growing",
    "Turgor recovery",
  ],
};
interface Readout {
  percent: string;
  title: string;
  metric: string;
}

const fmtPct = (n: number, fa: boolean) =>
  fa ? `${n.toLocaleString("fa-IR")}٪` : `${n}%`;

/**
 * p  : overall progress 0..100
 * bt : seconds since growth completed (-1 while still growing)
 */
const readout = (p: number, bt: number, fa: boolean): Readout => {
  const pc = p < 0 ? 0 : p > 100 ? 100 : p;
  let title: string;
  let metric: string;

  if (bt >= WAVE_T) {
    // The revival wave has fired: nutrients delivered, plant alive again
    const pair = fa ? REVIVED.fa : REVIVED.en;
    title = pair[0];
    metric =
      bt < WAVE_T + RISE_DUR ? pair[1] : fa ? "سلامت گیاه" : "Plant vitality";
  } else {
    let i = STAGES.findIndex((st) => pc <= st.to);
    if (i < 0) i = STAGES.length - 1;
    const pair = fa ? STAGES[i].fa : STAGES[i].en;
    title = pair[0];
    metric = pair[1];
  }

  return {
    percent: fmtPct(Math.round(bt >= 0 ? 100 : pc), fa),
    title,
    metric,
  };
};

/** Writes text only when it changed; the title gets a soft swap animation. */
const put = (el: HTMLElement | null, text: string, swap = false) => {
  if (!el || el.textContent === text) return;
  const had = el.textContent !== "";
  el.textContent = text;
  if (
    swap &&
    had &&
    typeof el.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    el.animate(
      [
        { opacity: 0, transform: "translateY(5px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }
};

const PlantCanvas = ({
  progress,
  revive,
  turgor,
  frozen,
}: {
  progress: MotionValue<number>;
  /** seconds since growth completed (-1 while growing) — written by the canvas */
  revive: MotionValue<number>;
  /** live turgor 0..1 of the plant model — written by the canvas */
  turgor: MotionValue<number>;
  /** set to true when the loader starts leaving: drawing stops, last frame stays */
  frozen: { current: boolean };
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // A brand-new plant for every mount / page load
    const scene = buildScene(newSeed());
    const {
      sx,
      roots,
      rootsEnd,
      stems,
      twigs,
      leaves,
      flower,
      buds,
      apexX,
      apexY,
      soil,
      dir: wdir,
      drp,
    } = scene;

    let raf = 0;
    let bx = 1;
    let by = 1;
    let lastT = 0;
    let doneAt = -1;
    let spawned = false;

    // Wilt state: 1 = limp and drooping, 0 = upright and vigorous
    let W = 0;
    const wo = { x: 0, y: 0 };
    const SH = Math.max(60, SOIL - apexY); // plant height, used to normalise the bend
    const droopX = 120 * drp;

    // Bends a point of the above-ground plant according to the current wilt.
    // Base stays pinned to the soil, the top droops sideways and down.
    const wp = (x: number, y: number) => {
      const h = SOIL - y;
      if (W === 0 || h <= 0) {
        wo.x = x;
        wo.y = y;
        return;
      }
      const u = Math.min(h / SH, 1.35);
      const k = W * u * u;
      wo.x = x + wdir * k * droopX;
      wo.y = y + k * h * 0.34;
    };

    // Theme dependent values (rebuilt by updateColors)
    let glowOp: GlobalCompositeOperation = "source-over";
    let gk = 0.7;
    let baseAlpha = 0.9;
    let ramp: string[] = [];
    let spr: HTMLCanvasElement[] = [];
    let hotP = "#fff";
    let hotS = "#fff";
    let hotW = "#fff";
    let groundGrad: string | CanvasGradient = "transparent";

    // Static underground layer (soil + fully grown roots) cached once grown
    let rootLayer: HTMLCanvasElement | null = null;

    // Preallocated particle state
    const tmp: Pt = { x: 0, y: 0, a: 0 };
    const gsv = new Float32Array(4);
    const flowU = new Float32Array(FLOW_COUNT);
    const flowSp = new Float32Array(FLOW_COUNT);
    const flowOff = new Float32Array(FLOW_COUNT);
    for (let i = 0; i < FLOW_COUNT; i++) {
      flowU[i] = Math.random();
      flowSp[i] = 0.1 + Math.random() * 0.16;
      flowOff[i] = Math.random() * TAU;
    }
    const spX = new Float32Array(SPORES);
    const spY = new Float32Array(SPORES);
    const spVX = new Float32Array(SPORES);
    const spVY = new Float32Array(SPORES);
    const spL = new Float32Array(SPORES);

    const updateColors = () => {
      const css = getComputedStyle(document.documentElement);
      const dark = document.documentElement.classList.contains("dark");
      const pri = parseHex(
        css.getPropertyValue("--kz-brand-primary"),
        [0, 229, 153],
      );
      const sec = parseHex(
        css.getPropertyValue("--kz-brand-secondary"),
        [0, 163, 255],
      );
      const mid = [
        (pri[0] + sec[0]) / 2,
        (pri[1] + sec[1]) / 2,
        (pri[2] + sec[2]) / 2,
      ];
      const shade = dark ? 1 : 0.78;

      ramp = Array.from({ length: RAMP }, (_, i) => {
        const t = i / (RAMP - 1);
        return `rgb(${Math.round((pri[0] + (sec[0] - pri[0]) * t) * shade)},${Math.round(
          (pri[1] + (sec[1] - pri[1]) * t) * shade,
        )},${Math.round((pri[2] + (sec[2] - pri[2]) * t) * shade)})`;
      });

      const hot = (c: number[], m: number) =>
        `rgb(${Math.round(c[0] + (255 - c[0]) * m)},${Math.round(c[1] + (255 - c[1]) * m)},${Math.round(
          c[2] + (255 - c[2]) * m,
        )})`;
      hotP = hot(pri, dark ? 0.5 : 0.35);
      hotS = hot(sec, dark ? 0.5 : 0.35);
      hotW = hot(mid, dark ? 0.4 : 0.25);

      spr = [makeSprite(pri), makeSprite(sec), makeSprite(mid)];
      // Additive light on dark backgrounds, soft coloured light on light ones
      glowOp = dark ? "lighter" : "source-over";
      gk = dark ? 0.9 : 0.55;
      baseAlpha = dark ? 0.95 : 0.9;

      const lg = ctx.createLinearGradient(20, 0, 380, 0);
      lg.addColorStop(0, `rgba(${pri[0]},${pri[1]},${pri[2]},0)`);
      lg.addColorStop(
        0.5,
        `rgba(${pri[0]},${pri[1]},${pri[2]},${dark ? 0.55 : 0.7})`,
      );
      lg.addColorStop(1, `rgba(${pri[0]},${pri[1]},${pri[2]},0)`);
      groundGrad = lg;

      rootLayer = null; // colours changed -> rebuild the cached layer
    };

    // Resolution cap by device tier (may be lowered once if frames get slow)
    const tier =
      (document.documentElement.dataset.perf as PerfTier | undefined) ??
      applyPerfTier();
    let dprCap = tier === "low" ? 1 : tier === "mid" ? 1.25 : 1.5;
    let sizeKey = "";

    const resize = (force = false) => {
      if (frozen.current) return;
      // dpr capped: the art is soft/glowy, and this cuts fill-rate cost a lot
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      // Quantised in 5% steps, so tiny viewport changes (mobile URL bar,
      // scrollbars) never re-allocate / clear the canvas -> no flicker or shake
      const s =
        Math.floor(
          Math.max(
            0.5,
            Math.min(
              (window.innerWidth * 0.92) / VW,
              (window.innerHeight * 0.72) / VH,
              1.3,
            ),
          ) * 20,
        ) / 20;
      const key = `${s}|${dpr}`;
      if (!force && key === sizeKey) return;
      sizeKey = key;
      canvas.style.width = `${CW * s}px`;
      canvas.style.height = `${CH * s}px`;
      canvas.style.margin = `${-PAD * s}px`;
      canvas.width = Math.round(CW * s * dpr);
      canvas.height = Math.round(CH * s * dpr);
      bx = canvas.width / CW;
      by = canvas.height / CH;
      rootLayer = null;
    };

    // Elegant upward burst: a golden-angle (phyllotaxis) spread of light motes
    const spawnSpores = (cx: number, cy: number) => {
      for (let i = 0; i < SPORES; i++) {
        const a = i * GOLDEN_ANGLE;
        const rr = Math.sqrt((i + 0.5) / SPORES);
        spX[i] = cx + Math.cos(a) * rr * 14;
        spY[i] = cy + Math.sin(a) * rr * 8;
        spVX[i] = Math.cos(a) * (8 + rr * 26);
        spVY[i] = -(12 + Math.random() * 34) + Math.sin(a) * 6;
        spL[i] = 1.6 + Math.random() * 1.6;
      }
    };

    const drawBranch = (
      c: CanvasRenderingContext2D,
      b: Branch,
      g: number,
      wMul: number,
      warp: boolean,
    ) => {
      const full = g * b.total;
      const bend = warp && W !== 0;
      let lastCi = -1;
      for (let i = 0; i < b.n - 1; i++) {
        const c0 = b.cum[i];
        if (c0 >= full) break;
        let x0 = b.xs[i];
        let y0 = b.ys[i];
        let x1 = b.xs[i + 1];
        let y1 = b.ys[i + 1];
        const c1 = b.cum[i + 1];
        if (c1 > full) {
          const t = (full - c0) / (c1 - c0);
          x1 = x0 + (x1 - x0) * t;
          y1 = y0 + (y1 - y0) * t;
        }
        if (bend) {
          wp(x0, y0);
          x0 = wo.x;
          y0 = wo.y;
          wp(x1, y1);
          x1 = wo.x;
          y1 = wo.y;
        }
        const ci = b.ci[i];
        if (ci !== lastCi) {
          c.strokeStyle = ramp[ci];
          lastCi = ci;
        }
        c.lineWidth = b.w * wMul * (1 - 0.6 * (c0 / b.total));
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }
    };

    const gOf = (b: Branch, p: number) =>
      easeOutQuad(clamp01((p - b.start) / (b.end - b.start)));

    const leafPath = (len: number, wr = 0.36) => {
      const w = len * wr;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.22, -w, len * 0.72, -w * 0.85, len, 0);
      ctx.bezierCurveTo(len * 0.72, w * 0.85, len * 0.22, w, 0, 0);
      ctx.closePath();
    };

    const glowAt = (
      spriteIdx: number,
      x: number,
      y: number,
      size: number,
      alpha: number,
    ) => {
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(spr[spriteIdx], x - size / 2, y - size / 2, size, size);
    };

    // Soil line, soil specks and roots (static once every root is fully grown)
    const paintGround = (c: CanvasRenderingContext2D, p: number) => {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.globalCompositeOperation = "source-over";

      c.globalAlpha = clamp01(p * 20);
      c.strokeStyle = groundGrad;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(20, SOIL);
      c.lineTo(380, SOIL);
      c.stroke();

      c.globalAlpha = 0.2 * clamp01(p * 8);
      c.fillStyle = ramp[RAMP - 1];
      c.beginPath();
      for (let i = 0; i < SOIL_DOTS; i++) {
        const r = soil[i * 3 + 2];
        c.rect(soil[i * 3] - r, soil[i * 3 + 1] - r, r * 2, r * 2);
      }
      c.fill();

      c.globalAlpha = baseAlpha;
      for (const b of roots) {
        const g = gOf(b, p);
        if (g > 0.001) drawBranch(c, b, g, 1, false);
      }
    };

    const buildRootLayer = () => {
      const cv = document.createElement("canvas");
      cv.width = canvas.width;
      cv.height = canvas.height;
      const c = cv.getContext("2d");
      if (!c) return;
      c.setTransform(bx, 0, 0, by, bx * PAD, by * PAD);
      paintGround(c, 1);
      rootLayer = cv;
    };

    const draw = (nowMs: number) => {
      const now = nowMs / 1000;
      const dt = lastT === 0 ? 0.016 : Math.min(now - lastT, 0.05);
      lastT = now;

      const prog = progress.get();
      const p = prog / 100;
      if (prog >= 99.9 && doneAt < 0) doneAt = now;
      const bt = doneAt < 0 ? 0 : now - doneAt;
      // "Activation" is tied to the revival wave, not to the end of growth
      const bloom = smooth((bt - WAVE_T + 0.1) / 0.9);

      /* ---- wilt: limp plant -> slowly perks up as bio-fertiliser arrives
              -> snaps upright (with a little spring) when the wave fires ---- */
      const wb = 1 - 0.3 * smooth((p - 0.4) / 0.5);
      W =
        doneAt < 0
          ? wb
          : wb * (1 - easeOutBack(clamp01((bt - WAVE_T) / RISE_DUR)));
      if (W > -0.002 && W < 0.002) W = 0;
      // Feed the live plant state to the text readout (DOM-only, no re-render)
      turgor.set(clamp01(1 - W));
      if (doneAt >= 0) revive.set(bt);
      const wPos = W > 0 ? W : 0; // positive part (wilt only)

      // Limp plants sway slower and wider, a healthy one sways lightly
      const sway = reduce
        ? 0
        : Math.sin(now * (0.9 - 0.3 * wPos)) * (0.014 + 0.01 * wPos) +
          Math.sin(now * 1.7 + 1) * 0.006 * (1 - wPos);

      // Current (bent) position of the crown
      wp(apexX, apexY);
      const ax = wo.x;
      const ay = wo.y;

      if (doneAt >= 0 && !spawned && bt > WAVE_T) {
        spawned = true;
        if (!reduce) spawnSpores(apexX, apexY);
      }

      /* ================= underground group ================= */
      if (p >= rootsEnd && !rootLayer) buildRootLayer();

      ctx.globalCompositeOperation = "source-over";
      if (rootLayer) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(rootLayer, 0, 0);
        ctx.setTransform(bx, 0, 0, by, bx * PAD, by * PAD);
      } else {
        ctx.setTransform(bx, 0, 0, by, bx * PAD, by * PAD);
        ctx.clearRect(-PAD, -PAD, CW, CH);
        paintGround(ctx, p);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Rhizosphere microbes (PGPR) clustering around the roots
      ctx.globalCompositeOperation = glowOp;
      for (let i = 0; i < MICROBES; i++) {
        const b = roots[scene.mbRoot[i]];
        const g = gOf(b, p);
        const f = scene.mbFrac[i];
        if (g <= f) continue;
        sample(b, f, tmp);
        const t = reduce ? 0 : now * scene.mbSpeed[i] + scene.mbPhase[i];
        const rad = scene.mbRad[i];
        const x = tmp.x + Math.cos(t) * rad;
        const y = tmp.y + Math.sin(t * 1.3) * rad * 0.7;
        const a = clamp01((g - f) * 6) * (0.55 + 0.35 * Math.sin(t * 2));
        glowAt(1, x, y, 9, a * gk);
      }

      // Root tip glows (only while roots are still growing)
      if (!rootLayer) {
        for (const b of roots) {
          const g = gOf(b, p);
          if (g > 0.001 && g < 0.999) {
            sample(b, g, tmp);
            glowAt(1, tmp.x, tmp.y, b.w * 6 + 8, 0.85 * gk);
          }
        }
      }

      // Seed
      if (p > 0.001) {
        const pulse = reduce ? 0 : Math.sin(now * 3) * 3;
        glowAt(2, sx, SOIL, 26 + pulse + 18 * bloom, clamp01(p * 30) * gk);
      }
      ctx.globalCompositeOperation = "source-over";

      /* ================= above-ground group (swaying) ================= */
      ctx.setTransform(
        bx,
        0,
        bx * sway,
        by,
        bx * (PAD - sway * SOIL),
        by * PAD,
      );
      const stemW = 1 + 0.3 * bloom;

      // Secondary stems first (behind), main stem last
      ctx.globalAlpha = baseAlpha * (1 - 0.15 * wPos);
      for (let i = stems.length - 1; i >= 0; i--) {
        const g = gOf(stems[i], p);
        gsv[i] = g;
        if (g > 0.001) drawBranch(ctx, stems[i], g, stemW, true);
      }
      for (const b of twigs) {
        const g = gOf(b, p);
        if (g > 0.001) drawBranch(ctx, b, g, 1, true);
      }
      const gs = gsv[0];

      // Stem energy overlay: nutrients arriving, then full activation
      const stemGlow =
        (0.35 * smooth((p - 0.7) / 0.25) + 0.4 * bloom) * (1 - 0.5 * wPos);
      if (stemGlow > 0.01) {
        ctx.globalCompositeOperation = glowOp;
        ctx.globalAlpha = Math.min(1, stemGlow * 0.25 * gk);
        ctx.strokeStyle = hotP;
        ctx.lineWidth = 4 + 3 * bloom;
        for (let s = 0; s < stems.length; s++) {
          if (gsv[s] <= 0.001) continue;
          const st = stems[s];
          const full = gsv[s] * st.total;
          ctx.beginPath();
          wp(st.xs[0], st.ys[0]);
          ctx.moveTo(wo.x, wo.y);
          for (let i = 1; i < st.n; i++) {
            if (st.cum[i] > full) break;
            wp(st.xs[i], st.ys[i]);
            ctx.lineTo(wo.x, wo.y);
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // Tip glows for stems and twigs
      ctx.globalCompositeOperation = glowOp;
      for (let s = 0; s < stems.length; s++) {
        const g = gsv[s];
        if (g > 0.001 && g < 0.999) {
          sample(stems[s], g, tmp);
          wp(tmp.x, tmp.y);
          glowAt(0, wo.x, wo.y, s === 0 ? 30 : 22, 0.95 * gk);
        }
      }
      for (const b of twigs) {
        const g = gOf(b, p);
        if (g > 0.001 && g < 0.999) {
          sample(b, g, tmp);
          wp(tmp.x, tmp.y);
          glowAt(0, wo.x, wo.y, 18, 0.85 * gk);
        }
      }

      // Nutrient flow: particles travelling from the root tip up the main stem
      if (!reduce) {
        const tap = roots[0];
        const stem = stems[0];
        const gt = gOf(tap, p);
        const lenT = tap.total * gt;
        const lenS = stem.total * gs;
        const total = lenT + lenS;
        if (total > 4) {
          const vis = clamp01(p * 8);
          for (let i = 0; i < FLOW_COUNT; i++) {
            flowU[i] += dt * flowSp[i] * (1 + 0.6 * p);
            if (flowU[i] >= 1) flowU[i] -= 1;
            const d = flowU[i] * total;
            let fx: number;
            let fy: number;
            const under = d < lenT;
            if (under) {
              sample(tap, gt - d / tap.total, tmp);
              fx = tmp.x;
              fy = tmp.y;
            } else {
              sample(stem, (d - lenT) / stem.total, tmp);
              wp(tmp.x, tmp.y);
              fx = wo.x;
              fy = wo.y;
            }
            const wob = Math.sin(now * 2 + flowOff[i]) * 3;
            glowAt(
              under ? 1 : 0,
              fx + wob,
              fy,
              7,
              Math.sin(Math.PI * flowU[i]) * 0.85 * vis * gk,
            );
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";

      /* ================= leaves ================= */
      for (const l of leaves) {
        const g = clamp01((p - l.start) / (l.end - l.start));
        if (g <= 0) continue;
        const ignite = smooth((p - 0.8 - 0.15 * l.h) / 0.05) * (1 - wPos);
        const glow = Math.max(ignite * 0.4, bloom * 0.6);
        const size =
          l.size * easeOutBack(g) * (1 + 0.16 * bloom) * (1 - 0.24 * wPos);
        let ang = l.ang + (reduce ? 0 : Math.sin(now * 1.3 + l.phase) * 0.05);

        // Wilted leaves hang down; healthy ones open up
        if (W !== 0) {
          let d = Math.atan2(Math.sin(HALF_PI - ang), Math.cos(HALF_PI - ang));
          if (Math.abs(d) > 2.7) d = wdir * 2.7;
          ang += d * W * 0.6;
        }
        wp(l.x, l.y);
        const lx = wo.x;
        const ly = wo.y;
        const la = 1 - 0.22 * wPos;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang);

        // Body
        ctx.globalAlpha = baseAlpha * 0.82 * la * Math.min(1, g * 2);
        ctx.fillStyle = ramp[l.ci];
        leafPath(size, l.wr);
        ctx.fill();
        ctx.globalAlpha = baseAlpha * la * Math.min(1, g * 2);
        ctx.strokeStyle = ramp[3];
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // Midrib
        ctx.globalAlpha = 0.5 * la * Math.min(1, g * 2);
        ctx.strokeStyle = hotP;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.92, 0);
        ctx.stroke();

        // Activation glow (kept soft so plant details don't wash out)
        if (glow > 0.01) {
          ctx.globalCompositeOperation = glowOp;
          ctx.globalAlpha = Math.min(1, glow * 0.2 * gk);
          ctx.fillStyle = hotW;
          leafPath(size, l.wr);
          ctx.fill();
          const sz = size * 2.6;
          glowAt(l.tone ? 1 : 0, size * 0.5, 0, sz, glow * 0.3 * gk);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
      }

      /* ================= flower (opens right after the wave) ================= */
      const fbt = bt - (WAVE_T + 0.15);
      if (flower.petals > 0 && doneAt >= 0 && fbt > 0) {
        const fb = easeOutBack(clamp01(fbt / 1.1));
        if (fb > 0.01) {
          const n = flower.petals;
          const step = TAU / n;
          const spin = reduce ? 0 : now * 0.05;
          const fa = baseAlpha * 0.8 * Math.min(1, fbt / 0.5);
          ctx.strokeStyle = hotP;
          ctx.lineWidth = 0.7;
          for (let layer = 0; layer < flower.layers; layer++) {
            const sz = flower.size * fb * (layer === 0 ? 1 : 0.62);
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(flower.rot + spin + (layer ? step / 2 : 0));
            ctx.fillStyle = ramp[layer === 0 ? flower.c1 : flower.c2];
            ctx.globalAlpha = fa;
            for (let k = 0; k < n; k++) {
              leafPath(sz, flower.wr);
              ctx.fill();
              ctx.globalAlpha = fa * 0.6;
              ctx.stroke();
              ctx.globalAlpha = fa;
              ctx.rotate(step);
            }
            ctx.restore();
          }
          ctx.globalAlpha = Math.min(1, fb);
          ctx.fillStyle = hotW;
          ctx.beginPath();
          ctx.arc(ax, ay, flower.size * 0.11 * fb, 0, TAU);
          ctx.fill();
        }
      }

      /* ================= bloom: surge, ignition, halos, motes ================= */
      if (doneAt >= 0) {
        ctx.globalCompositeOperation = glowOp;

        // 1) Energy surge racing up the main stem into the crown
        const surge = clamp01(bt / WAVE_T);
        if (surge < 1) {
          sample(stems[0], surge * surge * (3 - 2 * surge), tmp);
          wp(tmp.x, tmp.y);
          glowAt(2, wo.x, wo.y, 34, (1 - surge * 0.4) * gk);
        }

        // 2) Ignition: a short, hot core flash at the crown when the surge lands
        const k = (bt - WAVE_T) / 0.22;
        const core = Math.exp(-k * k);
        if (core > 0.01) glowAt(2, ax, ay, 30 + 50 * core, core * 0.15 * gk);

        // 3) Lingering soft flare that settles around the crown
        const flare = smooth((bt - WAVE_T + 0.15) / 2.0);
        glowAt(2, ax, ay, 50 + 30 * flare, flare * 0.08 * gk);

        // 3b) Small glowing buds on secondary stems
        if (buds.length) {
          const bb = smooth((bt - WAVE_T + 0.1) / 0.8);
          if (bb > 0.01) {
            for (let i = 0; i < buds.length; i++) {
              wp(buds[i].x, buds[i].y);
              glowAt(i & 1 ? 0 : 1, wo.x, wo.y, 14 + 12 * bb, bb * 0.5 * gk);
            }
          }
        }

        // 4) Soft light streaks (blurred sprites, not hard lines)
        const sEnv =
          smooth((bt - WAVE_T + 0.05) / 0.6) * (1 - smooth((bt - 1.8) / 1.8));
        if (sEnv > 0.01 && !reduce) {
          for (let i = 0; i < STREAKS; i++) {
            const a = i * (TAU / STREAKS) + i * 0.17 + now * 0.1;
            const len = (70 + 34 * ((i * 5) % 3)) * (0.5 + 0.5 * sEnv);
            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(a);
            ctx.globalAlpha = Math.min(1, 0.08 * sEnv * gk);
            ctx.drawImage(spr[2], 6, -4, len, 8);
            ctx.restore();
          }
        }

        // 5) Two thin, fading halo rings travelling outward (the revival wave)
        ctx.lineWidth = 1;
        for (let r = 0; r < 2; r++) {
          const t = (bt - WAVE_T - r * 0.4) / 2.2;
          if (t <= 0 || t >= 1) continue;
          const e = easeOutCubic(t);
          ctx.globalAlpha = Math.min(1, 0.16 * (1 - t) * (1 - t) * gk);
          ctx.strokeStyle = r === 0 ? hotW : hotS;
          ctx.lineWidth = 0.5 + 0.8 * (1 - t);
          ctx.beginPath();
          ctx.arc(apexX, apexY, 14 + 180 * e, 0, TAU);
          ctx.stroke();
        }

        // 6) Light motes drifting upward like fireflies
        if (!reduce) {
          const drag = Math.pow(0.985, dt * 60);
          for (let i = 0; i < SPORES; i++) {
            if (spL[i] <= 0) continue;
            spL[i] -= dt;
            spVX[i] *= drag;
            spVY[i] = spVY[i] * drag - 5 * dt;
            spX[i] += spVX[i] * dt + Math.sin(now * 2 + i) * 0.12;
            spY[i] += spVY[i] * dt;
            const life = clamp01(spL[i]);
            glowAt(
              i & 1 ? 1 : 2,
              spX[i],
              spY[i],
              3 + 5 * life,
              life * 0.25 * gk,
            );
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.globalAlpha = 1;
    };

    // Frame pacing: capped at ~60 fps (even on 120/144 Hz screens) and
    // automatically halved to 30 fps if drawing gets expensive.
    let interval = 1000 / 60;
    let lastDraw = 0;
    let ema = 0;
    let gapEma = 16;
    let drawn = 0;
    let downgraded = false;

    const frame = (nowMs: number) => {
      // Once the loader starts leaving, the last frame simply stays on screen:
      // zero CPU/GPU is spent while the site underneath is mounting
      if (frozen.current) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
      // Don't burn CPU/GPU while the tab is hidden
      if (document.hidden) {
        lastT = 0;
        lastDraw = 0;
        return;
      }
      const gap = lastDraw ? nowMs - lastDraw : interval;
      if (lastDraw && gap < interval * 0.8) return;
      lastDraw = nowMs;

      const t0 = performance.now();
      draw(nowMs);
      const cost = performance.now() - t0;

      drawn++;
      ema = ema * 0.9 + cost * 0.1;
      gapEma = gapEma * 0.9 + Math.min(gap, 100) * 0.1;
      if (ema > 11 && interval < 40) interval = 1000 / 30;
      else if (ema < 5.5 && interval > 20) interval = 1000 / 60;

      // Sustained slowness: render at a lower resolution (once)
      if (
        !downgraded &&
        drawn > 30 &&
        dprCap > 1 &&
        (ema > 12 || (interval < 20 && gapEma > 36))
      ) {
        downgraded = true;
        dprCap = 1;
        resize(true);
      }
    };

    updateColors();
    resize();
    raf = requestAnimationFrame(frame);

    // Debounced: a burst of resize events never clears / rebuilds the canvas
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => resize(), 120);
    };
    window.addEventListener("resize", onResize);

    // Only theme-relevant bits of <html> are compared, so unrelated attribute
    // writes during hydration never trigger getComputedStyle + sprite rebuilds.
    const readThemeSig = () => {
      const root = document.documentElement;
      const vars = (root.getAttribute("style") || "").match(/--kz[^;]*/g);
      return `${root.classList.contains("dark")}|${root.getAttribute("data-theme")}|${vars ? vars.join(";") : ""}`;
    };
    let themeSig = readThemeSig();
    let themeTimer = 0;
    const observer = new MutationObserver(() => {
      const sig = readThemeSig();
      if (sig === themeSig) return;
      themeSig = sig;
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(() => {
        if (!frozen.current) updateColors();
      }, 60);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(themeTimer);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [progress, revive, turgor, frozen]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none block" />;
};

/* ------------------------------------------------------------------ */
/*  Loading screen                                                     */
/* ------------------------------------------------------------------ */

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const { lang } = useLanguage();
  const isFa = lang === "fa";
  const isFaRef = useRef(isFa);
  isFaRef.current = isFa;

  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const progress = useMotionValue(0);
  // written by the canvas: seconds since growth completed, and live plant turgor
  const revive = useMotionValue(-1);
  const turgor = useMotionValue(0);
  // read by the canvas: becomes true when the loader starts leaving.
  // (A ref object, because AnimatePresence keeps the exiting subtree's old props.)
  const frozen = useRef(false);
  const haloOpacity = useTransform(progress, [0, 85, 100], [0.25, 0.55, 1]);

  const percentRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const metricRef = useRef<HTMLSpanElement>(null);

  // Percent / stage title / stage label go straight to the DOM: no React render per frame
  const refresh = useCallback(() => {
    const r = readout(progress.get(), revive.get(), isFaRef.current);
    put(percentRef.current, r.percent);
    put(titleRef.current, r.title, true);
    put(metricRef.current, r.metric, true);
  }, [progress, revive]);

  useMotionValueEvent(progress, "change", refresh);
  useMotionValueEvent(revive, "change", refresh);

  useEffect(() => {
    if (mounted) refresh();
  }, [mounted, isFa, refresh]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setMounted(true);
    setSiteStatus("loading");
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let loaded = false;
    let finished = false;
    let lastTick = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = performance.now();

    const windowLoaded = new Promise<void>((res) => {
      if (document.readyState === "complete") res();
      else window.addEventListener("load", () => res(), { once: true });
    });
    const fontsReady: Promise<unknown> =
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
        ?.ready ?? Promise.resolve();
    const safety = new Promise<void>((res) =>
      timers.push(setTimeout(res, 7500)),
    );

    Promise.race([Promise.all([windowLoaded, fontsReady]), safety]).then(() => {
      loaded = true;
    });

    const finish = () => {
      timers.push(
        setTimeout(() => {
          // freeze the plant canvas: the site underneath mounts right now
          frozen.current = true;
          setIsExiting(true);
          setSiteStatus("ready");
          timers.push(setTimeout(() => onCompleteRef.current(), 1150));
        }, BLOOM_HOLD_MS),
      );
    };

    const tick = (now: number) => {
      // Time-based (not frame-based): progress stays smooth when frames drop
      const dt = lastTick ? Math.min((now - lastTick) / 1000, 0.1) : 1 / 60;
      lastTick = now;

      const elapsed = now - start;
      const p = Math.min(elapsed / MIN_MS, 1);
      // Gentler ease-out (was 2.2): every stage text stays on screen long
      // enough to be read, instead of the first stages flashing by
      const base = (1 - Math.pow(1 - p, 1.6)) * 100;
      // While the page is still loading, creep slowly from 92% towards ~96%
      // so a slow connection never looks frozen
      const creep = 4 * (1 - Math.exp(-Math.max(0, elapsed - MIN_MS) / 4000));
      const target = loaded ? base : Math.min(base, 92) + creep;

      const cur = progress.get();
      const k = 1 - Math.pow(1 - 0.14, dt * 60);
      let next = target > cur ? cur + (target - cur) * k : cur;
      if (target >= 100 && next > 99.4) next = 100;
      progress.set(next);
      if (next >= 100 && !finished) {
        finished = true;
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [progress]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="kz-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: 1.2 } }}
          style={{ zIndex: 9999999, transform: "translateZ(0)" }}
          className="pointer-events-auto fixed inset-0 overflow-visible"
          role="status"
        >
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1/2 bg-kz-bg-body"
            exit={{
              y: "-101%",
              transition: { duration: 0.95, ease: EASE_CINEMA, delay: 0.2 },
            }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-kz-bg-body"
            exit={{
              y: "101%",
              transition: { duration: 0.95, ease: EASE_CINEMA, delay: 0.2 },
            }}
          />

          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-visible"
            exit={{
              opacity: 0,
              scale: 1.08,
              transition: { duration: 0.55, ease: "easeIn" },
            }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[44%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                opacity: haloOpacity,
                willChange: "opacity",
                background: `radial-gradient(circle, ${mix(PRIMARY, 14)} 0%, ${mix(SECONDARY, 6)} 50%, transparent 72%)`,
              }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: EASE_OUT }}
              className="relative flex flex-col items-center overflow-visible"
            >
              <PlantCanvas
                progress={progress}
                revive={revive}
                turgor={turgor}
                frozen={frozen}
              />

              {/* Fixed height: a longer title can never push the plant around */}
              <div className="mt-1 flex h-[6.25rem] w-[min(88vw,24rem)] flex-col items-center gap-1 text-center">
                <span
                  ref={percentRef}
                  aria-hidden
                  className="min-w-[4.5rem] text-lg font-semibold tabular-nums"
                  style={{ color: PRIMARY }}
                />
                <span
                  ref={titleRef}
                  className={`text-[13px] font-medium leading-snug opacity-90 ${isFa ? "" : "tracking-wide"}`}
                  style={{ color: SECONDARY }}
                />
                <span
                  ref={metricRef}
                  aria-hidden
                  className={`text-[11px] tabular-nums opacity-70 ${isFa ? "" : "tracking-wider"}`}
                  style={{ color: PRIMARY }}
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
