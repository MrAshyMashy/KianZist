"use client";

/* =========================================================
   KianZist — Living Nitrogen Cycle (scroll-driven descent)
   ---------------------------------------------------------
   Page top   : a young plant above the soil line (golden air motes,
                soft sun glow, rising N₂ / N₂O).
   Scrolling  : the plant's roots continue — without any seam — down the
                whole page; you dive deeper into the rhizosphere.
   Life       : nitrate pulses climb every root toward the crown, travel
                up the stem and light the leaves. Small "stories" loop
                along the roots:  NH₄⁺ → bacterium → NO₃⁻ → root uptake.
                Rods wobble, NO₃⁻ leaches down, gas rises.
   Random     : a fresh world seed per mount (plant side, leaves,
                roots, bacteria…). Refresh = a different plant.

   Performance (shared UseBioCanvas engine does 30/24fps, pause, DPR cap):
   - Static root architecture is baked ONCE per segment into a small
     strip canvas (left + right gutter side by side) → 2 blits / frame.
   - Per frame only sprites are drawn (pulses, bacteria, pills, motes).
   - Parallax "mycelium haze" tiles are baked once and blitted.
   - Only visible segments (+ overscan) exist; LRU-pruned cache.
   - Geometry is independent of page height: content can grow forever.
   - Everything lives in the left / right gutters (soft fade) so cards
     and text stay clean. Cross-roots in the middle are ghost-faint.
========================================================= */

import type { RefObject } from "react";
import {
  BioEnv,
  BioPalette,
  BioScene,
  TAU,
  clamp,
  makeGlowSprite,
  makePill,
  makeRodSprite,
  mixRGB,
  mulberry32,
  rgba,
  smooth,
  useBioCanvas,
} from "../shared/Usebiocanvas";

/* ---------------- tuning ---------------- */

const SEG_H = 960; // world segment height
const PAD = 150; // overscan so laterals never get cut at segment seams
const MAX_CACHE = 7;
const FAR_H = 900; // parallax haze tile height
const FAR_PARALLAX = 0.62;
const PULSE_GAP = 460; // px between nitrate pulses on a main root
const PULSE_SPEED = 34; // px/s (upward along roots)
const STEM_SPEED = 80; // px/s (upward along the stem)
const NS = 14; // stem samples
const TAIL = [1, 0.55, 0.3, 0.16];

type Side = 0 | 1;
type Tint = 0 | 1 | 2; // 0 emerald, 1 azure, 2 pistachio
type Pill = ReturnType<typeof makePill>;

interface Branch {
  side: Side;
  u: number[]; // distance from its screen edge (mirrored for side 1)
  y: number[]; // segment-local y
  depth: 0 | 1 | 2;
  root: number; // main root index (depth 0) or -1
  sp: number; // lateral pulse speed
  ph: number; // main: phase in px · lateral: phase 0..1 or -1 (none)
}

interface Bac {
  side: Side;
  u: number;
  y: number;
  ang: number;
  tint: Tint;
  size: number;
  ph: number;
  rod: boolean;
}

interface Story {
  side: Side;
  ua: number;
  ya: number; // NH₄⁺ source
  ub: number;
  yb: number; // bacterium
  ur: number;
  yr: number; // root uptake point
  ang: number;
  tint: Tint;
  period: number;
  offset: number;
  seed: number;
}

interface Mote {
  side: Side;
  u: number;
  f0: number;
  vy: number; // px/s, + leaching (down) / − gas (up)
  ring: boolean;
  size: number;
  ph: number;
}

interface Segment {
  index: number;
  branches: Branch[];
  bacteria: Bac[];
  stories: Story[];
  motes: Mote[];
  baked: HTMLCanvasElement | null;
  used: number;
}

interface Leaf {
  t: number;
  dir: 1 | -1;
  ang: number;
  len: number;
  ph: number;
}

interface Plant {
  side: Side;
  crownU: number;
  h: number;
  lean: number;
  bend: number;
  leaves: Leaf[];
}

interface Cross {
  x: number[];
  y: number[];
  ph: number;
}

interface Air {
  side: Side;
  u: number;
  f0: number;
  speed: number;
  size: number;
  sway: number;
  ph: number;
  warm: boolean;
  a: number;
  label: 0 | 1 | 2; // 0 bokeh, 1 N₂, 2 N₂O
}

/* ---------------- helpers ---------------- */

const freshSeed = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const v = new Uint32Array(1);
      crypto.getRandomValues(v);
      return v[0] || 1;
    }
  } catch {
    // restricted contexts → fall through
  }
  return (Math.random() * 0xffffffff) >>> 0;
};

const hash32 = (value: number) => {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
};

const edgeX = (w: number, side: Side, u: number) => (side === 0 ? u : w - u);
const frac = (v: number) => v - Math.floor(v);
const mod = (v: number, m: number) => ((v % m) + m) % m;
const easeIO = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
const hill = (a: number, b: number, c: number, d: number, x: number) =>
  smooth(a, b, x) * (1 - smooth(c, d, x));

const spr = (
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  x: number,
  y: number,
  s: number,
  a: number,
) => {
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
};

const drawPill = (
  ctx: CanvasRenderingContext2D,
  p: Pill,
  x: number,
  y: number,
  s: number,
  a: number,
) => {
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(p.cv, x - (p.w * s) / 2, y - (p.h * s) / 2, p.w * s, p.h * s);
};

/** Leaf sprite, pre-rendered once per theme. Base at (8,48), tip at (184,48). */
const makeLeafSprite = (pal: BioPalette) => {
  const cv = document.createElement("canvas");
  cv.width = 192;
  cv.height = 96;
  const g = cv.getContext("2d")!;
  const L0 = 8;
  const L1 = 184;
  const cy = 48;
  const hw = 34;
  const body = () => {
    g.beginPath();
    g.moveTo(L0, cy);
    g.bezierCurveTo(L0 + 44, cy - hw * 1.05, L1 - 52, cy - hw * 0.95, L1, cy);
    g.bezierCurveTo(L1 - 52, cy + hw * 0.95, L0 + 44, cy + hw * 1.05, L0, cy);
    g.closePath();
  };
  const white: [number, number, number] = [255, 255, 255];

  const lg = g.createLinearGradient(L0, 0, L1, 0);
  lg.addColorStop(0, rgba(pal.pri, pal.dark ? 0.48 : 0.36));
  lg.addColorStop(
    0.6,
    rgba(mixRGB(pal.pri, pal.pist, 0.5), pal.dark ? 0.34 : 0.27),
  );
  lg.addColorStop(1, rgba(pal.pist, pal.dark ? 0.22 : 0.2));
  body();
  g.fillStyle = lg;
  g.fill();

  // soft upper highlight → subtle volume
  g.save();
  body();
  g.clip();
  const hg = g.createLinearGradient(0, cy - hw, 0, cy + hw * 0.4);
  hg.addColorStop(
    0,
    rgba(mixRGB(pal.pist, white, 0.55), pal.dark ? 0.26 : 0.2),
  );
  hg.addColorStop(1, rgba(white, 0));
  g.fillStyle = hg;
  g.fillRect(0, 0, 192, 96);
  g.restore();

  g.lineWidth = 1.3;
  g.strokeStyle = rgba(mixRGB(pal.pri, white, pal.dark ? 0.35 : 0.05), 0.7);
  body();
  g.stroke();

  g.lineCap = "round";
  g.strokeStyle = rgba(mixRGB(pal.pist, white, pal.dark ? 0.3 : 0), 0.5);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(L0, cy);
  g.lineTo(L1 - 10, cy);
  g.stroke();

  g.lineWidth = 0.8;
  g.strokeStyle = rgba(pal.pist, 0.26);
  g.beginPath();
  for (let i = 1; i <= 5; i++) {
    const x = L0 + i * 27;
    const vh = hw * 0.8 * Math.sin((Math.PI * (x - L0)) / (L1 - L0));
    g.moveTo(x, cy);
    g.lineTo(x + 22, cy - vh);
    g.moveTo(x, cy);
    g.lineTo(x + 22, cy + vh);
  }
  g.stroke();
  return cv;
};

/* =========================================================
   Scene
========================================================= */

const createScene = (): BioScene => {
  const worldSeed = freshSeed();
  const cache = new Map<number, Segment>();
  const farCache = new Map<number, HTMLCanvasElement>();

  let width = 0;
  let scale = 1;
  let lite = false;
  let worldHeight = 1;
  let segmentCount = 1;
  let zone = 0;
  let zoneOuter = 0;
  let soilY = 0;
  let rootCount = 2;
  let clock = 0;
  let tick = 0;

  let plant: Plant = {
    side: 0,
    crownU: 0,
    h: 0,
    lean: 0,
    bend: 0,
    leaves: [],
  };
  let cross: Cross[] = [];
  let crossCv: HTMLCanvasElement | null = null;
  let crossTop = 0;
  let crossH = 0;
  let air: Air[] = [];

  let glow: HTMLCanvasElement[] = [];
  let rods: HTMLCanvasElement[] = [];
  let warmGlow: HTMLCanvasElement | null = null;
  let leafSprite: HTMLCanvasElement | null = null;
  let pNH4: Pill | null = null;
  let pNO3: Pill | null = null;
  let pN2: Pill | null = null;
  let pN2O: Pill | null = null;

  const stX = new Float32Array(NS + 1);
  const stY = new Float32Array(NS + 1);
  const pt = { x: 0, y: 0 };

  /* ---------------- root skeleton (continuous across segments) ---------------- */

  const boundaryU = (b: number, side: Side, r: number) => {
    const key =
      worldSeed ^
      Math.imul(b + 17, 0x9e3779b1) ^
      Math.imul(side + 3, 0x85ebca6b) ^
      Math.imul(r + 11, 0xc2b2ae35);
    return zone * (0.3 + (hash32(key) / 0xffffffff) * 0.4);
  };

  // Hermite through shared boundary values + tangents from neighbours:
  // position AND direction match exactly where two segments meet.
  const hermite = (index: number, side: Side, r: number, t: number) => {
    const u0 = boundaryU(index, side, r);
    const u1 = boundaryU(index + 1, side, r);
    const m0 = (u1 - boundaryU(index - 1, side, r)) * 0.5;
    const m1 = (boundaryU(index + 2, side, r) - u0) * 0.5;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * u0 +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * u1 +
      (t3 - t2) * m1
    );
  };

  const rootPhase = (side: Side, r: number) =>
    (hash32(worldSeed ^ Math.imul(side * 2 + r + 5, 0x85ebca6b)) / 4294967296) *
    PULSE_GAP;

  // Segment 0: roots of the plant's side start at the crown; roots of the
  // other side start deeper and are fed by ghost cross-roots from the crown.
  const startY = (side: Side, r: number) =>
    side === plant.side ? soilY : soilY + (150 + r * 120) * scale;

  const mainStartU = (side: Side, r: number) =>
    clamp(
      hermite(0, side, r, startY(side, r) / SEG_H),
      zone * 0.035,
      zone * 0.98,
    );

  const buildMain = (
    index: number,
    side: Side,
    r: number,
    stepPx: number,
  ): Branch => {
    const y0 = index === 0 ? startY(side, r) : 0;
    const t0 = y0 / SEG_H;
    const count = Math.max(8, Math.ceil((SEG_H - y0) / stepPx));
    const u: number[] = [];
    const y: number[] = [];
    const fromCrown = index === 0 && side === plant.side;
    const cu = plant.crownU + (r - (rootCount - 1) / 2) * 7 * scale;
    for (let i = 0; i <= count; i++) {
      const t = t0 + (1 - t0) * (i / count);
      let uu = clamp(hermite(index, side, r, t), zone * 0.035, zone * 0.98);
      if (fromCrown) uu = cu + (uu - cu) * smooth(0, 0.42, i / count);
      u.push(uu);
      y.push(t * SEG_H);
    }
    return { side, u, y, depth: 0, root: r, sp: 0, ph: rootPhase(side, r) };
  };

  /* ---------------- segment generation ---------------- */

  const build = (index: number): Segment => {
    const rng = mulberry32(
      hash32(worldSeed ^ Math.imul(index + 1, 0x9e3779b1)),
    );
    const st = Math.max(9, 12 * scale);
    const branches: Branch[] = [];
    const maxLat = lite ? 14 : 30;
    let latCount = 0;
    let pulsed = 0;

    const grow = (
      side: Side,
      su: number,
      sy: number,
      dir: 1 | -1,
      length: number,
      depth: 1 | 2,
    ): Branch | null => {
      if (latCount >= maxLat || length < 26) return null;
      const bound = zoneOuter * 0.96;
      const u = [su];
      const y = [sy];
      let cu = su;
      let cy = sy;
      let theta = 0.5 + rng() * 0.75; // from "straight down" toward dir
      const n = Math.ceil(length / st);
      for (let i = 1; i <= n; i++) {
        // gravitropism: roots slowly turn downward
        theta =
          theta * (depth === 1 ? 0.95 : 0.97) +
          (rng() - 0.5) * (depth === 1 ? 0.34 : 0.55);
        theta = clamp(theta, -0.4, 1.35);
        cu += dir * Math.sin(theta) * st;
        cy += Math.cos(theta) * st;
        if (
          cu < zoneOuter * 0.02 ||
          cu > bound ||
          cy > SEG_H + PAD - 14 ||
          cy < -PAD + 14
        )
          break;
        u.push(cu);
        y.push(cy);
      }
      if (u.length < 3) return null;
      latCount++;
      const b: Branch = {
        side,
        u,
        y,
        depth,
        root: -1,
        sp: 0.06 + rng() * 0.05,
        ph: -1,
      };
      if (depth === 1 && pulsed < (lite ? 3 : 8)) {
        b.ph = rng();
        pulsed++;
      }
      branches.push(b);
      return b;
    };

    const mains: Branch[] = [];
    for (const side of [0, 1] as const) {
      for (let r = 0; r < rootCount; r++) {
        const m = buildMain(index, side, r, st * 1.1);
        branches.push(m);
        mains.push(m);
      }
    }

    const per = Math.floor(maxLat / mains.length);
    for (const m of mains) {
      const begin = latCount;
      let i = 2 + Math.floor(rng() * 3);
      while (i < m.u.length - 2 && latCount - begin < per) {
        const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
        const lat = grow(
          m.side,
          m.u[i],
          m.y[i],
          dir,
          (80 + rng() * 170) * scale * (lite ? 0.7 : 1),
          1,
        );
        if (lat && !lite) {
          const kids = rng() < 0.55 ? 1 : rng() < 0.5 ? 2 : 0;
          for (let c = 0; c < kids; c++) {
            const ci = 2 + Math.floor(rng() * Math.max(1, lat.u.length - 4));
            grow(
              m.side,
              lat.u[ci],
              lat.y[ci],
              rng() < 0.5 ? 1 : -1,
              (34 + rng() * 80) * scale,
              2,
            );
          }
        }
        i += 3 + Math.floor(rng() * 5);
      }
    }

    const fine = branches.filter((b) => b.depth > 0 && b.u.length > 4);
    const anchorPool = fine.length ? fine : branches;

    // ambient bacteria hugging the roots
    const bacteria: Bac[] = [];
    const bacN = lite ? 3 : 7;
    for (let i = 0; i < bacN; i++) {
      const br = anchorPool[Math.floor(rng() * anchorPool.length)];
      const p = 1 + Math.floor(rng() * (br.u.length - 2));
      const off = (5 + rng() * 12) * scale * (rng() < 0.5 ? -1 : 1);
      bacteria.push({
        side: br.side,
        u: clamp(br.u[p] + off, zoneOuter * 0.03, zoneOuter * 0.94),
        y: br.y[p] + (rng() - 0.5) * 12 * scale,
        ang: rng() * Math.PI,
        tint: Math.floor(rng() * 3) as Tint,
        size: 0.75 + rng() * 0.65,
        ph: rng() * TAU,
        rod: rng() < 0.65,
      });
    }

    // nitrogen stories: NH₄⁺ → bacterium → NO₃⁻ → root
    const stories: Story[] = [];
    const storyN = lite ? 1 : 2;
    for (let i = 0; i < storyN; i++) {
      const br = anchorPool[Math.floor(rng() * anchorPool.length)];
      const p = 1 + Math.floor(rng() * (br.u.length - 2));
      const ur = br.u[p];
      const yr = br.y[p];
      const tx = br.u[p + 1] - br.u[p - 1];
      const ty = br.y[p + 1] - br.y[p - 1];
      const tl = Math.hypot(tx, ty) || 1;
      const sg = rng() < 0.5 ? -1 : 1;
      const dist = (13 + rng() * 10) * scale;
      const ub = clamp(
        ur + (-ty / tl) * dist * sg,
        zoneOuter * 0.05,
        zoneOuter * 0.9,
      );
      const yb = yr + (tx / tl) * dist * sg;
      stories.push({
        side: br.side,
        ua: clamp(
          ub + (rng() - 0.3) * 80 * scale,
          zoneOuter * 0.05,
          zoneOuter * 0.9,
        ),
        ya: yb - (30 + rng() * 50) * scale,
        ub,
        yb,
        ur,
        yr,
        ang: rng() * Math.PI,
        tint: (rng() < 0.5 ? 0 : 2) as Tint,
        period: 13 + rng() * 6,
        offset: rng() * 20,
        seed: Math.floor(rng() * 0x7fffffff),
      });
    }

    // leaching NO₃⁻ drops (↓) and denitrification gas rings (↑)
    const motes: Mote[] = [];
    const moteN = lite ? 4 : 8;
    for (let i = 0; i < moteN; i++) {
      const ring = i % 2 === 0;
      motes.push({
        side: rng() < 0.5 ? 0 : 1,
        u: rng() * zoneOuter * 0.88,
        f0: rng(),
        vy: ring ? -(12 + rng() * 14) : 14 + rng() * 10,
        ring,
        size: 5 + rng() * 6,
        ph: rng() * TAU,
      });
    }

    return {
      index,
      branches,
      bacteria,
      stories,
      motes,
      baked: null,
      used: ++tick,
    };
  };

  const get = (index: number) => {
    if (index < 0 || index >= segmentCount) return null;
    let seg = cache.get(index);
    if (!seg) {
      seg = build(index);
      cache.set(index, seg);
    }
    seg.used = ++tick;
    return seg;
  };

  const visibleRange = (env: BioEnv) =>
    [
      Math.max(0, Math.floor((env.scrollY - PAD) / SEG_H)),
      Math.min(
        segmentCount - 1,
        Math.floor((env.scrollY + env.viewportH + PAD) / SEG_H),
      ),
    ] as const;

  const prune = (center: number) => {
    if (cache.size <= MAX_CACHE) return;
    const keys = [...cache.keys()].sort(
      (a, b) => Math.abs(b - center) - Math.abs(a - center),
    );
    while (cache.size > MAX_CACHE && keys.length) cache.delete(keys.shift()!);
  };

  /* ---------------- baking (static art → small strip canvases) ---------------- */

  const traceBranch = (g: CanvasRenderingContext2D, b: Branch, sw: number) => {
    const n = b.u.length;
    const X = (i: number) => (b.side === 0 ? b.u[i] : 2 * sw - b.u[i]);
    g.beginPath();
    g.moveTo(X(0), b.y[0]);
    for (let i = 1; i < n; i++) {
      g.quadraticCurveTo(
        X(i - 1),
        b.y[i - 1],
        (X(i - 1) + X(i)) * 0.5,
        (b.y[i - 1] + b.y[i]) * 0.5,
      );
    }
    g.lineTo(X(n - 1), b.y[n - 1]);
  };

  /** Alpha mask for a 2-strip canvas: solid near the page edge, soft fade inward. */
  const stripMask = (g: CanvasRenderingContext2D, cw: number, ch: number) => {
    const m = g.createLinearGradient(0, 0, cw, 0);
    const a = "rgba(0,0,0,1)";
    m.addColorStop(0, a);
    m.addColorStop(0.275, a);
    m.addColorStop(0.41, "rgba(0,0,0,0.35)");
    m.addColorStop(0.5, "rgba(0,0,0,0)");
    m.addColorStop(0.59, "rgba(0,0,0,0.35)");
    m.addColorStop(0.725, a);
    m.addColorStop(1, a);
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = m;
    g.fillRect(0, -PAD * 2, cw, ch + PAD * 4);
    g.globalCompositeOperation = "source-over";
  };

  const bake = (seg: Segment, env: BioEnv) => {
    const pal = env.pal;
    const bd = Math.min(env.dpr, 1.25);
    const sw = zoneOuter;
    const cw = 2 * Math.ceil(sw * bd);
    const ch = Math.ceil((SEG_H + 2 * PAD) * bd);
    const cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = ch;
    const g = cv.getContext("2d")!;
    const kx = cw / (2 * sw);
    const ky = ch / (SEG_H + 2 * PAD);
    g.setTransform(kx, 0, 0, ky, 0, PAD * ky);
    g.lineCap = "round";
    g.lineJoin = "round";

    const X = (side: Side, u: number) => (side === 0 ? u : 2 * sw - u);
    const mainCol = mixRGB(pal.pri, pal.pist, 0.22);
    const latCol = mixRGB(pal.pist, pal.pri, 0.35);
    const wMain =
      (2.5 - 1.1 * smooth(soilY, soilY + 4200, seg.index * SEG_H + SEG_H / 2)) *
      scale;

    g.globalAlpha = pal.k;

    // soil surface (only the first segment)
    if (seg.index === 0) {
      const band = g.createLinearGradient(0, soilY, 0, soilY + 260 * scale);
      band.addColorStop(0, rgba(pal.pri, 0.07));
      band.addColorStop(1, rgba(pal.pri, 0));
      g.fillStyle = band;
      g.fillRect(0, soilY, 2 * sw, 260 * scale);

      g.strokeStyle = rgba(mixRGB(pal.pri, pal.pist, 0.3), 0.34);
      g.lineWidth = 1.2 * scale;
      for (const side of [0, 1] as const) {
        g.beginPath();
        for (let k = 0; k <= 24; k++) {
          const u = (sw * k) / 24;
          const yy =
            soilY +
            Math.sin(u * 0.045 + side * 1.7) * 2.6 * scale +
            Math.sin(u * 0.11 + 2) * 1.2 * scale;
          if (k) g.lineTo(X(side, u), yy);
          else g.moveTo(X(side, u), yy);
        }
        g.stroke();
      }

      // little mound where the stem leaves the soil
      g.beginPath();
      g.ellipse(
        X(plant.side, plant.crownU),
        soilY + 1,
        36 * scale,
        7 * scale,
        0,
        Math.PI,
        TAU,
      );
      g.fillStyle = rgba(pal.pri, 0.12);
      g.fill();
      g.strokeStyle = rgba(pal.pist, 0.3);
      g.lineWidth = 1 * scale;
      g.stroke();
    }

    // soft under-glow pass
    g.globalCompositeOperation = pal.blend;
    for (const b of seg.branches) {
      traceBranch(g, b, sw);
      if (b.depth === 0) {
        g.strokeStyle = rgba(pal.pri, 0.1);
        g.lineWidth = wMain * 3.6;
      } else if (b.depth === 1) {
        g.strokeStyle = rgba(pal.pri, 0.07);
        g.lineWidth = 3 * scale;
      } else {
        g.strokeStyle = rgba(pal.pist, 0.05);
        g.lineWidth = 2 * scale;
      }
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";

    // crisp core pass
    for (const b of seg.branches) {
      traceBranch(g, b, sw);
      if (b.depth === 0) {
        g.strokeStyle = rgba(mainCol, 0.55);
        g.lineWidth = wMain;
      } else if (b.depth === 1) {
        g.strokeStyle = rgba(latCol, 0.38);
        g.lineWidth = 1.05 * scale;
      } else {
        g.strokeStyle = rgba(pal.pri, 0.26);
        g.lineWidth = 0.65 * scale;
      }
      g.stroke();
    }

    // root hairs (deterministic, batched into two paths)
    const rng = mulberry32(
      hash32(worldSeed ^ Math.imul(seg.index + 1, 0x27d4eb2f)),
    );
    const hairN = lite ? 40 : 120;
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let i = 0; i < hairN / 2; i++) {
        const br = seg.branches[Math.floor(rng() * seg.branches.length)];
        const n = br.u.length;
        if (n < 3) continue;
        const p = 1 + Math.floor(rng() * (n - 2));
        const x0 = X(br.side, br.u[p]);
        const y0 = br.y[p];
        const tx = X(br.side, br.u[p + 1]) - X(br.side, br.u[p - 1]);
        const ty = br.y[p + 1] - br.y[p - 1];
        const tl = Math.hypot(tx, ty) || 1;
        const sg = rng() < 0.5 ? -1 : 1;
        const hl =
          ((lite ? 4 : 5) + rng() * 9) * scale * (br.depth === 2 ? 0.75 : 1);
        const nx = (-ty / tl) * sg;
        const ny = (tx / tl) * sg;
        g.moveTo(x0, y0);
        g.quadraticCurveTo(
          x0 + nx * hl * 0.5 + (rng() - 0.5) * 3,
          y0 + ny * hl * 0.5 + (rng() - 0.5) * 3,
          x0 + nx * hl,
          y0 + ny * hl,
        );
      }
      g.strokeStyle = rgba(pass ? pal.pri : pal.pist, pass ? 0.18 : 0.26);
      g.lineWidth = (pass ? 0.5 : 0.62) * scale;
      g.stroke();
    }

    // soil specks
    g.fillStyle = rgba(pal.pist, 1);
    const speckN = lite ? 12 : 34;
    for (let i = 0; i < speckN; i++) {
      const side: Side = rng() < 0.5 ? 0 : 1;
      g.globalAlpha = pal.k * (0.05 + rng() * 0.1);
      const s = 0.6 + rng() * 1.3;
      g.fillRect(X(side, rng() * sw * 0.92), rng() * SEG_H, s, s);
    }

    g.globalAlpha = 1;
    stripMask(g, 2 * sw, SEG_H + 2 * PAD);
    return cv;
  };

  /** Parallax "mycelium haze" tile — far, faint, slow. */
  const bakeFar = (k: number, env: BioEnv) => {
    const pal = env.pal;
    const sw = zoneOuter;
    const cw = 2 * Math.ceil(sw);
    const cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = FAR_H;
    const g = cv.getContext("2d")!;
    g.setTransform(cw / (2 * sw), 0, 0, 1, 0, 0);
    g.lineCap = "round";
    const rng = mulberry32(hash32(worldSeed ^ Math.imul(k + 9, 0x165667b1)));
    const X = (side: Side, u: number) => (side === 0 ? u : 2 * sw - u);

    g.globalAlpha = pal.k;
    for (const side of [0, 1] as const) {
      for (let i = 0; i < 9; i++) {
        let u = rng() * sw * 0.85;
        let y = rng() * FAR_H;
        const dir = rng() < 0.5 ? -1 : 1;
        g.beginPath();
        g.moveTo(X(side, u), y);
        const segs = 4 + Math.floor(rng() * 3);
        for (let s = 0; s < segs; s++) {
          const nu = clamp(u + dir * (6 + rng() * 34), 0, sw * 0.95);
          const ny = y + 24 + rng() * 34;
          g.quadraticCurveTo(
            X(side, (u + nu) / 2 + (rng() - 0.5) * 16),
            (y + ny) / 2,
            X(side, nu),
            ny,
          );
          u = nu;
          y = ny;
        }
        g.strokeStyle = rgba(i % 2 ? pal.pist : pal.pri, 0.12);
        g.lineWidth = 0.55 + rng() * 0.35;
        g.stroke();
      }
    }

    g.globalCompositeOperation = pal.blend;
    for (const side of [0, 1] as const) {
      for (let i = 0; i < 6; i++) {
        const s = 12 + rng() * 38;
        g.globalAlpha = pal.k * (0.05 + rng() * 0.1);
        const x = X(side, rng() * sw * 0.9);
        const y = rng() * FAR_H;
        g.drawImage(glow[Math.floor(rng() * 3)], x - s / 2, y - s / 2, s, s);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";

    stripMask(g, 2 * sw, FAR_H);
    const v = g.createLinearGradient(0, 0, 0, FAR_H);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.12, "rgba(0,0,0,1)");
    v.addColorStop(0.88, "rgba(0,0,0,1)");
    v.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = v;
    g.fillRect(0, 0, 2 * sw, FAR_H);
    return cv;
  };

  /** Ghost roots that run from the crown across the page to the other gutter. */
  const bakeCross = (env: BioEnv) => {
    const pal = env.pal;
    const cw = Math.max(2, Math.ceil(width));
    const ch = Math.max(2, Math.ceil(crossH));
    const cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = ch;
    const g = cv.getContext("2d")!;
    g.lineCap = "round";
    g.lineJoin = "round";
    const rng = mulberry32(hash32(worldSeed ^ 0x7f4a7c15));
    const col = mixRGB(pal.pri, pal.pist, 0.22);
    g.globalAlpha = pal.k;

    const path = (c: Cross) => {
      g.beginPath();
      g.moveTo(c.x[0], c.y[0] - crossTop);
      for (let i = 1; i < c.x.length; i++) {
        g.quadraticCurveTo(
          c.x[i - 1],
          c.y[i - 1] - crossTop,
          (c.x[i - 1] + c.x[i]) * 0.5,
          (c.y[i - 1] + c.y[i]) * 0.5 - crossTop,
        );
      }
      g.lineTo(c.x[c.x.length - 1], c.y[c.y.length - 1] - crossTop);
    };

    g.globalCompositeOperation = pal.blend;
    for (const c of cross) {
      path(c);
      g.strokeStyle = rgba(pal.pri, 0.1);
      g.lineWidth = 6 * scale;
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    for (const c of cross) {
      path(c);
      g.strokeStyle = rgba(col, 0.55);
      g.lineWidth = 1.7 * scale;
      g.stroke();
    }

    g.beginPath();
    for (const c of cross) {
      for (let i = 0; i < 16; i++) {
        const p = 1 + Math.floor(rng() * (c.x.length - 2));
        const tx = c.x[p + 1] - c.x[p - 1];
        const ty = c.y[p + 1] - c.y[p - 1];
        const tl = Math.hypot(tx, ty) || 1;
        const sg = rng() < 0.5 ? -1 : 1;
        const hl = (5 + rng() * 9) * scale;
        const x0 = c.x[p];
        const y0 = c.y[p] - crossTop;
        g.moveTo(x0, y0);
        g.lineTo(x0 + (-ty / tl) * sg * hl, y0 + (tx / tl) * sg * hl);
      }
    }
    g.strokeStyle = rgba(pal.pist, 0.24);
    g.lineWidth = 0.6 * scale;
    g.stroke();

    // solid in the gutters, ghost-faint across the content area
    g.globalAlpha = 1;
    const p1 = clamp((zoneOuter * 0.5) / width, 0, 0.48);
    const p2 = clamp((zoneOuter * 1.05) / width, p1 + 0.01, 0.499);
    const m = g.createLinearGradient(0, 0, cw, 0);
    m.addColorStop(0, "rgba(0,0,0,1)");
    m.addColorStop(p1, "rgba(0,0,0,1)");
    m.addColorStop(p2, "rgba(0,0,0,0.1)");
    m.addColorStop(1 - p2, "rgba(0,0,0,0.1)");
    m.addColorStop(1 - p1, "rgba(0,0,0,1)");
    m.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = m;
    g.fillRect(0, 0, cw, ch);
    return cv;
  };

  /* ---------------- plant + air + cross geometry (rebuilt on resize) ---------------- */

  const buildPlant = () => {
    const rng = mulberry32(hash32(worldSeed ^ 0xa341316c));
    const side: Side = rng() < 0.5 ? 0 : 1;
    const h = clamp(zoneOuter * 1.45, 190, 330) * (0.92 + rng() * 0.16);
    const leafMax = clamp(zoneOuter * 0.5, 62, 128);
    const n = lite ? 5 : 6 + Math.floor(rng() * 2);
    const leaves: Leaf[] = [];
    let dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const t = 0.18 + 0.76 * (i / (n - 1));
      const prof = 0.5 + 0.5 * Math.sin(Math.PI * clamp(t * 0.95 + 0.05, 0, 1));
      leaves.push({
        t,
        dir,
        ang: 0.75 + rng() * 0.6,
        len: leafMax * prof * (0.85 + rng() * 0.3),
        ph: rng() * TAU,
      });
      dir = dir === 1 ? -1 : 1;
    }
    // terminal bud
    leaves.push({ t: 1, dir, ang: 0.18, len: leafMax * 0.4, ph: rng() * TAU });

    plant = {
      side,
      crownU: zoneOuter * (0.4 + rng() * 0.12),
      h,
      lean: (rng() - 0.5) * zoneOuter * 0.16,
      bend: (rng() - 0.5) * zoneOuter * 0.12,
      leaves,
    };
  };

  const buildCross = () => {
    cross = [];
    const rng = mulberry32(hash32(worldSeed ^ 0x51ed270b));
    const os: Side = plant.side === 0 ? 1 : 0;
    const N = lite ? 18 : 28;
    let maxY = soilY;
    for (let r = 0; r < rootCount; r++) {
      const x0 = edgeX(
        width,
        plant.side,
        plant.crownU + (r - (rootCount - 1) / 2) * 7 * scale,
      );
      const y0 = soilY;
      const x1 = edgeX(width, os, mainStartU(os, r));
      const y1 = startY(os, r);
      const sag = (60 + rng() * 90) * scale;
      const ph = rng() * TAU;
      const fq = 1.4 + rng() * 1.2;
      const x: number[] = [];
      const y: number[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        x.push(x0 + (x1 - x0) * t);
        y.push(
          y0 +
            (y1 - y0) * easeIO(t) +
            Math.sin(Math.PI * t) * sag +
            Math.sin(t * TAU * fq + ph) * 9 * scale * Math.sin(Math.PI * t),
        );
        if (y[i] > maxY) maxY = y[i];
      }
      cross.push({ x, y, ph: rng() });
    }
    crossTop = soilY - 12 * scale;
    crossH = maxY + 60 - crossTop;
  };

  const buildAir = () => {
    const rng = mulberry32(hash32(worldSeed ^ 0x2545f491));
    const n = lite ? 9 : 20;
    const labels = lite ? 1 : 2;
    air = [];
    for (let i = 0; i < n; i++) {
      const label = (i < labels ? 1 + (i % 2) : 0) as 0 | 1 | 2;
      air.push({
        side: rng() < 0.5 ? 0 : 1,
        u: zoneOuter * (0.06 + rng() * 0.86),
        f0: rng(),
        speed: label ? 9 + rng() * 5 : 5 + rng() * 9,
        size: label ? 1 : 5 + rng() * 17,
        sway: 4 + rng() * 10,
        ph: rng() * TAU,
        warm: rng() < 0.65,
        a: 0.25 + rng() * 0.5,
        label,
      });
    }
  };

  /* ---------------- engine hooks ---------------- */

  const resize = (env: BioEnv) => {
    const geometryChanged =
      Math.abs(width - env.w) > 0.5 ||
      Math.abs(scale - env.scale) > 0.001 ||
      lite !== env.lite ||
      !plant.leaves.length;

    width = env.w;
    scale = env.scale;
    lite = env.lite;
    worldHeight = Math.max(env.viewportH, env.h);
    segmentCount = Math.max(1, Math.ceil(worldHeight / SEG_H));
    rootCount = lite ? 1 : 2;

    if (geometryChanged) {
      zone = env.w * (lite ? 0.13 : 0.17);
      zoneOuter = zone + env.w * 0.04;
      buildPlant();
      soilY = Math.round(plant.h + 90);
      buildCross();
      buildAir();
      cache.clear();
      farCache.clear();
      crossCv = null;
    }

    // height-only changes keep every segment → the world just extends
    for (const key of [...cache.keys()]) {
      if (key >= segmentCount) cache.delete(key);
    }
  };

  const theme = (env: BioEnv) => {
    const pal = env.pal;
    const colors = [pal.pri, pal.sec, pal.pist];
    glow = colors.map((c) => makeGlowSprite(c, pal));
    rods = colors.map((c) => makeRodSprite(c, pal));
    warmGlow = makeGlowSprite(mixRGB(pal.pist, [255, 205, 120], 0.55), pal);
    leafSprite = makeLeafSprite(pal);
    pNH4 = makePill("NH₄⁺", pal.pri, pal);
    pNO3 = makePill("NO₃⁻", pal.sec, pal);
    pN2 = makePill("N₂", pal.pist, pal);
    pN2O = makePill("N₂O", pal.pist, pal);

    for (const seg of cache.values()) seg.baked = null;
    farCache.clear();
    crossCv = null;
  };

  const step = (dt: number, env: BioEnv) => {
    clock += dt / 60;
    const [first, last] = visibleRange(env);
    for (let i = first; i <= last; i++) get(i);
    prune(Math.floor((env.scrollY + env.viewportH * 0.5) / SEG_H));
  };

  const settle = (_env: BioEnv) => {
    clock = 8;
  };

  /* ---------------- drawing ---------------- */

  const gf = (u: number) => 1 - smooth(zoneOuter * 0.6, zoneOuter * 0.98, u);

  const blitStrips = (
    ctx: CanvasRenderingContext2D,
    cv: HTMLCanvasElement,
    w: number,
    destY: number,
    destH: number,
  ) => {
    const half = cv.width / 2;
    ctx.drawImage(cv, 0, 0, half, cv.height, 0, destY, zoneOuter, destH);
    ctx.drawImage(
      cv,
      half,
      0,
      half,
      cv.height,
      w - zoneOuter,
      destY,
      zoneOuter,
      destH,
    );
  };

  const drawFar = (env: BioEnv, intro: number) => {
    if (lite) return;
    const { ctx, w, scrollY, viewportH } = env;
    const soilScreen = soilY - scrollY;
    if (soilScreen > viewportH) return;
    const off = scrollY * FAR_PARALLAX;
    const k0 = Math.floor(off / FAR_H);
    const k1 = Math.floor((off + viewportH) / FAR_H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, Math.max(0, soilScreen), w, viewportH);
    ctx.clip();
    ctx.globalAlpha = intro * (0.55 + 0.45 * smooth(0, 2400, scrollY));
    for (let k = k0; k <= k1; k++) {
      let tile = farCache.get(k);
      if (!tile) {
        tile = bakeFar(k, env);
        farCache.set(k, tile);
        if (farCache.size > 4) {
          for (const key of [...farCache.keys()]) {
            if (key < k0 - 1 || key > k1 + 1) farCache.delete(key);
          }
        }
      }
      blitStrips(ctx, tile, w, k * FAR_H - off, FAR_H);
    }
    ctx.restore();
  };

  const drawCross = (env: BioEnv, intro: number) => {
    if (!cross.length) return;
    const { ctx, w, scrollY, viewportH, pal } = env;
    const topS = crossTop - scrollY;
    if (topS > viewportH || topS + crossH < 0) return;
    if (!crossCv) crossCv = bakeCross(env);
    ctx.globalAlpha = intro;
    ctx.drawImage(crossCv, 0, topS, w, crossH);

    ctx.globalCompositeOperation = pal.blend;
    for (const c of cross) {
      const q = frac(clock * 0.05 + c.ph);
      const env_ = Math.sin(Math.PI * q);
      const nn = c.x.length - 1;
      for (let j = 0; j < 3; j++) {
        const s = clamp(1 - q + j * 0.03, 0, 1);
        const p = s * nn;
        const i = Math.min(nn - 1, Math.floor(p));
        const f = p - i;
        const x = c.x[i] + (c.x[i + 1] - c.x[i]) * f;
        const y = c.y[i] + (c.y[i + 1] - c.y[i]) * f;
        const u = Math.min(x, w - x);
        const a =
          pal.k *
          intro *
          env_ *
          TAIL[j] *
          0.8 *
          (0.12 + 0.88 * (1 - smooth(zoneOuter * 0.5, zoneOuter * 1.05, u)));
        if (a < 0.02) continue;
        spr(ctx, glow[1], x, y - scrollY, (11 - j * 2) * scale, a);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const drawUnder = (seg: Segment, env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, viewportH, pal } = env;
    const top = seg.index * SEG_H - scrollY;
    if (top > viewportH + PAD || top + SEG_H < -PAD) return;
    const k = pal.k * intro;
    const segTopW = seg.index * SEG_H;
    ctx.globalCompositeOperation = pal.blend;

    for (const br of seg.branches) {
      // lateral nitrate pulses → flow toward the main root
      if (br.depth === 1 && br.ph >= 0) {
        const q = frac(clock * br.sp + br.ph);
        const e = Math.sin(Math.PI * q);
        const nn = br.u.length - 1;
        for (let j = 0; j < 3; j++) {
          const s = clamp(1 - q + j * 0.04, 0, 1);
          const p = s * nn;
          const i = Math.min(nn - 1, Math.floor(p));
          const f = p - i;
          const u = br.u[i] + (br.u[i + 1] - br.u[i]) * f;
          const y = br.y[i] + (br.y[i + 1] - br.y[i]) * f;
          const a = k * gf(u) * e * TAIL[j] * 0.9;
          if (a < 0.02) continue;
          spr(
            ctx,
            glow[1],
            edgeX(w, br.side, u),
            top + y,
            (10 - j * 2) * scale,
            a,
          );
        }
        continue;
      }

      // main-root pulses: one global phase → seamless across segments
      if (br.depth !== 0) continue;
      const base = br.ph - clock * PULSE_SPEED;
      let y = base + Math.ceil((segTopW - 40 - base) / PULSE_GAP) * PULSE_GAP;
      const yFirst = br.y[0];
      const yLast = br.y[br.y.length - 1];
      for (; y < segTopW + SEG_H; y += PULSE_GAP) {
        for (let j = 0; j < 4; j++) {
          const yl = y + j * 9 * scale - segTopW;
          if (yl < 0 || yl >= SEG_H || yl < yFirst || yl > yLast) continue;
          // binary search on monotonic y
          let lo = 0;
          let hi = br.y.length - 1;
          while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (br.y[mid] <= yl) lo = mid;
            else hi = mid;
          }
          const f = (yl - br.y[lo]) / Math.max(1e-3, br.y[hi] - br.y[lo]);
          const u = br.u[lo] + (br.u[hi] - br.u[lo]) * f;
          const startFade =
            seg.index === 0 ? smooth(yFirst, yFirst + 55 * scale, yl) : 1;
          const a = k * gf(u) * startFade * TAIL[j];
          if (a < 0.02) continue;
          const sy = top + yl;
          if (sy < -20 || sy > viewportH + 20) continue;
          spr(ctx, glow[1], edgeX(w, br.side, u), sy, (14 - j * 2) * scale, a);
        }
      }
    }

    // leaching drops (↓) and gas rings (↑)
    for (const m of seg.motes) {
      const f = frac(m.f0 + (clock * m.vy) / SEG_H);
      const e = hill(0, 0.1, 0.9, 1, f);
      const u = m.u + Math.sin(clock * 0.4 + m.ph) * 4;
      const a = k * gf(u) * e * (m.ring ? 0.4 : 0.32);
      if (a < 0.02) continue;
      const x = edgeX(w, m.side, u);
      const y = top + f * SEG_H;
      if (y < -20 || y > viewportH + 20) continue;
      if (m.ring) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = rgba(pal.pist, 0.9);
        ctx.lineWidth = 0.9 * scale;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 0.5 * scale, 0, TAU);
        ctx.stroke();
      } else {
        spr(ctx, glow[1], x, y, m.size * 1.6 * scale, a);
      }
    }

    // ambient bacteria
    for (const b of seg.bacteria) {
      const u = b.u + Math.sin(clock * 0.4 + b.ph) * 7;
      const y = top + b.y + Math.cos(clock * 0.33 + b.ph) * 6;
      if (y < -30 || y > viewportH + 30) continue;
      const a = k * gf(u) * 0.85;
      if (a < 0.03) continue;
      const x = edgeX(w, b.side, u);
      ctx.globalCompositeOperation = "source-over";
      if (b.rod) {
        const dw = 16 * scale * b.size;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(b.ang + Math.sin(clock * 0.5 + b.ph) * 0.5);
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(rods[b.tint], -dw / 2, -dw / 4, dw, dw / 2);
        ctx.restore();
      } else {
        spr(ctx, glow[b.tint], x, y, 12 * scale * b.size, a);
      }
    }

    // nitrogen stories: NH₄⁺ → bacterium → NO₃⁻ → root
    for (const s of seg.stories) {
      const g = gf(s.ub) * k;
      if (g < 0.02) continue;
      const by = top + s.yb;
      if (by < -80 || by > viewportH + 80) continue;

      const t = clock + s.offset;
      const cyc = Math.floor(t / s.period);
      const p = (t - cyc * s.period) / s.period;
      const jh = hash32(worldSeed ^ Math.imul(cyc + 3, 0x9e3779b1) ^ s.seed);
      const ua = clamp(
        s.ua + ((jh & 255) / 255 - 0.5) * 34 * scale,
        zoneOuter * 0.05,
        zoneOuter * 0.92,
      );
      const ya = s.ya + (((jh >>> 8) & 255) / 255 - 0.5) * 28 * scale;
      const ax = edgeX(w, s.side, ua);
      const ay = top + ya;
      const bx = edgeX(w, s.side, s.ub);
      const rx = edgeX(w, s.side, s.ur);
      const ry = top + s.yr;

      // bacterium (always there, wobbling)
      const wob = Math.sin(clock * 0.9 + s.seed) * 0.35;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(s.ang + wob);
      ctx.globalAlpha = Math.min(1, g * 0.95);
      const bw = 19 * scale;
      ctx.drawImage(rods[s.tint], -bw / 2, -bw / 4, bw, bw / 2);
      ctx.restore();

      ctx.globalCompositeOperation = pal.blend;
      spr(ctx, glow[s.tint], bx, by, 26 * scale, g * 0.22);

      // NH₄⁺ pill flies in
      if (p < 0.42 && pNH4) {
        const m = easeIO(p / 0.42);
        const a = smooth(0, 0.08, p) * (1 - smooth(0.34, 0.42, p));
        ctx.globalCompositeOperation = "source-over";
        drawPill(
          ctx,
          pNH4,
          ax + (bx - ax) * m,
          ay + (by - ay) * m,
          0.8 * scale * (1 - 0.25 * m),
          a * g * 0.9,
        );
        ctx.globalCompositeOperation = pal.blend;
      }

      // nitrification flash
      const pf = (p - 0.4) / 0.16;
      if (pf > 0 && pf < 1) {
        spr(
          ctx,
          glow[1],
          bx,
          by,
          (16 + 40 * pf) * scale,
          0.9 * g * Math.pow(1 - pf, 1.5),
        );
      }

      // NO₃⁻ pill travels to the root
      if (p > 0.44 && p < 0.9 && pNO3) {
        const m = easeOut((p - 0.44) / 0.46);
        const a = smooth(0.44, 0.52, p) * (1 - smooth(0.84, 0.9, p));
        ctx.globalCompositeOperation = "source-over";
        drawPill(
          ctx,
          pNO3,
          bx + (rx - bx) * m,
          by + (ry - by) * m,
          0.8 * scale * (1 - 0.2 * m),
          a * g * 0.9,
        );
        ctx.globalCompositeOperation = pal.blend;
      }

      // root uptake ripple
      const pa = (p - 0.86) / 0.14;
      if (pa > 0 && pa < 1) {
        spr(ctx, glow[1], rx, ry, (10 + 12 * pa) * scale, 0.7 * g * (1 - pa));
        ctx.globalAlpha = Math.min(1, 0.7 * g * (1 - pa));
        ctx.strokeStyle = rgba(pal.sec, 0.9);
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.arc(rx, ry, (3 + 16 * pa) * scale, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const drawAir = (env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, viewportH, pal } = env;
    if (scrollY > soilY || !warmGlow) return;
    const H = soilY - 6;
    for (const a of air) {
      const f = frac(a.f0 - (clock * a.speed) / H);
      const yS = f * H - scrollY;
      if (yS < -30 || yS > viewportH + 30) continue;
      const e = hill(0, 0.12, 0.88, 1, f);
      const u = a.u + Math.sin(clock * 0.3 + a.ph) * a.sway;
      const al =
        pal.k *
        intro *
        gf(u) *
        e *
        a.a *
        (0.7 + 0.3 * Math.sin(clock * 1.7 + a.ph));
      if (al < 0.02) continue;
      const x = edgeX(w, a.side, u);
      if (a.label) {
        const p = a.label === 1 ? pN2 : pN2O;
        if (p) {
          ctx.globalCompositeOperation = "source-over";
          drawPill(ctx, p, x, yS, 0.78 * scale, al * 0.9);
        }
      } else {
        ctx.globalCompositeOperation = pal.blend;
        spr(ctx, a.warm ? warmGlow : glow[2], x, yS, a.size * scale, al);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const drawPlant = (env: BioEnv, intro: number) => {
    if (!leafSprite || !warmGlow || !plant.leaves.length) return;
    const { ctx, scrollY, viewportH, pal } = env;
    if (soilY - scrollY < -60) return;
    if (soilY - plant.h * 1.15 - scrollY > viewportH) return;

    const sgn = plant.side === 0 ? 1 : -1;
    const grow = smooth(0.1, 3.0, clock);

    const stemAt = (t: number) => {
      const sway = Math.sin(clock * 0.55 + t * 2.4) * 3.4 * scale * t * t;
      pt.x =
        edgeX(
          width,
          plant.side,
          plant.crownU + plant.lean * t + plant.bend * Math.sin(Math.PI * t),
        ) + sway;
      pt.y = soilY - plant.h * t * grow - scrollY;
    };

    // nitrate pulses that reached the crown → stem pulses + leaf glow
    const leafGlow: number[] = plant.leaves.map(() => 0);
    let crownGlow = 0;
    const stemPulses: number[] = [];
    for (let r = 0; r < rootCount; r++) {
      const e = mod(
        soilY - (rootPhase(plant.side, r) - clock * PULSE_SPEED),
        PULSE_GAP,
      );
      const d = PULSE_GAP - e;
      crownGlow = Math.max(
        crownGlow,
        Math.exp(-(d * d) / 2500),
        Math.exp(-(e * e) / 1600),
      );
      const tp = ((e / PULSE_SPEED) * STEM_SPEED) / plant.h;
      if (tp < 1.3 && tp <= grow * 1.02) {
        if (tp <= 1) stemPulses.push(tp);
        const fade = 1 - smooth(1.0, 1.3, tp);
        for (let i = 0; i < plant.leaves.length; i++) {
          const dd = tp - plant.leaves[i].t;
          if (dd >= -0.02) {
            leafGlow[i] = Math.min(
              1,
              leafGlow[i] + Math.exp(-Math.max(dd, 0) * 5) * fade,
            );
          }
        }
      }
    }

    // sun glow behind the crown of the plant
    stemAt(0.8);
    ctx.globalCompositeOperation = pal.blend;
    spr(
      ctx,
      warmGlow,
      pt.x,
      pt.y,
      zoneOuter * 3.4,
      0.13 * pal.k * intro * grow,
    );

    // stem — one tapered ribbon (no overlapping round caps → no beads)
    for (let j = 0; j <= NS; j++) {
      stemAt(j / NS);
      stX[j] = pt.x;
      stY[j] = pt.y;
    }
    const ribbon = (kw: number) => {
      ctx.beginPath();
      for (let j = 0; j <= NS; j++) {
        const a = Math.max(0, j - 1);
        const b = Math.min(NS, j + 1);
        const tx = stX[b] - stX[a];
        const ty = stY[b] - stY[a];
        const l = Math.hypot(tx, ty) || 1;
        const hw = (1.9 - 1.0 * (j / NS)) * scale * kw;
        const px = stX[j] + (-ty / l) * hw;
        const py = stY[j] + (tx / l) * hw;
        if (j) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      for (let j = NS; j >= 0; j--) {
        const a = Math.max(0, j - 1);
        const b = Math.min(NS, j + 1);
        const tx = stX[b] - stX[a];
        const ty = stY[b] - stY[a];
        const l = Math.hypot(tx, ty) || 1;
        const hw = (1.9 - 1.0 * (j / NS)) * scale * kw;
        ctx.lineTo(stX[j] - (-ty / l) * hw, stY[j] - (tx / l) * hw);
      }
      ctx.closePath();
    };
    ctx.globalAlpha = 0.1 * pal.k * intro;
    ribbon(2.6);
    ctx.fillStyle = rgba(pal.pri, 1);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.6 * pal.k * intro;
    ribbon(1);
    ctx.fillStyle = rgba(mixRGB(pal.pri, pal.pist, 0.4), 1);
    ctx.fill();

    // leaves
    for (let i = 0; i < plant.leaves.length; i++) {
      const lf = plant.leaves[i];
      const gs = easeOut(smooth(0.4 + 2.0 * lf.t, 1.4 + 2.0 * lf.t, clock));
      if (gs <= 0.01) continue;
      stemAt(lf.t);
      const a =
        lf.ang +
        Math.sin(clock * 0.7 + lf.ph) * 0.07 +
        0.05 * gs +
        (1 - gs) * 0.5;
      const rot = Math.atan2(-Math.cos(a), sgn * lf.dir * Math.sin(a));
      const len = lf.len * gs;
      const glowK = leafGlow[i];

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(rot);
      ctx.scale(len / 176, len / 176);
      ctx.globalAlpha = Math.min(1, (0.82 + 0.5 * glowK) * intro * pal.k);
      ctx.drawImage(leafSprite, -8, -48);
      ctx.restore();

      if (glowK > 0.03) {
        const cx = pt.x + Math.cos(rot) * len * 0.5;
        const cy = pt.y + Math.sin(rot) * len * 0.5;
        ctx.globalCompositeOperation = pal.blend;
        spr(ctx, glow[2], cx, cy, len * 1.3, 0.3 * glowK * pal.k * intro);
        ctx.globalCompositeOperation = "source-over";
      }
    }

    // crown node + pulses climbing the stem
    ctx.globalCompositeOperation = pal.blend;
    stemAt(0);
    spr(
      ctx,
      glow[1],
      pt.x,
      pt.y,
      (14 + 14 * crownGlow) * scale,
      (0.35 + 0.5 * crownGlow) * pal.k * intro,
    );
    for (const tp of stemPulses) {
      stemAt(tp);
      spr(
        ctx,
        glow[1],
        pt.x,
        pt.y,
        17 * scale,
        0.85 * pal.k * intro * (1 - smooth(0.85, 1, tp)),
      );
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const draw = (env: BioEnv) => {
    if (!glow.length || !rods.length) return;
    const { ctx, w, scrollY, viewportH, h, pal } = env;
    const intro = smooth(0, 1.2, clock);
    const [first, last] = visibleRange(env);
    const depth = 0.86 + 0.14 * smooth(0, 3000, scrollY);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    drawCross(env, intro);

    // Removed the hard ctx.clip() that was cutting the plant's warm glow
    // and air motes at the zoneOuter boundary. The layers themselves
    // (blitStrips, gf) already fade out softly toward the center.

    drawFar(env, intro);

    // baked static roots: 2 blits per segment
    ctx.globalAlpha = intro * depth;
    for (let i = first; i <= last; i++) {
      const seg = get(i);
      if (!seg) continue;
      const top = i * SEG_H - scrollY;
      if (top - PAD > viewportH || top + SEG_H + PAD < 0) continue;
      if (!seg.baked) seg.baked = bake(seg, env);
      blitStrips(ctx, seg.baked, w, top - PAD, SEG_H + 2 * PAD);
    }
    ctx.globalAlpha = 1;

    for (let i = first; i <= last; i++) {
      const seg = get(i);
      if (seg) drawUnder(seg, env, intro);
    }

    drawAir(env, intro);
    drawPlant(env, intro);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // Soften the top edge of the canvas to avoid a hard horizontal cut.
    // Using destination-out instead of destination-in prevents wiping the whole canvas.
    const topFade = ctx.createLinearGradient(0, 0, 0, 80);
    topFade.addColorStop(0, "rgba(0,0,0,1)");
    topFade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, w, 80);

    ctx.restore();

    // quiet closure at the true end of the page
    const bottomS = h - scrollY;
    const dist = bottomS - viewportH;
    if (dist > -150 && dist < 180) {
      const reveal = 1 - smooth(0, 180, Math.max(0, dist));
      const cx = w * 0.5;
      const cy = Math.min(bottomS - 18, viewportH - 18);
      ctx.save();
      ctx.globalCompositeOperation = pal.blend;
      spr(
        ctx,
        glow[2],
        cx,
        cy,
        Math.min(260, w * 0.3),
        0.3 * pal.k * intro * reveal,
      );
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = rgba(pal.pri, 0.8);
      ctx.lineWidth = 1 * scale;
      for (let r = 0; r < 2; r++) {
        ctx.globalAlpha = (0.26 - r * 0.1) * pal.k * intro * reveal;
        ctx.beginPath();
        ctx.arc(cx, cy, (34 + r * 22) * scale, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.6 * pal.k * intro * reveal;
      ctx.fillStyle = rgba(pal.pist, 0.95);
      ctx.beginPath();
      ctx.arc(cx, cy, 4 * scale, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  return { resize, theme, step, draw, settle };
};

/* =========================================================
   Component
========================================================= */

export const NitrogenCycleBackground = ({
  scrollContainerRef,
}: {
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) => {
  const ref = useBioCanvas(createScene, scrollContainerRef);
  return (
    <canvas
      ref={ref}
      className="fixed z-[1] hidden md:block pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default NitrogenCycleBackground;
