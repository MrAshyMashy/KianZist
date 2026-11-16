"use client";

/* =========================================================
   Cell-Signal Network — descending into the communication
   web of plants, fungi and microbes (unbounded procedural world)
   ---------------------------------------------------------
   - Uses the shared Usebiocanvas viewport engine (useBioCanvas).
   - Scroll depth d = worldY / pageHeight (0 → 1). Everything is driven
     by d, so the dive is stretched to the REAL content height at any time.
   - Segment geometry is height-independent: every element owns a random
     "rank" and is revealed when the local density(d) passes that rank.
   - Depth story:
       0.00  drifting spores / vesicles, first faint tissue
       0.05  plant cells (wall, vacuole, nucleus, streaming chloroplasts)
             + plasmodesmata with travelling signals that light the
             receiving cell
       0.18  root-linked mycorrhizal hyphae (smooth, tapered)
       0.42  signalling molecules and bacterial colonies
       0.48  arbuscules (fungus ↔ root exchange organs)
       0.60+ a slow calcium wave sweeps down the tissue and lights cells
             one after another; signals get a little denser and golden
   - Performance design:
       * cells are pre-rendered sprites (6 near + 3 blurred far variants)
         → one drawImage per cell instead of ~10 path operations
       * hyphae are cached Path2D objects (built once per segment)
       * plasmodesmata are batched into one stroke per row
       * far parallax layer = sprites only, no links, no chloroplasts
       * glows go through a single batched sprite buffer
   - Tiers: desktop = full · tablet = lite · phone = compact (no far layer,
     no chloroplast streaming, no molecules / ripples, fewer hyphae).
     reduced-motion, pause when hidden and adaptive fps come from the engine.
   - Cached layers: everything that only moves with the scroll (cell bodies,
     far lattice, plasmodesmata, hyphae strokes) is rendered ONCE into two small
     offscreen gutter layers and then simply blitted every frame. A layer is
     re-rendered only when the scroll leaves its padded window, or when the
     theme / geometry changes. Only truly animated things (signals, chloroplasts,
     colonies, waves, spores) are drawn live.
========================================================= */

import type { RefObject } from "react";
import {
  type BioEnv,
  type BioPalette,
  type BioScene,
  type RGB,
  TAU,
  clamp,
  makeGlowSprite,
  makeRodSprite,
  mixRGB,
  mulberry32,
  rgba,
  smooth,
  useBioCanvas,
} from "../shared/Usebiocanvas";

const SEG_H = 1280;
const MAX_SEGMENTS = 6; // cached layers look ahead by half a viewport each way
const LINE_W = [1.7, 1.15, 0.85, 0.6];
// sprite indices: 0 primary · 1 secondary · 2 pistachio · 3 gold

const CELL_VARIANTS = 6;
const CELL_PX = 176;
const FAR_VARIANTS = 3;
const FAR_PX = 112;
const FAR_PARALLAX = 0.55;

type Side = 0 | 1;

interface Pt {
  u: number;
  y: number;
  theta: number;
}

interface Hypha {
  xs: number[];
  ys: number[];
  cum: number[];
  len: number;
  minY: number;
  maxY: number;
  depth: number;
  rank: number;
  phase: number;
  speed: number;
  tint: number;
  path: Path2D;
  p60: Path2D | null;
  p30: Path2D | null;
  arbPath: Path2D | null;
}

interface Colony {
  x: number;
  y: number;
  R: number;
  rank: number;
  phase: number;
  rate: number;
  tint: number;
  cells: Array<{
    dx: number;
    dy: number;
    a: number;
    size: number;
    rod: boolean;
  }>;
}

interface Ripple {
  x: number;
  y: number;
  maxR: number;
  phase: number;
  speed: number;
  rank: number;
  tint: number;
}

interface Mote {
  x: number;
  y: number;
  phase: number;
  speed: number;
  size: number;
  rank: number;
  tint: number;
}

interface Molecule {
  x: number;
  y: number;
  size: number;
  rot: number;
  rotSpeed: number;
  phase: number;
  rank: number;
  tint: number;
  atoms: number[];
  bonds: number[];
}

interface Segment {
  index: number;
  hyphae: Hypha[];
  colonies: Colony[];
  ripples: Ripple[];
  motes: Mote[];
  molecules: Molecule[];
  lastUsed: number;
}

const freshSeed = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const value = new Uint32Array(1);
      crypto.getRandomValues(value);
      return value[0] || 1;
    }
  } catch {
    // Restricted contexts fall through to Math.random.
  }
  return (Math.random() * 0xffffffff) >>> 0;
};

const hash32 = (value: number) => {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};

const hr = (key: number, n: number) =>
  hash32(key + Math.imul(n + 1, 0x27d4eb2f)) / 4294967296;

const edgeX = (w: number, side: Side, u: number) => (side === 0 ? u : w - u);

const win = (d: number, a: number, b: number, c: number, e: number) =>
  smooth(a, b, d) * (1 - smooth(c, e, d));

/** Smooth curve through points (quadratic midpoints), cached as Path2D. */
const buildCurve = (xs: number[], ys: number[], n: number) => {
  const p = new Path2D();
  p.moveTo(xs[0], ys[0]);
  if (n < 3) {
    p.lineTo(xs[n - 1], ys[n - 1]);
    return p;
  }
  for (let i = 1; i < n - 1; i++) {
    p.quadraticCurveTo(
      xs[i],
      ys[i],
      (xs[i] + xs[i + 1]) / 2,
      (ys[i] + ys[i + 1]) / 2,
    );
  }
  p.lineTo(xs[n - 1], ys[n - 1]);
  return p;
};

/* ---------------- sprites ---------------- */

/** Plant cell: rounded double wall, central vacuole, nucleus. Pre-rendered once. */
const makeCellSprite = (
  pal: BioPalette,
  seed: number,
  px: number,
  rFrac: number,
  blur: number,
  detail: boolean,
) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = px;
  const g = cv.getContext("2d");
  if (!g) return cv;
  if (blur > 0) g.filter = `blur(${blur}px)`;

  const rng = mulberry32(seed);
  const c = px / 2;
  const R = px * rFrac;
  const dark = pal.dark;
  const wall = mixRGB(pal.pri, pal.pist, 0.25);

  const pts: number[] = [];
  const rot0 = rng() * TAU;
  for (let k = 0; k < 6; k++) {
    const ang = rot0 + (k / 6) * TAU + (rng() - 0.5) * 0.2;
    const r = R * (0.86 + rng() * 0.2);
    pts.push(c + Math.cos(ang) * r, c + Math.sin(ang) * r);
  }
  const mid = (k: number, o: number) =>
    (pts[k * 2 + o] + pts[((k + 1) % 6) * 2 + o]) / 2;
  const wallPath = () => {
    g.beginPath();
    g.moveTo(mid(5, 0), mid(5, 1));
    for (let k = 0; k < 6; k++) {
      g.quadraticCurveTo(pts[k * 2], pts[k * 2 + 1], mid(k, 0), mid(k, 1));
    }
    g.closePath();
  };

  wallPath();
  g.fillStyle = rgba(pal.sec, 0.045);
  g.fill();
  g.strokeStyle = rgba(wall, dark ? 0.34 : 0.3);
  g.lineWidth = 1.9;
  g.stroke();

  // inner wall line (middle-lamella look)
  g.save();
  g.translate(c, c);
  g.scale(0.92, 0.92);
  g.translate(-c, -c);
  wallPath();
  g.strokeStyle = rgba(wall, 0.14);
  g.lineWidth = 0.9;
  g.stroke();
  g.restore();

  // central vacuole
  const rv = R * 0.5;
  const ox = c + (rng() - 0.5) * R * 0.14;
  const oy = c + (rng() - 0.5) * R * 0.14;
  const gr = g.createRadialGradient(
    ox - rv * 0.2,
    oy - rv * 0.2,
    0,
    ox,
    oy,
    rv,
  );
  gr.addColorStop(0, rgba(pal.sec, 0.2));
  gr.addColorStop(1, rgba(pal.sec, 0.05));
  g.beginPath();
  g.ellipse(ox, oy, rv * 1.08, rv * 0.9, rng() * Math.PI, 0, TAU);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = rgba(pal.sec, 0.22);
  g.lineWidth = 1;
  g.stroke();

  if (detail) {
    const an = rng() * TAU;
    const nx = c + Math.cos(an) * R * 0.66;
    const ny = c + Math.sin(an) * R * 0.66;
    g.beginPath();
    g.arc(nx, ny, R * 0.12, 0, TAU);
    g.fillStyle = rgba(pal.pist, 0.34);
    g.fill();
    g.strokeStyle = rgba(pal.pri, 0.42);
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.arc(nx + R * 0.02, ny - R * 0.015, R * 0.04, 0, TAU);
    g.fillStyle = rgba(mixRGB(pal.pist, [255, 255, 255], 0.4), 0.7);
    g.fill();
  }
  return cv;
};

const makeChloroSprite = (pal: BioPalette) => {
  const cv = document.createElement("canvas");
  cv.width = 40;
  cv.height = 28;
  const g = cv.getContext("2d");
  if (!g) return cv;
  const col = mixRGB(pal.pist, pal.pri, 0.45);
  const core = mixRGB(col, [255, 255, 255], pal.dark ? 0.4 : 0.25);
  const gr = g.createRadialGradient(17, 11, 1, 20, 14, 17);
  gr.addColorStop(0, rgba(core, 0.95));
  gr.addColorStop(0.6, rgba(col, 0.8));
  gr.addColorStop(1, rgba(col, 0.5));
  g.beginPath();
  g.ellipse(20, 14, 16, 10, 0, 0, TAU);
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = rgba(mixRGB(col, [0, 0, 0], 0.35), 0.35);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(15, 8);
  g.lineTo(15, 20);
  g.moveTo(21, 6);
  g.lineTo(21, 22);
  g.moveTo(27, 8);
  g.lineTo(27, 20);
  g.stroke();
  return cv;
};

// scratch values (avoid per-frame allocations)
let bx = 0;
let by = 0;
let cu = 0;
let cyy = 0;
const dots: number[] = [];

/* ---------------- cached gutter layers ---------------- */

interface Layer {
  cv: HTMLCanvasElement | null;
  g: CanvasRenderingContext2D | null;
  dpr: number;
  sw: number; // gutter width (css px). Both gutters live side by side.
  lh: number; // layer height (css px) = viewport + 2 × pad
  pad: number;
  ref: number; // scroll-space position the layer was rendered for
  valid: boolean;
}

const newLayer = (): Layer => ({
  cv: null,
  g: null,
  dpr: 1,
  sw: 0,
  lh: 0,
  pad: 0,
  ref: 0,
  valid: false,
});

const allocLayer = (
  L: Layer,
  sw: number,
  viewportH: number,
  pad: number,
  dpr: number,
) => {
  const lh = viewportH + pad * 2;
  const pw = Math.max(1, Math.ceil(sw * 2 * dpr));
  const ph = Math.max(1, Math.ceil(lh * dpr));
  if (!L.cv) {
    L.cv = document.createElement("canvas");
    L.g = L.cv.getContext("2d");
  }
  if (L.cv.width !== pw) L.cv.width = pw;
  if (L.cv.height !== ph) L.cv.height = ph;
  L.dpr = dpr;
  L.sw = sw;
  L.lh = lh;
  L.pad = pad;
  L.valid = false;
};

const freeLayer = (L: Layer) => {
  L.cv = null;
  L.g = null;
  L.valid = false;
};

/** Two drawImage calls: left gutter + right gutter, offset by the scroll delta. */
const blitLayer = (
  ctx: CanvasRenderingContext2D,
  L: Layer,
  scroll: number,
  viewportH: number,
  w: number,
  alpha: number,
) => {
  if (!L.cv || !L.valid || alpha < 0.01) return;
  const sy = (L.pad + (scroll - L.ref)) * L.dpr;
  const sh = viewportH * L.dpr;
  const swp = L.sw * L.dpr;
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.drawImage(L.cv, 0, sy, swp, sh, 0, 0, L.sw, viewportH);
  ctx.drawImage(L.cv, swp, sy, swp, sh, w - L.sw, 0, L.sw, viewportH);
  ctx.globalAlpha = 1;
};

const layerStale = (L: Layer, scroll: number) =>
  !L.valid || !L.cv || Math.abs(scroll - L.ref) > L.pad * 0.8;

const createScene = (): BioScene => {
  // One seed per mounted page visit. Height changes never replace it.
  const worldSeed = freshSeed();
  const cache = new Map<number, Segment>();

  let worldHeight = 1;
  let segmentCount = 1;
  let width = 0;
  let scale = 1;
  let lite = false;
  let compact = false; // phones: lightest variant
  let zoneOuter = 0;
  let clock = 0; // seconds
  let pulseClock = 0; // seconds, drives low-cost signal pulses
  let useCounter = 0;
  let glow: HTMLCanvasElement[] = [];
  let rods: HTMLCanvasElement[] = [];
  let cells: HTMLCanvasElement[] = [];
  let farCells: HTMLCanvasElement[] = [];
  let chloro: HTMLCanvasElement | null = null;
  let gold: RGB = [255, 190, 70];
  const buf: number[] = [];

  // cached layers + the world-space display lists captured while rendering them
  const near = newLayer();
  const far = newLayer();
  const nearCells: number[] = []; // x, worldY, r0, a0, key, d
  const nearLinks: number[] = []; // x1, y1, x2, y2, ax, ay, nx, ny, r0, a0, key, m, d (world y)
  const farWave: number[] = []; // x, farY, size, a, d
  let featL: CanvasGradient | null = null;
  let featR: CanvasGradient | null = null;

  const depthAt = (wy: number) => clamp(wy / Math.max(1, worldHeight), 0, 1);
  const dens = (d: number) => 0.32 + 0.68 * d;
  // very slow shared "breathing" so the whole scene feels like one organism
  const breath = (d: number) => 1 + 0.07 * Math.sin(clock * 0.55 + d * 7);

  /** Calcium wave that sweeps down the viewport; active only deep in the page. */
  const waveAt = (screenY: number, d: number, viewportH: number) => {
    const b = smooth(0.6, 0.95, d);
    if (b < 0.02) return 0;
    const fy = viewportH * ((pulseClock * 0.085) % 1.5) - viewportH * 0.25;
    const dy = (screenY - fy) / (viewportH * 0.1);
    return b * Math.exp(-dy * dy);
  };

  const cellKey = (s: number, i: number, j: number, salt: number) =>
    worldSeed ^
    Math.imul(i + 101, 0x9e3779b1) ^
    Math.imul(j + 7919, 0x85ebca6b) ^
    Math.imul(s + 3 + salt, 0xc2b2ae35);

  const cellCenter = (
    key: number,
    ci: number,
    cj: number,
    cp: number,
    rp: number,
  ) => {
    cu = (ci + 0.5 + (cj & 1 ? 0.5 : 0)) * cp + (hr(key, 1) - 0.5) * cp * 0.34;
    cyy = cj * rp + (hr(key, 2) - 0.5) * rp * 0.34;
  };

  const segmentRandom = (index: number) =>
    mulberry32(hash32(worldSeed ^ Math.imul(index + 1, 0x9e3779b1)));

  /* ---------------- segment generation ---------------- */

  const buildSegment = (index: number, env: BioEnv): Segment => {
    const rng = segmentRandom(index);
    const hyphae: Hypha[] = [];
    const colonies: Colony[] = [];
    const ripples: Ripple[] = [];
    const motes: Mote[] = [];
    const molecules: Molecule[] = [];
    const sc = env.scale;
    const lt = env.lite;
    const tiny = env.compact;

    const step = Math.max(26, 30 * sc);
    const maxH = tiny ? 2 : lt ? 3 : 4;

    const buildArb = (
      x: number,
      y: number,
      ang: number,
      len: number,
      lvl: number,
      out: number[],
    ) => {
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      out.push(x, y, x2, y2);
      if (lvl <= 0) return;
      const spread = 0.45 + rng() * 0.35;
      buildArb(x2, y2, ang - spread, len * 0.68, lvl - 1, out);
      if (rng() < 0.72)
        buildArb(x2, y2, ang + spread, len * 0.68, lvl - 1, out);
    };

    const pushHypha = (
      xs: number[],
      ys: number[],
      depth: number,
      rank: number,
      withArb: boolean,
    ) => {
      const cum = [0];
      let minY = ys[0];
      let maxY = ys[0];
      for (let i = 1; i < xs.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
        if (ys[i] < minY) minY = ys[i];
        if (ys[i] > maxY) maxY = ys[i];
      }
      let arbPath: Path2D | null = null;
      if (withArb && xs.length > 2) {
        const n = xs.length;
        const ang = Math.atan2(ys[n - 1] - ys[n - 2], xs[n - 1] - xs[n - 2]);
        const arb: number[] = [];
        buildArb(xs[n - 1], ys[n - 1], ang, (18 + rng() * 10) * sc, 1, arb);
        arbPath = new Path2D();
        for (let i = 0; i < arb.length; i += 4) {
          arbPath.moveTo(arb[i], arb[i + 1]);
          arbPath.lineTo(arb[i + 2], arb[i + 3]);
          if (arb[i + 1] > maxY) maxY = arb[i + 1];
          if (arb[i + 1] < minY) minY = arb[i + 1];
          if (arb[i + 3] > maxY) maxY = arb[i + 3];
          if (arb[i + 3] < minY) minY = arb[i + 3];
        }
      }

      const n = xs.length;
      const path = buildCurve(xs, ys, n);
      let p60: Path2D | null = null;
      let p30: Path2D | null = null;
      // Tapered look: thicker root part (first 60% / 30%) overdrawn lightly.
      if (depth <= 1 && n >= 6) {
        p60 = buildCurve(xs, ys, Math.max(3, Math.ceil(n * 0.6)));
        p30 = buildCurve(xs, ys, Math.max(3, Math.ceil(n * 0.3)));
      }

      const roll = rng();
      hyphae.push({
        xs,
        ys,
        cum,
        len: cum[cum.length - 1],
        minY,
        maxY,
        depth,
        rank,
        phase: rng(),
        speed: 26 + rng() * 38,
        tint: roll < 0.5 ? 3 : roll < 0.8 ? 2 : 1,
        path,
        p60,
        p30,
        arbPath,
      });
    };

    for (const side of [0, 1] as const) {
      const sideStart = hyphae.length;

      const addHypha = (
        u0: number,
        y0: number,
        theta0: number,
        length: number,
        depth: number,
        rank: number,
      ): Pt[] | null => {
        if (hyphae.length - sideStart >= maxH || length < 30) return null;
        const count = Math.max(
          3,
          Math.ceil(length / (step * (depth > 1 ? 0.8 : 1))),
        );
        const ls = length / count;
        let u = u0;
        let y = y0;
        let th = theta0;
        const xs = [edgeX(env.w, side, u)];
        const ys = [y];
        const pts: Pt[] = [{ u, y, theta: th }];
        for (let i = 1; i <= count; i++) {
          th += (rng() - 0.5) * (depth === 0 ? 0.32 : 0.55);
          th = clamp(th, -1.25, 1.25);
          u += Math.sin(th) * ls * 0.9;
          if (u < zoneOuter * 0.03) {
            u = zoneOuter * 0.03;
            th = Math.abs(th) * 0.6;
          } else if (u > zoneOuter * 0.97) {
            u = zoneOuter * 0.97;
            th = -Math.abs(th) * 0.6;
          }
          y += Math.max(1.5, Math.cos(th) * ls);
          xs.push(edgeX(env.w, side, u));
          ys.push(y);
          pts.push({ u, y, theta: th });
        }
        pushHypha(xs, ys, depth, rank, depth >= 1 && !lt && rng() < 0.22);
        return pts;
      };

      const mains = 1;
      for (let m = 0; m < mains; m++) {
        const pts = addHypha(
          zoneOuter * (0.72 + rng() * 0.25),
          -30 + rng() * SEG_H * 0.62,
          (rng() - 0.5) * 0.5,
          420 + rng() * 520,
          0,
          rng() * 0.45,
        );
        if (!pts) continue;

        for (let i = 5; i < pts.length - 2; i += 8) {
          if (rng() > 0.18) continue;
          const p = pts[i];
          const sign = rng() < 0.5 ? -1 : 1;
          const kid = addHypha(
            p.u,
            p.y,
            p.theta + sign * (0.55 + rng() * 0.6),
            110 + rng() * 230,
            1,
            0.25 + rng() * 0.6,
          );
          if (kid && rng() < 0.16) {
            const q = kid[Math.floor(rng() * kid.length)];
            addHypha(
              q.u,
              q.y,
              q.theta + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6),
              50 + rng() * 120,
              2,
              0.4 + rng() * 0.6,
            );
          }
        }
      }

      // Anastomosis bridge
      const sideH = hyphae.slice(sideStart);
      const nodes: Array<{ h: number; x: number; y: number }> = [];
      sideH.forEach((hy, hi) => {
        for (let i = 2; i < hy.xs.length - 1; i += 6) {
          nodes.push({ h: hi, x: hy.xs[i], y: hy.ys[i] });
        }
      });
      let bridges = 0;
      for (let a = 0; a < 3 && bridges < 1; a++) {
        const n1 = nodes[Math.floor(rng() * nodes.length)];
        const n2 = nodes[Math.floor(rng() * nodes.length)];
        if (!n1 || !n2 || n1.h === n2.h) continue;
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        if (dist < 26 || dist > 110) continue;
        const mx = (n1.x + n2.x) / 2 + (rng() - 0.5) * 14;
        const my = (n1.y + n2.y) / 2 + (rng() - 0.5) * 14;
        pushHypha(
          [n1.x, mx, n2.x],
          [n1.y, my, n2.y],
          3,
          0.35 + rng() * 0.5,
          false,
        );
        bridges++;
      }

      // Quorum-sensing colony
      for (let c = 0; c < 1; c++) {
        const R = (24 + rng() * 28) * sc;
        const n = 3 + Math.floor(rng() * 2);
        const cl: Colony["cells"] = [];
        for (let k = 0; k < n; k++) {
          const r = R * Math.sqrt((k + 0.5) / n) * (0.85 + rng() * 0.3);
          const a = k * 2.399 + rng() * 0.4;
          cl.push({
            dx: Math.cos(a) * r,
            dy: Math.sin(a) * r,
            a: rng() * Math.PI,
            size: 2.6 + rng() * 2.4,
            rod: rng() < 0.55,
          });
        }
        colonies.push({
          x: edgeX(env.w, side, zoneOuter * (0.15 + rng() * 0.7)),
          y: rng() * SEG_H,
          R,
          rank: rng(),
          phase: rng(),
          rate: 0.07 + rng() * 0.08,
          tint: rng() < 0.5 ? 1 : 2,
          cells: cl,
        });
      }

      // Calcium wave ripple (not on phones)
      for (let r = 0; r < (tiny ? 0 : 1); r++) {
        ripples.push({
          x: edgeX(env.w, side, zoneOuter * (0.1 + rng() * 0.8)),
          y: rng() * SEG_H,
          maxR: (70 + rng() * 80) * sc,
          phase: rng(),
          speed: 0.05 + rng() * 0.04,
          rank: rng(),
          tint: rng() < 0.5 ? 1 : 3,
        });
      }

      // Drifting spore / vesicle
      for (let i = 0; i < 1; i++) {
        const tintRoll = rng();
        motes.push({
          x: edgeX(env.w, side, rng() * zoneOuter),
          y: rng() * SEG_H,
          phase: rng() * TAU,
          speed: 4 + rng() * 7,
          size: 3.5 + rng() * 3.5,
          rank: rng(),
          tint:
            tintRoll < 0.45 ? 0 : tintRoll < 0.75 ? 2 : tintRoll < 0.9 ? 1 : 3,
        });
      }

      // Signalling molecule (not on phones)
      for (let i = 0; i < (tiny ? 0 : 1); i++) {
        const kind = Math.floor(rng() * 3);
        const atoms: number[] = [];
        const bonds: number[] = [];
        if (kind === 0) {
          for (let k = 0; k < 6; k++) {
            atoms.push(
              Math.cos((k * TAU) / 6) * 0.5,
              Math.sin((k * TAU) / 6) * 0.5,
            );
            bonds.push(k, (k + 1) % 6);
          }
          atoms.push(0.95, 0);
          bonds.push(0, 6);
        } else if (kind === 1) {
          for (let k = 0; k < 5; k++) {
            atoms.push((k - 2) * 0.45, k % 2 ? 0.19 : -0.19);
            if (k > 0) bonds.push(k - 1, k);
          }
        } else {
          atoms.push(0, 0);
          for (let k = 0; k < 3; k++) {
            const a = -Math.PI / 2 + (k * TAU) / 3;
            atoms.push(Math.cos(a) * 0.55, Math.sin(a) * 0.55);
            bonds.push(0, k + 1);
          }
        }
        const tr = rng();
        molecules.push({
          x: edgeX(env.w, side, rng() * zoneOuter),
          y: rng() * SEG_H,
          size: (13 + rng() * 11) * sc,
          rot: rng() * TAU,
          rotSpeed: (rng() - 0.5) * 0.14,
          phase: rng() * TAU,
          rank: rng(),
          tint: tr < 0.4 ? 1 : tr < 0.75 ? 3 : 2,
          atoms,
          bonds,
        });
      }
    }

    return {
      index,
      hyphae,
      colonies,
      ripples,
      motes,
      molecules,
      lastUsed: ++useCounter,
    };
  };

  const getSegment = (index: number, env: BioEnv) => {
    if (index < 0 || index >= segmentCount) return null;
    let segment = cache.get(index);
    if (!segment) {
      segment = buildSegment(index, env);
      cache.set(index, segment);
    }
    segment.lastUsed = ++useCounter;
    return segment;
  };

  const visibleRange = (env: BioEnv) => {
    const first = Math.max(0, Math.floor(env.scrollY / SEG_H));
    const last = Math.min(
      segmentCount - 1,
      Math.floor((env.scrollY + env.viewportH) / SEG_H),
    );
    return [first, last] as const;
  };

  const pruneCache = (centerIndex: number) => {
    if (cache.size <= MAX_SEGMENTS) return;
    const entries = Array.from(cache.keys()).sort(
      (a, b) => Math.abs(b - centerIndex) - Math.abs(a - centerIndex),
    );
    while (cache.size > MAX_SEGMENTS && entries.length) {
      cache.delete(entries.shift()!);
    }
  };

  /* ---------------- drawing helpers ---------------- */

  const flush = (ctx: CanvasRenderingContext2D, env: BioEnv) => {
    if (!buf.length) return;
    ctx.globalCompositeOperation = env.pal.blend;
    for (let i = 0; i < buf.length; i += 5) {
      const size = buf[i + 2];
      ctx.globalAlpha = Math.min(1, buf[i + 3] * env.pal.k);
      ctx.drawImage(
        glow[buf[i + 4]],
        buf[i] - size / 2,
        buf[i + 1] - size / 2,
        size,
        size,
      );
    }
    buf.length = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const pointAt = (hy: Hypha, s: number) => {
    let i = 1;
    while (i < hy.cum.length - 1 && hy.cum[i] < s) i++;
    const f = (s - hy.cum[i - 1]) / Math.max(0.001, hy.cum[i] - hy.cum[i - 1]);
    bx = hy.xs[i - 1] + (hy.xs[i] - hy.xs[i - 1]) * f;
    by = hy.ys[i - 1] + (hy.ys[i] - hy.ys[i - 1]) * f;
  };

  const drawMolecule = (
    ctx: CanvasRenderingContext2D,
    m: Molecule,
    x: number,
    y: number,
    rot: number,
    col: RGB,
    alpha: number,
  ) => {
    const s = m.size;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = rgba(col, 0.6 * alpha);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < m.bonds.length; i += 2) {
      const a = m.bonds[i] * 2;
      const b = m.bonds[i + 1] * 2;
      ctx.moveTo(m.atoms[a] * s, m.atoms[a + 1] * s);
      ctx.lineTo(m.atoms[b] * s, m.atoms[b + 1] * s);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(col, 0.85 * alpha);
    for (let i = 0; i < m.atoms.length; i += 2) {
      ctx.beginPath();
      ctx.arc(m.atoms[i] * s, m.atoms[i + 1] * s, 1.9 * (s / 18), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---------------- STATIC pass → cached layers ---------------- */

  /** Smooth, tapered hyphae strokes (no travelling pulses: those are live). */
  const strokeHyphae = (
    g: CanvasRenderingContext2D,
    seg: Segment,
    env: BioEnv,
    side: Side,
    top: number,
  ) => {
    const { scale: sc, pal } = env;
    const dark = pal.dark;
    const wt = seg.index * SEG_H;
    const lo = top - wt - 60;
    const hi = top + near.lh - wt + 60;

    g.save();
    g.translate(0, wt - top);
    for (const hy of seg.hyphae) {
      if ((hy.xs[0] < env.w * 0.5 ? 0 : 1) !== side) continue;
      if (hy.maxY < lo || hy.minY > hi) continue;
      const d = depthAt(wt + (hy.minY + hy.maxY) * 0.5);
      const a = smooth(hy.rank, hy.rank + 0.14, dens(d)) * smooth(0.1, 0.3, d);
      if (a < 0.02) continue;

      const col = mixRGB(
        mixRGB(pal.pri, pal.sec, 0.4 * smooth(0.15, 0.5, d)),
        gold,
        0.5 * smooth(0.6, 1, d),
      );
      const lw = LINE_W[hy.depth] * sc;

      if (hy.depth === 0) {
        g.strokeStyle = rgba(col, (dark ? 0.05 : 0.04) * a);
        g.lineWidth = 14 * sc;
        g.stroke(hy.path);
      }

      g.strokeStyle = rgba(col, (dark ? 0.42 : 0.36) * a);
      if (hy.p60 && hy.p30) {
        g.lineWidth = lw * 0.7;
        g.stroke(hy.path);
        g.strokeStyle = rgba(col, 0.2 * a);
        g.lineWidth = lw * 1.05;
        g.stroke(hy.p60);
        g.lineWidth = lw * 1.45;
        g.stroke(hy.p30);
      } else {
        g.lineWidth = lw;
        g.stroke(hy.path);
      }

      if (hy.depth >= 1) {
        g.fillStyle = rgba(col, 0.5 * a);
        g.beginPath();
        g.arc(hy.xs[0], hy.ys[0], (hy.depth === 1 ? 2 : 1.5) * sc, 0, TAU);
        g.fill();
      }

      if (hy.arbPath) {
        const a2 = a * smooth(0.4, 0.65, d);
        if (a2 > 0.02) {
          g.strokeStyle = rgba(
            mixRGB(pal.sec, gold, smooth(0.5, 1, d) * 0.6),
            (dark ? 0.5 : 0.42) * a2,
          );
          g.lineWidth = 0.8 * sc;
          g.stroke(hy.arbPath);
        }
      }
    }
    g.restore();
  };

  /** Near layer: cell bodies + plasmodesmata + hyphae. Also records display lists. */
  const rebuildNear = (env: BioEnv) => {
    const g = near.g;
    if (!g) return;
    const { w, scrollY, scale: sc, pal } = env;
    const dark = pal.dark;
    const sw = near.sw;
    const top = scrollY - near.pad;
    const bottom = top + near.lh;
    near.ref = scrollY;

    g.setTransform(near.dpr, 0, 0, near.dpr, 0, 0);
    g.clearRect(0, 0, sw * 2, near.lh);
    g.lineCap = "round";
    g.lineJoin = "round";
    nearCells.length = 0;
    nearLinks.length = 0;

    const cp = (lite ? 184 : 164) * sc;
    const rp = cp * 0.84;
    const cols = Math.max(compact ? 1 : 2, Math.ceil(zoneOuter / cp));
    const j0 = Math.max(0, Math.floor((top - cp) / rp));
    const j1 = Math.min(
      Math.floor((bottom + cp) / rp),
      Math.ceil(worldHeight / rp),
    );
    const sA = Math.max(0, Math.floor(top / SEG_H));
    const sB = Math.min(segmentCount - 1, Math.floor(bottom / SEG_H));
    const sigK = compact ? 0.6 : 1;

    for (const s of [0, 1] as const) {
      g.save();
      g.beginPath();
      g.rect(s * sw, 0, sw, near.lh);
      g.clip();
      if (s === 1) g.translate(2 * sw - w, 0);

      for (let j = j0; j <= j1; j++) {
        const d = depthAt(j * rp);
        // tissue thins toward the deep end but never vanishes completely
        const rowA = smooth(0.02, 0.15, d) * (1 - 0.55 * smooth(0.5, 0.75, d));
        if (rowA < 0.02) continue;

        const b2 = smooth(0.7, 1, d);
        const boost = 1 + 0.25 * b2;
        const sigP = (0.12 + 0.16 * b2) * sigK;

        g.beginPath();
        dots.length = 0;
        let hasLink = false;

        for (let i = 0; i < cols; i++) {
          const key = cellKey(s, i, j, 0);
          if (hr(key, 0) > 0.48) continue;

          cellCenter(key, i, j, cp, rp);
          const ax = edgeX(w, s, cu);
          const wy = cyy;
          const ay = wy - top;
          const a = rowA * (0.55 + 0.45 * hr(key, 3));
          const r0 = cp * 0.5 * (0.8 + 0.28 * hr(key, 4));

          // cell body (one drawImage, once per rebuild)
          const sz = r0 * 2.37;
          g.globalAlpha = Math.min(1, a * boost);
          g.drawImage(
            cells[(hr(key, 5) * CELL_VARIANTS) | 0],
            ax - sz / 2,
            ay - sz / 2,
            sz,
            sz,
          );
          g.globalAlpha = 1;
          nearCells.push(ax, wy, r0, a, key, d);

          // plasmodesmata links to neighbours
          for (let m = 0; m < 3; m++) {
            const ni =
              m === 0
                ? i + 1
                : m === 1
                  ? j & 1
                    ? i
                    : i - 1
                  : j & 1
                    ? i + 1
                    : i;
            const nj = m === 0 ? j : j + 1;
            if (ni < 0 || ni >= cols) continue;
            if (hr(key, 6 + m) > 0.58) continue;

            const nkey = cellKey(s, ni, nj, 0);
            if (hr(nkey, 0) > 0.48) continue;

            cellCenter(nkey, ni, nj, cp, rp);
            const nx = edgeX(w, s, cu);
            const nyw = cyy;
            const x1 = ax + (nx - ax) * 0.2;
            const y1w = wy + (nyw - wy) * 0.2;
            const x2 = ax + (nx - ax) * 0.8;
            const y2w = wy + (nyw - wy) * 0.8;

            g.moveTo(x1, y1w - top);
            g.lineTo(x2, y2w - top);
            dots.push((x1 + x2) / 2, (y1w + y2w) / 2 - top);
            hasLink = true;

            if (hr(key, 10 + m) < sigP) {
              nearLinks.push(
                x1,
                y1w,
                x2,
                y2w,
                ax,
                wy,
                nx,
                nyw,
                r0,
                a,
                key,
                m,
                d,
              );
            }
          }
        }

        if (hasLink) {
          g.strokeStyle = rgba(pal.pri, (dark ? 0.24 : 0.22) * rowA * boost);
          g.lineWidth = 0.9 * sc;
          g.stroke();

          g.fillStyle = rgba(pal.pist, 0.5 * rowA);
          g.beginPath();
          const dr = 1.3 * sc;
          for (let q = 0; q < dots.length; q += 2) {
            g.moveTo(dots[q] + dr, dots[q + 1]);
            g.arc(dots[q], dots[q + 1], dr, 0, TAU);
          }
          g.fill();
        }
      }

      for (let idx = sA; idx <= sB; idx++) {
        const seg = getSegment(idx, env);
        if (seg) strokeHyphae(g, seg, env, s, top);
      }
      g.restore();
    }
    near.valid = true;
  };

  /** Far parallax layer: soft blurred cells only. Skipped entirely on phones. */
  const rebuildFar = (env: BioEnv) => {
    const g = far.g;
    if (!g) return;
    const { w, scrollY, scale: sc } = env;
    const sw = far.sw;
    const sy0 = scrollY * FAR_PARALLAX;
    const top = sy0 - far.pad;
    const bottom = top + far.lh;
    far.ref = sy0;

    g.setTransform(far.dpr, 0, 0, far.dpr, 0, 0);
    g.clearRect(0, 0, sw * 2, far.lh);
    farWave.length = 0;

    const cp = (lite ? 150 : 132) * sc;
    const rp = cp * 0.84;
    const cols = Math.max(2, Math.ceil(zoneOuter / cp));
    const j0 = Math.max(0, Math.floor((top - cp) / rp));
    const j1 = Math.min(
      Math.floor((bottom + cp) / rp),
      Math.ceil(worldHeight / rp),
    );

    for (const s of [0, 1] as const) {
      g.save();
      g.beginPath();
      g.rect(s * sw, 0, sw, far.lh);
      g.clip();
      if (s === 1) g.translate(2 * sw - w, 0);

      for (let j = j0; j <= j1; j++) {
        // depth is evaluated at the scroll position this layer is built for
        const d = depthAt(j * rp - sy0 + scrollY);
        const rowA = smooth(0.02, 0.18, d);
        if (rowA < 0.02) continue;

        for (let i = 0; i < cols; i++) {
          const key = cellKey(s, i, j, 40);
          if (hr(key, 0) > 0.2) continue;
          cellCenter(key, i, j, cp, rp);
          const x = edgeX(w, s, cu);
          const a = rowA * (0.5 + 0.5 * hr(key, 3));
          const sz = cp * (1.1 + 0.35 * hr(key, 5));
          g.globalAlpha = a * 0.62;
          g.drawImage(
            farCells[(hr(key, 4) * FAR_VARIANTS) | 0],
            x - sz / 2,
            cyy - top - sz / 2,
            sz,
            sz,
          );
          if (d > 0.58) farWave.push(x, cyy, sz, a, d);
        }
      }
      g.globalAlpha = 1;
      g.restore();
    }
    far.valid = true;
  };

  /* ---------------- LIVE pass (only what really animates) ---------------- */

  const drawFarDynamic = (env: BioEnv, intro: number) => {
    if (!farWave.length) return;
    const { ctx, scrollY, viewportH } = env;
    const sy = scrollY * FAR_PARALLAX;
    for (let q = 0; q < farWave.length; q += 5) {
      const y = farWave[q + 1] - sy;
      if (y < -150 || y > viewportH + 150) continue;
      const wv = waveAt(y, farWave[q + 4], viewportH);
      if (wv > 0.05)
        buf.push(
          farWave[q],
          y,
          farWave[q + 2] * 1.1,
          0.2 * wv * farWave[q + 3] * intro,
          3,
        );
    }
    flush(ctx, env);
  };

  const drawNearDynamic = (env: BioEnv, intro: number) => {
    const { ctx, scrollY, viewportH, scale: sc } = env;
    const nCh = compact ? 0 : lite ? 2 : 3;

    // cells: streaming chloroplasts + calcium-wave glow
    for (let q = 0; q < nearCells.length; q += 6) {
      const ay = nearCells[q + 1] - scrollY;
      if (ay < -220 || ay > viewportH + 220) continue;
      const d = nearCells[q + 5];
      const a = nearCells[q + 3] * intro * breath(d);
      if (a < 0.02) continue;
      const ax = nearCells[q];
      const r0 = nearCells[q + 2];

      if (nCh > 0 && a > 0.18 && chloro) {
        const key = nearCells[q + 4];
        ctx.globalAlpha = Math.min(1, a * 0.85);
        const dir = hr(key, 34) > 0.5 ? 1 : -1;
        const spd = (0.05 + 0.06 * hr(key, 33)) * dir;
        for (let k = 0; k < nCh; k++) {
          const ang = hr(key, 30 + k) * TAU + pulseClock * spd;
          const cx = ax + Math.cos(ang) * r0 * 0.7;
          const cy2 = ay + Math.sin(ang) * r0 * 0.62;
          const cs = (7.5 + 2.5 * hr(key, 36 + k)) * sc;
          ctx.drawImage(chloro, cx - cs / 2, cy2 - cs * 0.35, cs, cs * 0.7);
        }
        ctx.globalAlpha = 1;
      }

      const wv = waveAt(ay, d, viewportH);
      if (wv > 0.05) buf.push(ax, ay, r0 * 2, 0.4 * wv * Math.max(a, 0.5), 3);
    }

    // signals travelling along plasmodesmata
    for (let q = 0; q < nearLinks.length; q += 13) {
      const y1 = nearLinks[q + 1] - scrollY;
      const y2 = nearLinks[q + 3] - scrollY;
      if (Math.max(y1, y2) < -40 || Math.min(y1, y2) > viewportH + 40) continue;
      const x1 = nearLinks[q];
      const x2 = nearLinks[q + 2];
      const ax = nearLinks[q + 4];
      const ay = nearLinks[q + 5] - scrollY;
      const nx = nearLinks[q + 6];
      const ny = nearLinks[q + 7] - scrollY;
      const r0 = nearLinks[q + 8];
      const key = nearLinks[q + 10];
      const m = nearLinks[q + 11];
      const a = nearLinks[q + 9] * intro * breath(nearLinks[q + 12]);
      if (a < 0.02) continue;

      const sp = pulseClock * 0.16 * (0.7 + hr(key, 12 + m)) + hr(key, 14 + m);
      const u = sp % 1.3;
      const rev = hr(key, 16 + m) > 0.5;
      const tint = hr(key, 18) < 0.6 ? 3 : 2;
      let arrive: number;
      if (u < 1) {
        arrive = smooth(0.78, 1, u);
        const t = rev ? 1 - u : u;
        const trail = compact ? 2 : 3;
        for (let k = 0; k < trail; k++) {
          const tq = clamp(rev ? t + k * 0.05 : t - k * 0.05, 0, 1);
          buf.push(
            x1 + (x2 - x1) * tq,
            y1 + (y2 - y1) * tq,
            (8 - k * 1.2) * sc,
            Math.sin(u * Math.PI) *
              0.75 *
              a *
              (k === 0 ? 1 : k === 1 ? 0.5 : 0.25),
            tint,
          );
        }
      } else {
        arrive = 1 - (u - 1) / 0.3;
      }
      if (arrive > 0.03) {
        buf.push(
          rev ? ax : nx,
          rev ? ay : ny,
          r0 * 1.5,
          0.28 * arrive * a,
          tint,
        );
      }
    }
    flush(ctx, env);
  };

  const drawSegmentDynamic = (seg: Segment, env: BioEnv, intro: number) => {
    const { ctx, scrollY, viewportH, scale: sc, pal } = env;
    const wt = seg.index * SEG_H;
    const oy = wt - scrollY;
    const vTop = -oy - 60;
    const vBot = -oy + viewportH + 60;

    ctx.save();
    ctx.translate(0, oy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // --- travelling nutrient / signal pulses along the hyphae
    for (const hy of seg.hyphae) {
      if (hy.len <= 20 || hy.maxY < vTop || hy.minY > vBot) continue;
      const d = depthAt(wt + (hy.minY + hy.maxY) * 0.5);
      const a =
        smooth(hy.rank, hy.rank + 0.14, dens(d)) *
        smooth(0.1, 0.3, d) *
        intro *
        breath(d);
      if (a <= 0.25) continue;

      const span = hy.len + 90;
      const np = !lite && d > 0.65 ? 2 : 1;
      for (let pi = 0; pi < np; pi++) {
        const s = (pulseClock * hy.speed + (hy.phase + pi * 0.5) * span) % span;
        if (s >= hy.len) continue;
        const sz = (8 + 6 * d) * sc;
        const al = 0.75 * a * Math.sin((s / hy.len) * Math.PI);
        pointAt(hy, s);
        buf.push(bx, by, sz, al, hy.tint);
        if (s > 9) {
          pointAt(hy, s - 9);
          buf.push(bx, by, sz * 0.8, al * 0.4, hy.tint);
        }
        if (!compact && s > 18) {
          pointAt(hy, s - 18);
          buf.push(bx, by, sz * 0.6, al * 0.2, hy.tint);
        }
      }
    }

    ctx.globalCompositeOperation = pal.blend;

    // --- quorum-sensing colonies
    for (const col of seg.colonies) {
      if (col.y + col.R * 3 < vTop || col.y - col.R * 3 > vBot) continue;
      const d = depthAt(wt + col.y);
      const vis =
        smooth(col.rank, col.rank + 0.12, dens(d)) *
        smooth(0.42, 0.58, d) *
        intro;
      if (vis < 0.02) continue;

      const f = (pulseClock * col.rate + col.phase) % 1;
      const fl = f < 0.28 ? Math.sin((f / 0.28) * Math.PI) : 0;

      for (const c of col.cells) {
        ctx.globalAlpha = Math.min(1, pal.k * vis * (0.5 + 0.5 * fl));

        if (c.rod) {
          const dw = (10 + c.size * 1.6) * sc;
          ctx.save();
          ctx.translate(col.x + c.dx, col.y + c.dy);
          ctx.rotate(c.a);
          ctx.drawImage(rods[col.tint], -dw / 2, -dw / 4, dw, dw / 2);
          ctx.restore();
        } else {
          const size = (7 + c.size * 1.3) * sc;
          ctx.drawImage(
            glow[col.tint],
            col.x + c.dx - size / 2,
            col.y + c.dy - size / 2,
            size,
            size,
          );
        }
      }

      if (fl > 0.02) {
        const hs = col.R * 3.2;
        ctx.globalAlpha = 0.16 * pal.k * vis * fl;
        ctx.drawImage(glow[3], col.x - hs / 2, col.y - hs / 2, hs, hs);
      }

      if (f < 0.6) {
        const k2 = f / 0.6;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = rgba(gold, Math.pow(1 - k2, 2) * 0.4 * vis * pal.k);
        ctx.lineWidth = 1.2 * sc;
        ctx.beginPath();
        ctx.arc(col.x, col.y, col.R * (0.5 + 2.6 * k2), 0, TAU);
        ctx.stroke();
      }
    }

    // --- calcium waves
    ctx.globalAlpha = 1;
    for (const rp of seg.ripples) {
      if (rp.y + rp.maxR < vTop || rp.y - rp.maxR > vBot) continue;
      const d = depthAt(wt + rp.y);
      const vis =
        smooth(rp.rank, rp.rank + 0.12, dens(d)) *
        smooth(0.58, 0.76, d) *
        intro;
      if (vis < 0.02) continue;

      const rc = rp.tint === 3 ? gold : pal.sec;

      for (let k = 0; k < 2; k++) {
        const f = (pulseClock * rp.speed + rp.phase + k / 2) % 1;
        ctx.strokeStyle = rgba(rc, (1 - f) * (1 - f) * 0.3 * vis * pal.k);
        ctx.lineWidth = (1.6 * (1 - f) + 0.6) * sc;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.maxR * f, 0, TAU);
        ctx.stroke();
      }

      const s0 = 10 * sc;
      ctx.globalAlpha = 0.5 * vis * pal.k;
      ctx.drawImage(glow[rp.tint], rp.x - s0 / 2, rp.y - s0 / 2, s0, s0);
      ctx.globalAlpha = 1;
    }

    // --- spores
    const span = SEG_H + 12;
    for (const m of seg.motes) {
      const y = ((((m.y - clock * m.speed) % span) + span) % span) - 6;
      if (y < vTop || y > vBot) continue;
      const d = depthAt(wt + y);
      const vis = smooth(m.rank, m.rank + 0.2, 0.3 + 0.7 * d) * intro;
      if (vis < 0.02) continue;

      const size = m.size * sc * (1 + 0.3 * d);
      ctx.globalAlpha = 0.34 * pal.k * vis;
      ctx.drawImage(
        glow[m.tint],
        m.x + Math.sin(clock * 0.7 + m.phase) * 6 - size / 2,
        y - size / 2,
        size,
        size,
      );
    }

    // --- molecules
    ctx.globalAlpha = 1;
    for (const mo of seg.molecules) {
      const y = mo.y + Math.sin(clock * 0.5 + mo.phase) * 5;
      if (y < vTop || y > vBot) continue;
      const d = depthAt(wt + mo.y);
      const vis =
        smooth(mo.rank, mo.rank + 0.12, dens(d)) *
        win(d, 0.2, 0.4, 2, 3) *
        intro;
      if (vis < 0.02) continue;

      const col = mo.tint === 3 ? gold : mo.tint === 1 ? pal.sec : pal.pist;
      drawMolecule(
        ctx,
        mo,
        mo.x + Math.cos(clock * 0.4 + mo.phase) * 4,
        y,
        mo.rot + clock * mo.rotSpeed,
        col,
        0.5 * vis * pal.k,
      );
    }

    flush(ctx, env);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  /* ---------------- scene interface ---------------- */

  const resize = (env: BioEnv) => {
    const geometryChanged =
      Math.abs(width - env.w) > 0.5 ||
      Math.abs(scale - env.scale) > 0.001 ||
      lite !== env.lite ||
      compact !== env.compact;

    width = env.w;
    scale = env.scale;
    lite = env.lite;
    compact = env.compact;
    worldHeight = Math.max(env.viewportH, env.h);
    segmentCount = Math.max(1, Math.ceil(worldHeight / SEG_H));
    zoneOuter = env.w * (env.compact ? 0.2 : env.lite ? 0.16 : 0.2);

    // Height-only changes keep every cached segment: only the depth mapping
    // moves, so the dive is re-stretched without regenerating the world.
    if (geometryChanged) cache.clear();
    for (const index of Array.from(cache.keys())) {
      if (index >= segmentCount) cache.delete(index);
    }

    // Cached layers: sized to the gutters; always invalidated here because
    // the page height / geometry (and therefore depth mapping) changed.
    const sw = Math.ceil(zoneOuter);
    const pad = Math.max(160, Math.round(env.viewportH * 0.5));
    allocLayer(near, sw, env.viewportH, pad, Math.min(env.dpr, 1.25));
    if (env.compact) freeLayer(far);
    else allocLayer(far, sw, env.viewportH, pad, 1);

    // Inner-edge feather gradients are created once (not per frame).
    const zi = zoneOuter * 0.5;
    featL = env.ctx.createLinearGradient(zi, 0, zoneOuter, 0);
    featL.addColorStop(0, "rgba(0,0,0,0)");
    featL.addColorStop(1, "rgba(0,0,0,1)");
    featR = env.ctx.createLinearGradient(env.w - zi, 0, env.w - zoneOuter, 0);
    featR.addColorStop(0, "rgba(0,0,0,0)");
    featR.addColorStop(1, "rgba(0,0,0,1)");
  };

  const theme = (env: BioEnv) => {
    const { pal } = env;
    gold = pal.dark
      ? mixRGB(pal.pist, [255, 186, 66], 0.75)
      : mixRGB(pal.pist, [190, 120, 10], 0.7);
    const colors = [pal.pri, pal.sec, pal.pist, gold];
    glow = colors.map((c) => makeGlowSprite(c, pal));
    rods = colors.map((c) => makeRodSprite(c, pal));

    // Cell sprites are rendered once per theme change, never per frame.
    cells = Array.from({ length: CELL_VARIANTS }, (_, k) =>
      makeCellSprite(pal, 1013 + k * 7919, CELL_PX, 0.44, 0, true),
    );
    farCells = Array.from({ length: FAR_VARIANTS }, (_, k) =>
      makeCellSprite(pal, 5521 + k * 104729, FAR_PX, 0.38, 1.3, false),
    );
    chloro = makeChloroSprite(pal);

    // The cached layers embed the old palette
    near.valid = false;
    far.valid = false;
  };

  const step = (dt: number, env: BioEnv) => {
    clock += dt / 60;
    pulseClock += dt / 60;

    const [first, last] = visibleRange(env);
    for (let index = first; index <= last; index++) getSegment(index, env);
    pruneCache(Math.floor((env.scrollY + env.viewportH * 0.5) / SEG_H));
  };

  const settle = (_env: BioEnv) => {
    clock = 3;
    pulseClock = 3;
  };

  const draw = (env: BioEnv) => {
    if (
      glow.length < 4 ||
      rods.length < 4 ||
      cells.length < CELL_VARIANTS ||
      farCells.length < FAR_VARIANTS ||
      !chloro ||
      !near.g
    )
      return;

    const { ctx, w, scrollY, viewportH } = env;
    const intro = smooth(0, 1.35, clock);
    const [first, last] = visibleRange(env);

    // Gutters only, clipped to the real page end.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, zoneOuter, viewportH);
    ctx.rect(w - zoneOuter, 0, zoneOuter, viewportH);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(0, 0, w, Math.max(0, worldHeight - scrollY));
    ctx.clip();
    ctx.globalCompositeOperation = "source-over";

    // Re-render a cached layer only when the scroll left its padded window.
    if (layerStale(near, scrollY)) rebuildNear(env);
    const farY = scrollY * FAR_PARALLAX;
    if (!compact && far.g && layerStale(far, farY)) rebuildFar(env);

    // One shared "breathing" + intro fade applied at blit time.
    const gA = intro * breath(depthAt(scrollY + viewportH * 0.5));
    if (!compact) blitLayer(ctx, far, farY, viewportH, w, gA);
    blitLayer(ctx, near, scrollY, viewportH, w, gA);

    // Live, animated items only.
    if (!compact) drawFarDynamic(env, intro);
    drawNearDynamic(env, intro);
    for (let index = first; index <= last; index++) {
      const segment = getSegment(index, env);
      if (segment) drawSegmentDynamic(segment, env, intro);
    }

    // Feather the inner edge so nothing ends abruptly next to content.
    const fl = featL;
    const fr = featR;
    if (fl && fr) {
      const zi = zoneOuter * 0.5;
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.fillStyle = fl;
      ctx.fillRect(zi, 0, zoneOuter - zi, viewportH);
      ctx.fillStyle = fr;
      ctx.fillRect(w - zoneOuter, 0, zoneOuter - zi, viewportH);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  };

  return { resize, theme, step, draw, settle };
};

export const CellSignalBackground = ({
  scrollContainerRef,
}: {
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) => {
  const ref = useBioCanvas(createScene, scrollContainerRef, {
    minWidth: 0, // phones included (compact variant)
    scrollSync: true, // cheap cached draw → follow every scroll event
  });

  return (
    <canvas
      ref={ref}
      className="fixed z-[1] block pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default CellSignalBackground;
