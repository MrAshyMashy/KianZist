"use client";

/* =========================================================
   KianZist — About Us: "From Seed to Ecosystem"
   ---------------------------------------------------------
   Built on the shared UseBioCanvas engine (resize / theme / step / draw).

   The page is a real, scroll-scrubbed timeline:
   - A continuous root / mycelium "lifeline" runs down both gutters.
     It starts as thin threads and gets richer with depth.
   - Stage vignettes are laid along the page. Every vignette shows the
     same life at a later stage and GROWS while it scrolls into view
     (scroll-scrubbed): dormant seed → crack → radicle → lateral roots
     → microbes + hyphae → cotyledons → shoot → leaves → flower.
   - At the TRUE bottom of the world (anchored to the real content
     height) a full-width ecosystem rises: a mature tree, deep root
     web, mycorrhizal links with nutrient pulses, mushrooms, saplings,
     grass, flowers, sun beams, fireflies.

   Fresh random world per mount (seed side, roots, branching, leaves,
   microbes, tree, ecosystem). Deterministic while scrolling / resizing.

   Performance: static skeleton baked once per segment (2 blits),
   ecosystem baked once into ONE canvas, only sprites + a few small
   paths drawn per frame, only visible parts exist, everything lives in
   the gutters (the ecosystem fades to ghost-level behind the text).
========================================================= */

import type { RefObject } from "react";
import {
  BioEnv,
  BioPalette,
  BioScene,
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

/* ---------------- tuning ---------------- */

const SEG_H = 960;
const PAD = 150;
const MAX_CACHE = 6;
const PULSE_GAP = 460;
const PULSE_SPEED = 30;
const TAIL = [1, 0.55, 0.3, 0.16];
const NS = 14;

type Side = 0 | 1;
type Tint = 0 | 1 | 2;
type RGB = [number, number, number];

interface Branch {
  side: Side;
  u: number[];
  y: number[];
  depth: 0 | 1 | 2;
  sp: number;
  ph: number;
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

interface Segment {
  index: number;
  mY: number;
  branches: Branch[];
  bacteria: Bac[];
  baked: HTMLCanvasElement | null;
  used: number;
}

/* vignette (one growing life) — coordinates relative to its ground point */
interface VBranch {
  dx: number[];
  y: number[];
  hair: number[];
  birth: number;
  span: number;
  depth: 0 | 1 | 2;
}
interface VBac {
  b: number;
  p: number;
  ox: number;
  oy: number;
  birth: number;
  tint: Tint;
  rod: boolean;
  ang: number;
  ph: number;
  size: number;
}
interface VHypha {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  birth: number;
  ph: number;
}
interface VLeaf {
  t: number;
  dir: 1 | -1;
  ang: number;
  len: number;
  ph: number;
  birth: number;
}
interface Vig {
  i: number;
  side: Side;
  gu: number;
  gy: number;
  seedY: number;
  seedSz: number;
  seedAng: number;
  branches: VBranch[];
  bacs: VBac[];
  hyph: VHypha[];
  hs: number;
  lean: number;
  bend: number;
  leaves: VLeaf[];
  flower: boolean;
  ph: number;
}

interface Fly {
  x0: number;
  y0: number;
  ax: number;
  ay: number;
  sp: number;
  ph: number;
  a: number;
  size: number;
}
interface Eco {
  cv: HTMLCanvasElement;
  sky: HTMLCanvasElement;
  skyBleed: number;
  paths: { x: number[]; y: number[]; dir: 1 | -1; ph: number }[];
  flies: Fly[];
  sunX: number;
  sunY: number;
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
    // fall through
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
const easeIO = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
const hill = (a: number, b: number, c: number, d: number, x: number) =>
  smooth(a, b, x) * (1 - smooth(c, d, x));
const WHITE: RGB = [255, 255, 255];

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

/** Leaf sprite (base at (8,48), tip at (184,48)). */
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
  g.save();
  body();
  g.clip();
  const hg = g.createLinearGradient(0, cy - hw, 0, cy + hw * 0.4);
  hg.addColorStop(
    0,
    rgba(mixRGB(pal.pist, WHITE, 0.55), pal.dark ? 0.26 : 0.2),
  );
  hg.addColorStop(1, rgba(WHITE, 0));
  g.fillStyle = hg;
  g.fillRect(0, 0, 192, 96);
  g.restore();
  g.lineWidth = 1.3;
  g.strokeStyle = rgba(mixRGB(pal.pri, WHITE, pal.dark ? 0.35 : 0.05), 0.7);
  body();
  g.stroke();
  g.lineCap = "round";
  g.strokeStyle = rgba(mixRGB(pal.pist, WHITE, pal.dark ? 0.3 : 0), 0.5);
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
  const vigCache = new Map<number, Vig>();

  let width = 0;
  let vh = 0;
  let scale = 1;
  let lite = false;
  let worldHeight = 1;
  let segmentCount = 1;
  let zone = 0;
  let zoneOuter = 0;
  let rootCount = 2;
  let ecoH = 0;
  let ecoTop = 0;
  let yG = 0; // ecosystem ground line (world y)
  let gy0 = 0;
  let GAP = 800;
  let vigCount = 1;
  let parity = 0;
  let clock = 0;
  let tick = 0;

  let eco: Eco | null = null;
  let glow: HTMLCanvasElement[] = [];
  let rods: HTMLCanvasElement[] = [];
  let warmGlow: HTMLCanvasElement | null = null;
  let leafSprite: HTMLCanvasElement | null = null;

  const tx = new Float32Array(128);
  const ty = new Float32Array(128);
  const stX = new Float32Array(NS + 1);
  const stY = new Float32Array(NS + 1);

  const gf = (u: number) => 1 - smooth(zoneOuter * 0.6, zoneOuter * 0.98, u);

  // visibility of the page-long skeleton: hidden in the ecosystem's sky
  const skelVis = (yw: number) =>
    yw < ecoTop - 160
      ? 1
      : yw < ecoTop
        ? 1 - smooth(ecoTop - 160, ecoTop, yw)
        : yw < yG - 10
          ? 0
          : smooth(yG - 10, yG + 70, yw);

  /* ---------------- skeleton (continuous lifeline) ---------------- */

  const boundaryU = (b: number, side: Side, r: number) => {
    const key =
      worldSeed ^
      Math.imul(b + 17, 0x9e3779b1) ^
      Math.imul(side + 3, 0x85ebca6b) ^
      Math.imul(r + 11, 0xc2b2ae35);
    return zone * (0.3 + (hash32(key) / 0xffffffff) * 0.4);
  };

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

  const buildMain = (index: number, side: Side, r: number, stepPx: number) => {
    const count = Math.max(8, Math.ceil(SEG_H / stepPx));
    const u: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      u.push(clamp(hermite(index, side, r, t), zone * 0.035, zone * 0.98));
      y.push(t * SEG_H);
    }
    const b: Branch = { side, u, y, depth: 0, sp: 0, ph: rootPhase(side, r) };
    return b;
  };

  const build = (index: number): Segment => {
    const rng = mulberry32(
      hash32(worldSeed ^ Math.imul(index + 1, 0x9e3779b1)),
    );
    const st = Math.max(9, 12 * scale);
    const mY = clamp((index * SEG_H + SEG_H / 2) / 4500, 0, 1);
    const branches: Branch[] = [];
    const maxLat = lite ? Math.floor(6 + 8 * mY) : Math.floor(10 + 22 * mY);
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
      let theta = 0.5 + rng() * 0.75;
      const n = Math.ceil(length / st);
      for (let i = 1; i <= n; i++) {
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
      const b: Branch = { side, u, y, depth, sp: 0.05 + rng() * 0.05, ph: -1 };
      if (depth === 1 && pulsed < (lite ? 2 : 6)) {
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
    const per = Math.max(1, Math.floor(maxLat / mains.length));
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
          (70 + rng() * 160) * scale * (0.55 + 0.45 * mY) * (lite ? 0.7 : 1),
          1,
        );
        if (lat && !lite && rng() < 0.3 + 0.5 * mY) {
          const ci = 2 + Math.floor(rng() * Math.max(1, lat.u.length - 4));
          grow(
            m.side,
            lat.u[ci],
            lat.y[ci],
            rng() < 0.5 ? 1 : -1,
            (34 + rng() * 70) * scale,
            2,
          );
        }
        i += 3 + Math.floor(rng() * 5);
      }
    }

    const pool = branches.filter((b) => b.depth > 0 && b.u.length > 4);
    const anchor = pool.length ? pool : branches;
    const bacteria: Bac[] = [];
    const bacN = lite ? 2 : 4;
    for (let i = 0; i < bacN; i++) {
      const br = anchor[Math.floor(rng() * anchor.length)];
      const p = 1 + Math.floor(rng() * (br.u.length - 2));
      bacteria.push({
        side: br.side,
        u: clamp(
          br.u[p] + (5 + rng() * 12) * scale * (rng() < 0.5 ? -1 : 1),
          zoneOuter * 0.03,
          zoneOuter * 0.94,
        ),
        y: br.y[p] + (rng() - 0.5) * 12 * scale,
        ang: rng() * Math.PI,
        tint: Math.floor(rng() * 3) as Tint,
        size: 0.75 + rng() * 0.6,
        ph: rng() * TAU,
        rod: rng() < 0.65,
      });
    }
    return { index, mY, branches, bacteria, baked: null, used: ++tick };
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

  /* ---------------- baking ---------------- */

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
    const ky = ch / (SEG_H + 2 * PAD);
    g.setTransform(cw / (2 * sw), 0, 0, ky, 0, PAD * ky);
    g.lineCap = "round";
    g.lineJoin = "round";
    const X = (side: Side, u: number) => (side === 0 ? u : 2 * sw - u);
    const mainCol = mixRGB(pal.pri, pal.pist, 0.22);
    const latCol = mixRGB(pal.pist, pal.pri, 0.35);
    const wMain = (1.1 + 1.4 * seg.mY) * scale;
    g.globalAlpha = pal.k * (0.6 + 0.4 * seg.mY);

    g.globalCompositeOperation = pal.blend;
    for (const b of seg.branches) {
      traceBranch(g, b, sw);
      if (b.depth === 0) {
        g.strokeStyle = rgba(pal.pri, 0.1);
        g.lineWidth = wMain * 3.4;
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
    for (const b of seg.branches) {
      traceBranch(g, b, sw);
      if (b.depth === 0) {
        g.strokeStyle = rgba(mainCol, 0.5);
        g.lineWidth = wMain;
      } else if (b.depth === 1) {
        g.strokeStyle = rgba(latCol, 0.36);
        g.lineWidth = 1.0 * scale;
      } else {
        g.strokeStyle = rgba(pal.pri, 0.25);
        g.lineWidth = 0.62 * scale;
      }
      g.stroke();
    }

    const rng = mulberry32(
      hash32(worldSeed ^ Math.imul(seg.index + 1, 0x27d4eb2f)),
    );
    const hairN = Math.floor((lite ? 20 : 50) + (lite ? 20 : 80) * seg.mY);
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let i = 0; i < hairN / 2; i++) {
        const br = seg.branches[Math.floor(rng() * seg.branches.length)];
        const n = br.u.length;
        if (n < 3) continue;
        const p = 1 + Math.floor(rng() * (n - 2));
        const x0 = X(br.side, br.u[p]);
        const y0 = br.y[p];
        const dx = X(br.side, br.u[p + 1]) - X(br.side, br.u[p - 1]);
        const dy = br.y[p + 1] - br.y[p - 1];
        const tl = Math.hypot(dx, dy) || 1;
        const sg = rng() < 0.5 ? -1 : 1;
        const hl =
          ((lite ? 4 : 5) + rng() * 9) * scale * (br.depth === 2 ? 0.75 : 1);
        const nx = (-dy / tl) * sg;
        const ny = (dx / tl) * sg;
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

    g.fillStyle = rgba(pal.pist, 1);
    for (let i = 0; i < (lite ? 10 : 26); i++) {
      const side: Side = rng() < 0.5 ? 0 : 1;
      g.globalAlpha = pal.k * (0.05 + rng() * 0.1);
      const s = 0.6 + rng() * 1.3;
      g.fillRect(X(side, rng() * sw * 0.92), rng() * SEG_H, s, s);
    }

    g.globalAlpha = 1;
    stripMask(g, 2 * sw, SEG_H + 2 * PAD);

    // hide the skeleton inside the ecosystem's sky
    const top = seg.index * SEG_H;
    if (top + SEG_H + PAD >= ecoTop - 160) {
      const y0 = -PAD;
      const y1 = SEG_H + PAD;
      const grad = g.createLinearGradient(0, y0, 0, y1);
      for (let k = 0; k <= 32; k++) {
        const a = skelVis(top + y0 + ((y1 - y0) * k) / 32);
        grad.addColorStop(k / 32, `rgba(0,0,0,${a})`);
      }
      g.globalCompositeOperation = "destination-in";
      g.fillStyle = grad;
      g.fillRect(0, y0 - PAD, 2 * sw, y1 - y0 + 2 * PAD);
      g.globalCompositeOperation = "source-over";
    }
    return cv;
  };

  /* ---------------- vignettes (growing life) ---------------- */

  const buildVig = (i: number): Vig => {
    const rng = mulberry32(hash32(worldSeed ^ Math.imul(i + 101, 0x9e3779b1)));
    const flip = rng() < 0.22 ? 1 : 0;
    const side = ((i + parity + flip) & 1) as Side;
    const gu = zoneOuter * (0.34 + rng() * 0.3);
    const gy = gy0 + i * GAP + (i ? (rng() - 0.5) * 0.12 * GAP : 0);
    const st = Math.max(9, 12 * scale);
    const seedY = (24 + rng() * 14) * scale;
    const lim = zoneOuter * 0.34;
    const uMin = zoneOuter * 0.05 - gu;
    const uMax = zoneOuter * 0.94 - gu;

    const branches: VBranch[] = [];
    const mkHair = (n: number, depth: number) => {
      const h: number[] = [0];
      for (let k = 1; k < n; k++) {
        h.push(
          rng() < 0.5
            ? (4 + rng() * 8) *
                scale *
                (depth === 2 ? 0.7 : 1) *
                (rng() < 0.5 ? -1 : 1)
            : 0,
        );
      }
      return h;
    };

    // primary root (radicle)
    const Lp = (260 + rng() * 120) * scale;
    const n = Math.ceil(Lp / st);
    const pdx = [0];
    const py = [seedY];
    let cdx = 0;
    let cy = seedY;
    for (let k = 1; k <= n; k++) {
      cdx = clamp(cdx + (rng() - 0.5) * st * 0.9, -lim, lim);
      cy += st * (0.9 + rng() * 0.2);
      pdx.push(clamp(cdx, uMin, uMax));
      py.push(cy);
    }
    branches.push({
      dx: pdx,
      y: py,
      hair: mkHair(pdx.length, 0),
      birth: 0.14,
      span: 0.3,
      depth: 0,
    });

    const grow = (
      sdx: number,
      sy: number,
      dir: 1 | -1,
      length: number,
      depth: 1 | 2,
      birth: number,
    ) => {
      const dxs = [sdx];
      const ys = [sy];
      let cx = sdx;
      let cyy = sy;
      let theta = 0.5 + rng() * 0.75;
      const m = Math.ceil(length / st);
      for (let k = 1; k <= m; k++) {
        theta =
          theta * (depth === 1 ? 0.95 : 0.97) +
          (rng() - 0.5) * (depth === 1 ? 0.34 : 0.55);
        theta = clamp(theta, -0.4, 1.35);
        cx += dir * Math.sin(theta) * st;
        cyy += Math.cos(theta) * st;
        if (cx < uMin || cx > uMax) break;
        dxs.push(cx);
        ys.push(cyy);
      }
      if (dxs.length < 3) return null;
      const b: VBranch = {
        dx: dxs,
        y: ys,
        hair: mkHair(dxs.length, depth),
        birth,
        span: 0.2,
        depth,
      };
      branches.push(b);
      return b;
    };

    const latN = lite ? 4 : 6 + Math.floor(rng() * 4);
    for (let k = 0; k < latN; k++) {
      const p = 4 + Math.floor(((k + rng()) * (n - 8)) / latN);
      const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
      const birth = 0.32 + 0.38 * (p / n) + rng() * 0.05;
      const lat = grow(
        pdx[p],
        py[p],
        dir,
        (70 + rng() * 130) * scale * (1 - 0.3 * (p / n)),
        1,
        birth,
      );
      if (lat && !lite && rng() < 0.5) {
        const ci = 2 + Math.floor(rng() * Math.max(1, lat.dx.length - 4));
        grow(
          lat.dx[ci],
          lat.y[ci],
          rng() < 0.5 ? 1 : -1,
          (30 + rng() * 60) * scale,
          2,
          Math.min(0.85, birth + 0.1),
        );
      }
    }

    // microbes
    const bacs: VBac[] = [];
    const bacN = lite ? 5 : 10;
    for (let k = 0; k < bacN; k++) {
      const bi = Math.floor(rng() * branches.length);
      const br = branches[bi];
      const p = 1 + Math.floor(rng() * (br.dx.length - 2));
      const ang = rng() * TAU;
      const off = (5 + rng() * 10) * scale;
      bacs.push({
        b: bi,
        p,
        ox: Math.cos(ang) * off,
        oy: Math.sin(ang) * off,
        birth: Math.max(br.birth + 0.12, 0.34) + rng() * 0.15,
        tint: Math.floor(rng() * 3) as Tint,
        rod: rng() < 0.65,
        ang: rng() * Math.PI,
        ph: rng() * TAU,
        size: 0.75 + rng() * 0.6,
      });
    }

    // mycorrhizal hyphae
    const hyph: VHypha[] = [];
    const hyN = lite ? 3 : 5;
    for (let k = 0; k < hyN; k++) {
      const br =
        branches[1 + Math.floor(rng() * Math.max(1, branches.length - 1))];
      const p = Math.max(1, br.dx.length - 1 - Math.floor(rng() * 3));
      const x0 = br.dx[p];
      const y0 = br.y[p];
      const dir = rng() < 0.5 ? -1 : 1;
      const x1 = clamp(x0 + dir * (40 + rng() * 90) * scale, uMin, uMax);
      const y1 = y0 + (rng() - 0.3) * 60 * scale;
      hyph.push({
        x0,
        y0,
        cx: (x0 + x1) / 2 + (rng() - 0.5) * 30 * scale,
        cy: (y0 + y1) / 2 + (rng() - 0.5) * 30 * scale,
        x1,
        y1,
        birth: 0.55 + rng() * 0.25,
        ph: rng(),
      });
    }

    // shoot
    const leafMax = clamp(zoneOuter * 0.36, 40, 86);
    const leaves: VLeaf[] = [
      {
        t: 0.07,
        dir: 1,
        ang: 1.35,
        len: leafMax * 0.38,
        ph: rng() * TAU,
        birth: 0.4,
      },
      {
        t: 0.07,
        dir: -1,
        ang: 1.35,
        len: leafMax * 0.38,
        ph: rng() * TAU,
        birth: 0.42,
      },
    ];
    const nL = lite ? 3 : 4 + Math.floor(rng() * 3);
    let d: 1 | -1 = rng() < 0.5 ? 1 : -1;
    for (let k = 0; k < nL; k++) {
      const t = 0.28 + 0.66 * (k / Math.max(1, nL - 1));
      leaves.push({
        t,
        dir: d,
        ang: 0.7 + rng() * 0.5,
        len:
          leafMax *
          (0.55 + 0.45 * Math.sin(Math.PI * clamp(t * 0.9 + 0.1, 0, 1))) *
          (0.85 + rng() * 0.3),
        ph: rng() * TAU,
        birth: 0.46 + 0.42 * t,
      });
      d = d === 1 ? -1 : 1;
    }
    leaves.push({
      t: 1,
      dir: d,
      ang: 0.18,
      len: leafMax * 0.4,
      ph: rng() * TAU,
      birth: 0.86,
    });

    return {
      i,
      side,
      gu,
      gy,
      seedY,
      seedSz: (9 + rng() * 3) * scale,
      seedAng: rng() * Math.PI,
      branches,
      bacs,
      hyph,
      hs: clamp(zoneOuter * 1.1, 120, 250) * (0.85 + rng() * 0.3),
      lean: (rng() - 0.5) * zoneOuter * 0.14,
      bend: (rng() - 0.5) * zoneOuter * 0.1,
      leaves,
      flower: rng() < 0.65,
      ph: rng(),
    };
  };

  const getVig = (i: number) => {
    let v = vigCache.get(i);
    if (!v) {
      v = buildVig(i);
      vigCache.set(i, v);
      if (vigCache.size > 14) {
        for (const k of [...vigCache.keys()]) {
          if (Math.abs(k - i) > 5) vigCache.delete(k);
        }
      }
    }
    return v;
  };

  const maturity = (i: number) =>
    vigCount <= 1 ? 0.55 : 0.02 + 0.98 * Math.pow(i / (vigCount - 1), 0.9);

  const tracePart = (ctx: CanvasRenderingContext2D, cnt: number) => {
    ctx.beginPath();
    ctx.moveTo(tx[0], ty[0]);
    for (let i = 1; i < cnt; i++) {
      ctx.quadraticCurveTo(
        tx[i - 1],
        ty[i - 1],
        (tx[i - 1] + tx[i]) * 0.5,
        (ty[i - 1] + ty[i]) * 0.5,
      );
    }
    ctx.lineTo(tx[cnt - 1], ty[cnt - 1]);
  };

  const fillPart = (
    b: VBranch,
    f: number,
    X: (dx: number) => number,
    gyS: number,
  ) => {
    const n = b.y.length;
    const fp = f * (n - 1);
    const k = Math.min(n - 1, Math.floor(fp));
    const fr = fp - k;
    let c = 0;
    for (let j = 0; j <= k; j++) {
      tx[c] = X(b.dx[j]);
      ty[c] = gyS + b.y[j];
      c++;
    }
    if (k < n - 1 && fr > 0) {
      tx[c] = X(b.dx[k] + (b.dx[k + 1] - b.dx[k]) * fr);
      ty[c] = gyS + b.y[k] + (b.y[k + 1] - b.y[k]) * fr;
      c++;
    }
    return c;
  };

  const drawVig = (v: Vig, env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, viewportH, pal } = env;
    const gyS = v.gy - scrollY;
    if (gyS - (v.hs + 90 * scale) > viewportH || gyS + 460 * scale < 0) return;
    if (!leafSprite || !warmGlow) return;

    const reveal = smooth(viewportH * 0.98, viewportH * 0.42, gyS);
    const me = maturity(v.i) * reveal;
    const al = intro * smooth(viewportH * 1.08, viewportH * 0.8, gyS) * pal.k;
    if (al < 0.01) return;
    const sgn = v.side === 0 ? 1 : -1;
    const X = (dx: number) => edgeX(w, v.side, v.gu + dx);
    const mainCol = mixRGB(pal.pri, pal.pist, 0.22);
    const latCol = mixRGB(pal.pist, pal.pri, 0.35);

    // ground line + little mound
    const lx0 = X(-zoneOuter * 0.42);
    const lx1 = X(zoneOuter * 0.42);
    const gl = ctx.createLinearGradient(lx0, 0, lx1, 0);
    const gc = mixRGB(pal.pri, pal.pist, 0.3);
    gl.addColorStop(0, rgba(gc, 0));
    gl.addColorStop(0.5, rgba(gc, 0.4));
    gl.addColorStop(1, rgba(gc, 0));
    ctx.globalAlpha = al;
    ctx.strokeStyle = gl;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(lx0, gyS);
    ctx.quadraticCurveTo((lx0 + lx1) / 2, gyS + 3 * scale, lx1, gyS);
    ctx.stroke();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // roots: glow pass then crisp pass
    const parts: { b: VBranch; f: number }[] = [];
    for (const b of v.branches) {
      const f = smooth(b.birth, b.birth + b.span, me);
      if (f > 0.001) parts.push({ b, f });
    }
    ctx.globalCompositeOperation = pal.blend;
    for (const { b, f } of parts) {
      const c = fillPart(b, f, X, gyS);
      if (c < 2) continue;
      tracePart(ctx, c);
      ctx.globalAlpha = al;
      ctx.strokeStyle = rgba(
        b.depth === 2 ? pal.pist : pal.pri,
        b.depth === 0 ? 0.13 : 0.08,
      );
      ctx.lineWidth = (b.depth === 0 ? 5 : b.depth === 1 ? 3 : 2) * scale;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    for (const { b, f } of parts) {
      const c = fillPart(b, f, X, gyS);
      if (c < 2) continue;
      tracePart(ctx, c);
      ctx.globalAlpha = al;
      ctx.strokeStyle = rgba(
        b.depth === 0 ? mainCol : b.depth === 1 ? latCol : pal.pri,
        b.depth === 0 ? 0.62 : b.depth === 1 ? 0.42 : 0.3,
      );
      ctx.lineWidth =
        (b.depth === 0 ? 1.9 : b.depth === 1 ? 1.0 : 0.65) * scale;
      ctx.stroke();
    }

    // root hairs (one batched path)
    ctx.beginPath();
    for (const { b, f } of parts) {
      const c = fillPart(b, f, X, gyS);
      for (let j = 1; j < c - 1; j++) {
        const h = b.hair[j];
        if (!h) continue;
        const dx = tx[j + 1] - tx[j - 1];
        const dy = ty[j + 1] - ty[j - 1];
        const tl = Math.hypot(dx, dy) || 1;
        const nx = (-dy / tl) * Math.sign(h);
        const ny = (dx / tl) * Math.sign(h);
        const hl = Math.abs(h);
        ctx.moveTo(tx[j], ty[j]);
        ctx.lineTo(tx[j] + nx * hl, ty[j] + ny * hl);
      }
    }
    ctx.globalAlpha = al * 0.9;
    ctx.strokeStyle = rgba(pal.pist, 0.26);
    ctx.lineWidth = 0.6 * scale;
    ctx.stroke();

    // growing tips glow
    ctx.globalCompositeOperation = pal.blend;
    for (const { b, f } of parts) {
      if (f > 0.98) continue;
      const n = b.y.length;
      const fp = f * (n - 1);
      const k = Math.min(n - 2, Math.floor(fp));
      const fr = fp - k;
      const x = X(b.dx[k] + (b.dx[k + 1] - b.dx[k]) * fr);
      const y = gyS + b.y[k] + (b.y[k + 1] - b.y[k]) * fr;
      spr(ctx, glow[2], x, y, 10 * scale, al * 0.8);
    }

    // hyphae (mycorrhizal threads) with exchange pulses
    for (const h of v.hyph) {
      const a = smooth(h.birth, h.birth + 0.15, me);
      if (a < 0.02) continue;
      const x0 = X(h.x0);
      const y0 = gyS + h.y0;
      const x1 = X(h.x1);
      const y1 = gyS + h.y1;
      const cx = X(h.cx);
      const cyy = gyS + h.cy;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = al * a * 0.9;
      ctx.strokeStyle = rgba(pal.pist, 0.3);
      ctx.lineWidth = 0.7 * scale;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cyy, x1, y1);
      ctx.stroke();
      ctx.globalCompositeOperation = pal.blend;
      spr(ctx, glow[2], x1, y1, 8 * scale, al * a * 0.6);
      const q = frac(clock * 0.14 + h.ph);
      const mt = 1 - q;
      const px = mt * mt * x0 + 2 * mt * q * cx + q * q * x1;
      const py = mt * mt * y0 + 2 * mt * q * cyy + q * q * y1;
      spr(
        ctx,
        glow[1],
        px,
        py,
        7 * scale,
        al * a * Math.sin(Math.PI * q) * 0.9,
      );
    }

    // microbes
    for (const m of v.bacs) {
      const a = smooth(m.birth, m.birth + 0.1, me);
      if (a < 0.02) continue;
      const b = v.branches[m.b];
      const f = smooth(b.birth, b.birth + b.span, me);
      if (f * (b.dx.length - 1) < m.p + 0.5) continue;
      const x = X(b.dx[m.p] + m.ox + Math.sin(clock * 0.4 + m.ph) * 5);
      const y = gyS + b.y[m.p] + m.oy + Math.cos(clock * 0.33 + m.ph) * 4;
      ctx.globalCompositeOperation = "source-over";
      if (m.rod) {
        const dw = 15 * scale * m.size;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(m.ang + Math.sin(clock * 0.5 + m.ph) * 0.5);
        ctx.globalAlpha = Math.min(1, al * a * 0.9);
        ctx.drawImage(rods[m.tint], -dw / 2, -dw / 4, dw, dw / 2);
        ctx.restore();
      } else {
        spr(ctx, glow[m.tint], x, y, 11 * scale * m.size, al * a * 0.9);
      }
    }

    // the seed
    {
      const sx = X(0);
      const sy = gyS + v.seedY;
      const sz = v.seedSz;
      const crack = smooth(0.1, 0.25, me);
      const open = smooth(0.1, 0.3, me);
      const seedCol = mixRGB(pal.pist, [200, 150, 90], 0.6);
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(v.seedAng);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 1.25 * (1 + 0.15 * open), sz * 0.8, 0, 0, TAU);
      ctx.globalAlpha = al * (0.85 - 0.3 * smooth(0.45, 0.8, me));
      ctx.fillStyle = rgba(seedCol, 0.6);
      ctx.fill();
      ctx.strokeStyle = rgba(mixRGB(seedCol, WHITE, 0.4), 0.75);
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
      if (crack > 0.02) {
        ctx.globalAlpha = al * crack;
        ctx.strokeStyle = rgba(mixRGB(pal.pist, WHITE, 0.5), 0.9);
        ctx.lineWidth = 0.9 * scale;
        ctx.beginPath();
        ctx.moveTo(-sz * 1.0, -sz * 0.1);
        ctx.lineTo(-sz * 0.45, -sz * 0.3);
        ctx.lineTo(-sz * 0.1, sz * 0.15);
        ctx.lineTo(sz * 0.4, -sz * 0.2);
        ctx.lineTo(sz * 0.95, sz * 0.05);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalCompositeOperation = pal.blend;
      spr(
        ctx,
        glow[2],
        sx,
        sy,
        sz * (3 + 4 * smooth(0.1, 0.4, me)),
        al *
          (0.25 +
            0.4 * smooth(0.08, 0.3, me) +
            0.08 * Math.sin(clock * 1.2 + v.ph * TAU)),
      );
    }

    // the shoot
    const sh = smooth(0.38, 0.96, me) * v.hs;
    if (sh > 2) {
      const stemAt = (t: number, out: { x: number; y: number }) => {
        const sway =
          Math.sin(clock * 0.55 + t * 2.4 + v.ph * 6) * 3.2 * scale * t * t;
        out.x = X(v.lean * t + v.bend * Math.sin(Math.PI * t)) + sway;
        out.y = gyS - sh * t;
      };
      const p = { x: 0, y: 0 };
      for (let j = 0; j <= NS; j++) {
        stemAt(j / NS, p);
        stX[j] = p.x;
        stY[j] = p.y;
      }
      const ribbon = (kw: number) => {
        ctx.beginPath();
        for (let pass = 0; pass < 2; pass++) {
          const from = pass === 0 ? 0 : NS;
          const to = pass === 0 ? NS : 0;
          const step = pass === 0 ? 1 : -1;
          for (let j = from; j !== to + step; j += step) {
            const a = Math.max(0, j - 1);
            const b = Math.min(NS, j + 1);
            const dx = stX[b] - stX[a];
            const dy = stY[b] - stY[a];
            const l = Math.hypot(dx, dy) || 1;
            const hw =
              (1.9 - 1.0 * (j / NS)) * scale * kw * (pass === 0 ? 1 : -1);
            const px = stX[j] + (-dy / l) * hw;
            const py = stY[j] + (dx / l) * hw;
            if (pass === 0 && j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
      };
      ctx.globalCompositeOperation = pal.blend;
      ctx.globalAlpha = al * 0.12;
      ribbon(2.6);
      ctx.fillStyle = rgba(pal.pri, 1);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = al * 0.62;
      ribbon(1);
      ctx.fillStyle = rgba(mixRGB(pal.pri, pal.pist, 0.4), 1);
      ctx.fill();

      for (const lf of v.leaves) {
        const gs = easeOut(smooth(lf.birth, lf.birth + 0.14, me));
        if (gs <= 0.01) continue;
        stemAt(lf.t, p);
        const a =
          lf.ang +
          Math.sin(clock * 0.7 + lf.ph) * 0.07 +
          0.05 * gs +
          (1 - gs) * 0.5;
        const rot = Math.atan2(-Math.cos(a), sgn * lf.dir * Math.sin(a));
        const len = lf.len * gs;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);
        ctx.scale(len / 176, len / 176);
        ctx.globalAlpha = Math.min(1, 0.85 * al);
        ctx.drawImage(leafSprite, -8, -48);
        ctx.restore();
      }

      // flower + pollen at the top of a mature plant
      const fl = smooth(0.9, 1, me);
      if (v.flower && fl > 0.02) {
        stemAt(1, p);
        ctx.globalCompositeOperation = pal.blend;
        spr(ctx, warmGlow, p.x, p.y - 4 * scale, 30 * scale, al * fl * 0.7);
        ctx.globalCompositeOperation = "source-over";
        const warm = mixRGB(pal.pist, [255, 205, 120], 0.55);
        ctx.globalAlpha = al * fl * 0.85;
        ctx.fillStyle = rgba(warm, 1);
        for (let k = 0; k < 5; k++) {
          const aa = (k / 5) * TAU + clock * 0.2;
          ctx.beginPath();
          ctx.arc(
            p.x + Math.cos(aa) * 4.2 * scale,
            p.y - 4 * scale + Math.sin(aa) * 4.2 * scale,
            2.2 * scale,
            0,
            TAU,
          );
          ctx.fill();
        }
        ctx.fillStyle = rgba(pal.pist, 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4 * scale, 2 * scale, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = pal.blend;
        for (let k = 0; k < 4; k++) {
          const ph = v.ph * 9 + k * 1.7;
          spr(
            ctx,
            warmGlow,
            p.x + Math.sin(clock * 0.4 + ph) * 30 * scale,
            p.y - 22 * scale + Math.cos(clock * 0.33 + ph) * 18 * scale,
            (6 + 3 * k) * scale,
            al * fl * (0.35 + 0.35 * Math.sin(clock * 1.5 + ph)),
          );
        }
      }
    }

    // nutrient pulse: root → seed → up the stem
    if (me > 0.5) {
      const a = smooth(0.5, 0.65, me);
      const prim = v.branches[0];
      const n = prim.y.length - 1;
      const q = frac(clock * 0.1 + v.ph);
      ctx.globalCompositeOperation = pal.blend;
      for (let j = 0; j < 3; j++) {
        const qq = clamp(q - j * 0.02, 0, 1);
        let px: number;
        let py: number;
        if (qq < 0.5) {
          const s = (1 - qq / 0.5) * n;
          const k = Math.min(n - 1, Math.floor(s));
          const fr = s - k;
          px = X(prim.dx[k] + (prim.dx[k + 1] - prim.dx[k]) * fr);
          py = gyS + prim.y[k] + (prim.y[k + 1] - prim.y[k]) * fr;
        } else {
          const t = (qq - 0.5) / 0.5;
          const shs = smooth(0.38, 0.96, me) * v.hs;
          px = X(v.lean * t + v.bend * Math.sin(Math.PI * t));
          py = gyS - shs * t;
        }
        spr(ctx, glow[1], px, py, (13 - j * 3) * scale, al * a * TAIL[j] * 0.9);
      }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  /* ---------------- skeleton dynamics ---------------- */

  const drawUnder = (seg: Segment, env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, viewportH, pal } = env;
    const top = seg.index * SEG_H - scrollY;
    if (top > viewportH + PAD || top + SEG_H < -PAD) return;
    const k = pal.k * intro * (0.4 + 0.6 * seg.mY);
    const segTopW = seg.index * SEG_H;
    ctx.globalCompositeOperation = pal.blend;

    for (const br of seg.branches) {
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
          const a = k * gf(u) * e * TAIL[j] * 0.85 * skelVis(segTopW + y);
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
      if (br.depth !== 0) continue;
      const base = br.ph - clock * PULSE_SPEED;
      let y = base + Math.ceil((segTopW - 40 - base) / PULSE_GAP) * PULSE_GAP;
      for (; y < segTopW + SEG_H; y += PULSE_GAP) {
        for (let j = 0; j < 4; j++) {
          const yl = y + j * 9 * scale - segTopW;
          if (yl < 0 || yl >= SEG_H) continue;
          let lo = 0;
          let hi = br.y.length - 1;
          while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (br.y[mid] <= yl) lo = mid;
            else hi = mid;
          }
          const f = (yl - br.y[lo]) / Math.max(1e-3, br.y[hi] - br.y[lo]);
          const u = br.u[lo] + (br.u[hi] - br.u[lo]) * f;
          const a = k * gf(u) * TAIL[j] * skelVis(segTopW + yl);
          if (a < 0.02) continue;
          const sy = top + yl;
          if (sy < -20 || sy > viewportH + 20) continue;
          spr(ctx, glow[1], edgeX(w, br.side, u), sy, (13 - j * 2) * scale, a);
        }
      }
    }

    for (const b of seg.bacteria) {
      const u = b.u + Math.sin(clock * 0.4 + b.ph) * 7;
      const y = top + b.y + Math.cos(clock * 0.33 + b.ph) * 6;
      if (y < -30 || y > viewportH + 30) continue;
      const a = k * gf(u) * 0.85 * skelVis(segTopW + b.y);
      if (a < 0.03) continue;
      const x = edgeX(w, b.side, u);
      ctx.globalCompositeOperation = "source-over";
      if (b.rod) {
        const dw = 16 * scale * b.size;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(b.ang + Math.sin(clock * 0.5 + b.ph) * 0.5);
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(rods[b.tint], -dw / 2, -dw / 4, dw, dw / 2);
        ctx.restore();
      } else {
        spr(ctx, glow[b.tint], x, y, 12 * scale * b.size, a);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  /* ---------------- the final ecosystem ---------------- */

  const bakeEco = (env: BioEnv): Eco => {
    const pal = env.pal;
    const bd = Math.min(env.dpr, 1.25);
    const cw = Math.ceil(width * bd);
    const ch = Math.ceil(ecoH * bd);
    const mk = () => {
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const g = c.getContext("2d")!;
      g.setTransform(cw / width, 0, 0, ch / ecoH, 0, 0);
      g.lineCap = "round";
      g.lineJoin = "round";
      return { c, g };
    };
    const { c: cv, g } = mk();
    const { c: barkCv, g: bk } = mk();
    const rng = mulberry32(hash32(worldSeed ^ 0x6e63a1d5));
    const gl = ecoH * 0.55;
    const tSide: Side = rng() < 0.5 ? 0 : 1;
    const treeX = edgeX(width, tSide, width * (0.14 + rng() * 0.08));
    const sunX = edgeX(
      width,
      tSide === 0 ? 1 : 0,
      width * (0.12 + rng() * 0.1),
    );
    const sunY = gl * (0.28 + rng() * 0.1);
    const warm = mixRGB(pal.pist, [255, 205, 120], 0.55);
    const mainCol = mixRGB(pal.pri, pal.pist, 0.22);
    const sc = scale;

    // The radial sun glow is baked into a separate canvas with top bleed.
    // This prevents the ecosystem canvas edge from cutting the soft halo.
    const skyBleed = width * 0.5;
    const skyCv = document.createElement("canvas");
    skyCv.width = cw;
    skyCv.height = Math.ceil((ecoH + skyBleed) * bd);
    const sg = skyCv.getContext("2d")!;
    sg.setTransform(bd, 0, 0, bd, 0, skyBleed * bd);
    sg.globalCompositeOperation = pal.blend;
    const sky = sg.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.5);
    sky.addColorStop(0, rgba(warm, pal.dark ? 0.34 : 0.26));
    sky.addColorStop(0.4, rgba(warm, 0.1));
    sky.addColorStop(1, rgba(warm, 0));
    sg.fillStyle = sky;
    sg.fillRect(0, -skyBleed, width, ecoH + skyBleed);

    // Match the ecosystem's horizontal gutter fade, without a hard edge.
    const skyMask = sg.createLinearGradient(0, 0, width, 0);
    skyMask.addColorStop(0, "rgba(0,0,0,1)");
    skyMask.addColorStop(0.2, "rgba(0,0,0,1)");
    skyMask.addColorStop(0.45, "rgba(0,0,0,0.1)");
    skyMask.addColorStop(0.55, "rgba(0,0,0,0.1)");
    skyMask.addColorStop(0.8, "rgba(0,0,0,1)");
    skyMask.addColorStop(1, "rgba(0,0,0,1)");
    sg.globalCompositeOperation = "destination-in";
    sg.fillStyle = skyMask;
    sg.fillRect(0, -skyBleed, width, ecoH + skyBleed);
    sg.globalCompositeOperation = "source-over";

    // Light beams remain part of the ecosystem artwork.
    g.globalCompositeOperation = pal.blend;
    for (let k = 0; k < 3; k++) {
      const bx = width * (0.3 + k * 0.14 + rng() * 0.05);
      const bw = width * (0.04 + rng() * 0.03);
      const bg = g.createLinearGradient(sunX, sunY, bx, gl);
      bg.addColorStop(0, rgba(warm, 0.1));
      bg.addColorStop(1, rgba(warm, 0));
      g.fillStyle = bg;
      g.beginPath();
      g.moveTo(sunX, sunY);
      g.lineTo(bx - bw, gl);
      g.lineTo(bx + bw, gl);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = "source-over";

    // rolling hills
    for (let k = 1; k >= 0; k--) {
      const ph = rng() * 6;
      g.beginPath();
      g.moveTo(0, ecoH);
      for (let x = 0; x <= width + 24; x += 24) {
        const y =
          gl -
          (16 + k * 30) * sc -
          (Math.sin(x * 0.004 + ph) * 16 + Math.sin(x * 0.011 + ph * 2) * 8) *
            sc;
        g.lineTo(x, y);
      }
      g.lineTo(width, ecoH);
      g.closePath();
      const hg = g.createLinearGradient(0, gl - 80 * sc, 0, gl);
      hg.addColorStop(
        0,
        rgba(mixRGB(pal.pri, pal.pist, k * 0.4), 0.14 - k * 0.04),
      );
      hg.addColorStop(1, rgba(pal.pri, 0.03));
      g.fillStyle = hg;
      g.fill();
    }

    // soil + ground line
    const soil = g.createLinearGradient(0, gl, 0, ecoH);
    soil.addColorStop(0, rgba(pal.pri, 0.1));
    soil.addColorStop(1, rgba(pal.pri, 0.03));
    g.fillStyle = soil;
    g.fillRect(0, gl, width, ecoH - gl);
    g.strokeStyle = rgba(mixRGB(pal.pri, pal.pist, 0.3), 0.4);
    g.lineWidth = 1.3 * sc;
    g.beginPath();
    g.moveTo(0, gl);
    for (let x = 0; x <= width + 30; x += 30) {
      g.lineTo(
        x,
        gl + Math.sin(x * 0.03) * 1.6 * sc + Math.sin(x * 0.09 + 1) * 0.8 * sc,
      );
    }
    g.stroke();

    // grass
    const grassN = lite ? 40 : 90;
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (let i = 0; i < grassN / 2; i++) {
        const gx = rng() * width;
        for (let b = 0; b < 4; b++) {
          const lean = (rng() - 0.5) * 12;
          const hgt = (8 + rng() * 17) * sc;
          g.moveTo(gx + b * 2, gl + 1);
          g.quadraticCurveTo(
            gx + b * 2 + lean * 0.3,
            gl - hgt * 0.6,
            gx + b * 2 + lean,
            gl - hgt,
          );
        }
      }
      g.strokeStyle = rgba(pass ? pal.pri : pal.pist, pass ? 0.3 : 0.42);
      g.lineWidth = 0.9 * sc;
      g.stroke();
    }

    // roots of the great tree
    interface R {
      x: number[];
      y: number[];
      d: number;
      wd: number;
    }
    const roots: R[] = [];
    const maxR = lite ? 2 : 3;
    const root = (
      x: number,
      y: number,
      a: number,
      len: number,
      wd: number,
      depth: number,
    ) => {
      const n = Math.max(4, Math.round(len / 12));
      const xs = [x];
      const ys = [y];
      let cx = x;
      let cy = y;
      let ca = a;
      for (let i = 0; i < n; i++) {
        ca = ca * 0.97 + (rng() - 0.5) * 0.34;
        cx += (Math.sin(ca) * len) / n;
        cy += (Math.cos(ca) * len) / n;
        if (cy > ecoH - 6 || cx < 4 || cx > width - 4) break;
        xs.push(cx);
        ys.push(cy);
        if (depth < maxR && i >= 2 && i < n - 1 && rng() < 0.2) {
          root(
            cx,
            cy,
            ca + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.6),
            len * (0.5 + rng() * 0.2),
            wd * 0.6,
            depth + 1,
          );
        }
      }
      if (xs.length > 2) roots.push({ x: xs, y: ys, d: depth, wd });
    };
    root(treeX, gl + 4, (rng() - 0.5) * 0.2, ecoH * 0.4, 3.4 * sc, 0);
    const latN = lite ? 4 : 7;
    for (let k = 0; k < latN; k++) {
      const a = (k % 2 ? 1 : -1) * (0.9 + rng() * 0.45);
      root(
        treeX,
        gl + 6 + rng() * 14 * sc,
        a,
        width * (0.12 + rng() * 0.12),
        2.6 * sc,
        1,
      );
    }

    // saplings + mushrooms (bases double as mycorrhizal link targets)
    const bases: [number, number][] = [];
    const awayFromTree = () => {
      let x = rng() * width;
      let guard = 0;
      while (Math.abs(x - treeX) < width * 0.1 && guard++ < 8)
        x = rng() * width;
      return x;
    };
    const saplings = lite ? 2 : 4;
    for (let i = 0; i < saplings; i++) {
      const sx = awayFromTree();
      const hgt = (28 + rng() * 32) * sc;
      const lean = (rng() - 0.5) * 8 * sc;
      g.strokeStyle = rgba(mixRGB(pal.pri, pal.pist, 0.4), 0.7);
      g.lineWidth = 1.5 * sc;
      g.beginPath();
      g.moveTo(sx, gl + 1);
      g.quadraticCurveTo(sx + lean * 0.2, gl - hgt * 0.5, sx + lean, gl - hgt);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const t = 0.35 + k * 0.3;
        const ang = (k % 2 ? 1 : -1) * (0.9 + rng() * 0.5);
        const len = (16 + rng() * 10) * sc;
        g.save();
        g.translate(sx + lean * t * t, gl - hgt * t);
        g.rotate(Math.atan2(-Math.cos(ang), Math.sin(ang)));
        g.scale(len / 176, len / 176);
        g.globalAlpha = 0.85;
        g.drawImage(leafSprite!, -8, -48);
        g.restore();
      }
      g.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        root(sx, gl + 3, (k - 1) * 0.6, (24 + rng() * 22) * sc, 1.4 * sc, 2);
      }
      bases.push([sx, gl + 4]);
    }
    const capCol = mixRGB(pal.pist, [235, 150, 120], 0.55);
    const mushN = lite ? 3 : 6;
    for (let i = 0; i < mushN; i++) {
      const mx = i < 3 ? treeX + (rng() - 0.5) * width * 0.26 : awayFromTree();
      const s = (5 + rng() * 7) * sc;
      g.globalCompositeOperation = pal.blend;
      g.drawImage(warmGlow!, mx - s * 2.2, gl - s * 2.2, s * 4.4, s * 4.4);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = rgba(mixRGB(pal.pist, WHITE, 0.55), 0.7);
      g.fillRect(mx - s * 0.22, gl - s * 0.9, s * 0.44, s * 0.9);
      g.beginPath();
      g.ellipse(mx, gl - s * 0.9, s * 0.85, s * 0.6, 0, Math.PI, TAU);
      g.closePath();
      g.fillStyle = rgba(capCol, 0.72);
      g.fill();
      g.fillStyle = rgba(WHITE, 0.55);
      g.beginPath();
      g.arc(mx - s * 0.3, gl - s * 1.25, s * 0.1, 0, TAU);
      g.arc(mx + s * 0.25, gl - s * 1.1, s * 0.08, 0, TAU);
      g.fill();
      bases.push([mx, gl + 2]);
    }

    // flowers
    for (let i = 0; i < (lite ? 5 : 10); i++) {
      const fx = rng() * width;
      const hgt = (10 + rng() * 14) * sc;
      g.strokeStyle = rgba(pal.pist, 0.6);
      g.lineWidth = 1 * sc;
      g.beginPath();
      g.moveTo(fx, gl);
      g.lineTo(fx + (rng() - 0.5) * 3, gl - hgt);
      g.stroke();
      const fc: RGB = rng() < 0.5 ? warm : mixRGB(pal.sec, WHITE, 0.5);
      g.fillStyle = rgba(fc, 0.85);
      for (let k = 0; k < 5; k++) {
        const aa = (k / 5) * TAU;
        g.beginPath();
        g.arc(
          fx + Math.cos(aa) * 2.4 * sc,
          gl - hgt + Math.sin(aa) * 2.4 * sc,
          1.6 * sc,
          0,
          TAU,
        );
        g.fill();
      }
    }

    // draw the roots (glow + core) and hairs
    g.globalCompositeOperation = pal.blend;
    for (const r of roots) {
      g.beginPath();
      g.moveTo(r.x[0], r.y[0]);
      for (let i = 1; i < r.x.length; i++) {
        g.quadraticCurveTo(
          r.x[i - 1],
          r.y[i - 1],
          (r.x[i - 1] + r.x[i]) / 2,
          (r.y[i - 1] + r.y[i]) / 2,
        );
      }
      g.strokeStyle = rgba(pal.pri, 0.1);
      g.lineWidth = r.wd * 2.8;
      g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    for (const r of roots) {
      g.beginPath();
      g.moveTo(r.x[0], r.y[0]);
      for (let i = 1; i < r.x.length; i++) {
        g.quadraticCurveTo(
          r.x[i - 1],
          r.y[i - 1],
          (r.x[i - 1] + r.x[i]) / 2,
          (r.y[i - 1] + r.y[i]) / 2,
        );
      }
      g.strokeStyle = rgba(mainCol, r.d === 0 ? 0.62 : r.d === 1 ? 0.5 : 0.36);
      g.lineWidth = r.wd;
      g.stroke();
    }
    g.beginPath();
    for (const r of roots) {
      if (r.d < 1) continue;
      for (let i = 1; i < r.x.length - 1; i += 2) {
        const dx = r.x[i + 1] - r.x[i - 1];
        const dy = r.y[i + 1] - r.y[i - 1];
        const tl = Math.hypot(dx, dy) || 1;
        const sg = rng() < 0.5 ? -1 : 1;
        const hl = (4 + rng() * 8) * sc;
        g.moveTo(r.x[i], r.y[i]);
        g.lineTo(r.x[i] + (-dy / tl) * sg * hl, r.y[i] + (dx / tl) * sg * hl);
      }
    }
    g.strokeStyle = rgba(pal.pist, 0.24);
    g.lineWidth = 0.6 * sc;
    g.stroke();

    // mycorrhizal network: tips ↔ saplings / mushrooms
    const paths: Eco["paths"] = [];
    const tips = roots.filter((r) => r.d >= 2).slice(0, lite ? 8 : 16);
    g.strokeStyle = rgba(pal.pist, 0.24);
    g.lineWidth = 0.7 * sc;
    for (let i = 0; i < tips.length; i++) {
      const t = tips[i];
      const x0 = t.x[t.x.length - 1];
      const y0 = t.y[t.y.length - 1];
      let best = bases[0];
      let bd2 = Infinity;
      for (const b of bases) {
        const d2 = (b[0] - x0) ** 2 + (b[1] - y0) ** 2;
        if (d2 < bd2) {
          bd2 = d2;
          best = b;
        }
      }
      let x1: number;
      let y1: number;
      if (best && bd2 < (width * 0.4) ** 2) {
        x1 = best[0];
        y1 = best[1];
      } else {
        const o = tips[(i + 3) % tips.length];
        x1 = o.x[o.x.length - 1];
        y1 = o.y[o.y.length - 1];
      }
      const cx = (x0 + x1) / 2 + (rng() - 0.5) * 30;
      const cy = Math.max(gl + 6, (y0 + y1) / 2 + 14 * sc);
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, x1, y1);
      g.stroke();
      g.globalCompositeOperation = pal.blend;
      g.drawImage(glow[2], x0 - 4 * sc, y0 - 4 * sc, 8 * sc, 8 * sc);
      g.globalCompositeOperation = "source-over";
      if (paths.length < 10) {
        const px: number[] = [];
        const py: number[] = [];
        for (let k = 0; k <= 12; k++) {
          const q = k / 12;
          const m = 1 - q;
          px.push(m * m * x0 + 2 * m * q * cx + q * q * x1);
          py.push(m * m * y0 + 2 * m * q * cy + q * q * y1);
        }
        paths.push({ x: px, y: py, dir: rng() < 0.5 ? 1 : -1, ph: rng() });
      }
    }
    for (const r of roots.filter((q) => q.d === 1).slice(0, 4)) {
      paths.push({ x: r.x, y: r.y, dir: -1, ph: rng() });
    }

    // microbes along the roots + nodules
    const bacPool = roots.filter((r) => r.d >= 1);
    for (let i = 0; i < (lite ? 16 : 38) && bacPool.length; i++) {
      const r = bacPool[Math.floor(rng() * bacPool.length)];
      const p = Math.floor(rng() * r.x.length);
      const x = r.x[p] + (rng() - 0.5) * 16 * sc;
      const y = r.y[p] + (rng() - 0.5) * 16 * sc;
      const tint = Math.floor(rng() * 3);
      if (rng() < 0.6) {
        const dw = (11 + rng() * 6) * sc;
        g.save();
        g.translate(x, y);
        g.rotate(rng() * Math.PI);
        g.globalAlpha = 0.85;
        g.drawImage(rods[tint], -dw / 2, -dw / 4, dw, dw / 2);
        g.restore();
        g.globalAlpha = 1;
      } else {
        g.globalCompositeOperation = pal.blend;
        g.drawImage(glow[tint], x - 5 * sc, y - 5 * sc, 10 * sc, 10 * sc);
        g.globalCompositeOperation = "source-over";
      }
    }
    g.globalCompositeOperation = pal.blend;
    for (let i = 0; i < 10 && bacPool.length; i++) {
      const r = bacPool[Math.floor(rng() * bacPool.length)];
      const p = Math.floor(rng() * r.x.length);
      g.globalAlpha = 0.7;
      g.drawImage(glow[0], r.x[p] - 6 * sc, r.y[p] - 6 * sc, 12 * sc, 12 * sc);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";

    // the great tree (bark on its own layer → no alpha beads)
    const bark = pal.dark
      ? mixRGB(pal.pri, [150, 110, 70], 0.55)
      : mixRGB(pal.pri, [90, 60, 40], 0.5);
    bk.strokeStyle = rgba(bark, 1);
    const tips2: [number, number][] = [];
    const maxD = lite ? 4 : 5;
    const branch = (
      x: number,
      y: number,
      ang: number,
      len: number,
      wd: number,
      depth: number,
    ) => {
      const n = Math.max(3, Math.round(len / 14));
      let cx = x;
      let cy = y;
      let a = ang;
      for (let i = 0; i < n; i++) {
        a += (rng() - 0.5) * 0.32;
        const nx = cx + (Math.sin(a) * len) / n;
        const ny = cy - (Math.cos(a) * len) / n;
        bk.lineWidth = Math.max(0.8, wd * (1 - (i / n) * 0.55));
        bk.beginPath();
        bk.moveTo(cx, cy);
        bk.lineTo(nx, ny);
        bk.stroke();
        cx = nx;
        cy = ny;
        if (depth < maxD && i >= 1 && i < n - 1 && rng() < 0.18) {
          branch(
            cx,
            cy,
            a + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.5),
            len * (0.55 + rng() * 0.2),
            wd * 0.58,
            depth + 1,
          );
        }
      }
      if (depth < maxD) {
        branch(
          cx,
          cy,
          a - 0.45 - rng() * 0.3,
          len * 0.72,
          wd * 0.62,
          depth + 1,
        );
        branch(
          cx,
          cy,
          a + 0.45 + rng() * 0.3,
          len * 0.72,
          wd * 0.62,
          depth + 1,
        );
      } else {
        tips2.push([cx, cy]);
      }
    };
    branch(treeX, gl + 2, (rng() - 0.5) * 0.12, gl * 0.3, 11 * sc, 0);
    g.globalAlpha = 0.78;
    g.drawImage(barkCv, 0, 0, width, ecoH);
    g.globalAlpha = 1;

    // canopy: glow, leaves, blossoms
    g.globalCompositeOperation = pal.blend;
    for (let i = 0; i < tips2.length; i += 2) {
      const s = (90 + rng() * 50) * sc;
      g.globalAlpha = 0.08;
      g.drawImage(
        glow[i % 2 ? 0 : 2],
        tips2[i][0] - s / 2,
        tips2[i][1] - s / 2,
        s,
        s,
      );
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    const per = lite ? 3 : 5;
    for (const [px, py] of tips2) {
      for (let k = 0; k < per; k++) {
        const len = (20 + rng() * 22) * sc;
        g.save();
        g.translate(px + (rng() - 0.5) * 14 * sc, py + (rng() - 0.5) * 14 * sc);
        g.rotate(rng() * TAU);
        g.scale(len / 176, len / 176);
        g.globalAlpha = 0.6;
        g.drawImage(leafSprite!, -8, -48);
        g.restore();
      }
    }
    g.globalAlpha = 1;
    for (let i = 0; i < Math.min(10, tips2.length); i++) {
      const [px, py] = tips2[Math.floor(rng() * tips2.length)];
      g.globalCompositeOperation = pal.blend;
      g.drawImage(warmGlow!, px - 7 * sc, py - 7 * sc, 14 * sc, 14 * sc);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = rgba(warm, 0.9);
      g.beginPath();
      g.arc(px, py, 2.4 * sc, 0, TAU);
      g.fill();
    }

    // gutters solid, centre ghost-faint so the text stays clean
    // Using a very smooth gradient to prevent any visible vertical hard cuts.
    const m = g.createLinearGradient(0, 0, width, 0);
    m.addColorStop(0, "rgba(0,0,0,1)");
    m.addColorStop(0.2, "rgba(0,0,0,1)");
    m.addColorStop(0.45, "rgba(0,0,0,0.1)");
    m.addColorStop(0.55, "rgba(0,0,0,0.1)");
    m.addColorStop(0.8, "rgba(0,0,0,1)");
    m.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = m;
    g.fillRect(0, 0, width, ecoH);
    g.globalCompositeOperation = "source-over";

    const flies: Fly[] = [];
    for (let i = 0; i < (lite ? 8 : 16); i++) {
      flies.push({
        x0: rng() * width,
        y0: gl * (0.25 + rng() * 0.65),
        ax: 20 + rng() * 50,
        ay: 12 + rng() * 30,
        sp: 0.25 + rng() * 0.4,
        ph: rng() * TAU,
        a: 0.45 + rng() * 0.45,
        size: (7 + rng() * 9) * sc,
      });
    }
    return { cv, sky: skyCv, skyBleed, paths, flies, sunX, sunY };
  };

  const drawEco = (env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, viewportH, pal } = env;
    const top = ecoTop - scrollY;
    // The sun halo begins above ecoTop, so include its bleed in visibility checks.
    const skyBleed = width * 0.5;
    if (top - skyBleed > viewportH || top + ecoH < 0) return;
    const reveal = smooth(0, 1, (scrollY + viewportH - ecoTop) / (ecoH * 0.9));
    if (reveal <= 0.01 || !warmGlow) return;
    if (!eco) eco = bakeEco(env);
    const oy = top + (1 - reveal) * 46 * scale;
    ctx.globalAlpha = intro * reveal;
    // Draw the extended halo first; its extra top area removes the visible
    // horizontal cut where the ecosystem scene itself begins.
    ctx.drawImage(eco.sky, 0, oy - eco.skyBleed, w, ecoH + eco.skyBleed);
    ctx.drawImage(eco.cv, 0, oy, w, ecoH);

    ctx.globalCompositeOperation = pal.blend;
    spr(
      ctx,
      warmGlow,
      eco.sunX,
      oy + eco.sunY,
      w * 0.5,
      0.06 * pal.k * intro * reveal * (0.8 + 0.2 * Math.sin(clock * 0.3)),
    );
    for (const p of eco.paths) {
      const q = frac(clock * 0.06 + p.ph);
      const e = Math.sin(Math.PI * q);
      const nn = p.x.length - 1;
      for (let j = 0; j < 3; j++) {
        const s = clamp((p.dir > 0 ? q : 1 - q) + j * 0.03 * -p.dir, 0, 1);
        const f = s * nn;
        const i = Math.min(nn - 1, Math.floor(f));
        const fr = f - i;
        const x = p.x[i] + (p.x[i + 1] - p.x[i]) * fr;
        const y = p.y[i] + (p.y[i + 1] - p.y[i]) * fr;
        spr(
          ctx,
          glow[1],
          x,
          oy + y,
          (10 - j * 2) * scale,
          pal.k * intro * reveal * e * TAIL[j] * 0.85,
        );
      }
    }
    for (const f of eco.flies) {
      const x = f.x0 + Math.sin(clock * f.sp + f.ph) * f.ax;
      const y = f.y0 + Math.cos(clock * f.sp * 0.8 + f.ph) * f.ay;
      const tw = 0.5 + 0.5 * Math.sin(clock * 1.6 + f.ph * 3);
      spr(ctx, warmGlow, x, oy + y, f.size, pal.k * intro * reveal * f.a * tw);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  /* ---------------- engine hooks ---------------- */

  const resize = (env: BioEnv) => {
    const prevEcoTop = ecoTop;
    const geometryChanged =
      Math.abs(width - env.w) > 0.5 ||
      Math.abs(scale - env.scale) > 0.001 ||
      Math.abs(vh - env.viewportH) > 0.5 ||
      lite !== env.lite ||
      zoneOuter === 0;

    width = env.w;
    vh = env.viewportH;
    scale = env.scale;
    lite = env.lite;
    worldHeight = Math.max(env.viewportH, env.h);
    segmentCount = Math.max(1, Math.ceil(worldHeight / SEG_H));
    rootCount = lite ? 1 : 2;
    zone = env.w * (lite ? 0.13 : 0.17);
    zoneOuter = zone + env.w * 0.04;
    ecoH = clamp(vh * 0.78, 440, 700);
    ecoTop = worldHeight - ecoH;
    yG = ecoTop + ecoH * 0.55;
    gy0 = Math.round(clamp(vh * 0.36, 230, 360));
    GAP = 820 * scale;
    vigCount = Math.max(1, Math.floor((ecoTop - 300 * scale - gy0) / GAP) + 1);
    parity = hash32(worldSeed ^ 0x1234567) & 1;

    if (geometryChanged) {
      cache.clear();
      vigCache.clear();
      eco = null;
    } else if (Math.abs(prevEcoTop - ecoTop) > 0.5) {
      // page height changed: the skeleton's sky-mask and the ecosystem anchor move
      for (const seg of cache.values()) seg.baked = null;
    }
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
    for (const seg of cache.values()) seg.baked = null;
    eco = null;
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

  const draw = (env: BioEnv) => {
    if (!glow.length || !rods.length || !leafSprite) return;
    const { ctx, w, scrollY, viewportH } = env;
    const intro = smooth(0, 1.2, clock);
    const [first, last] = visibleRange(env);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // 1) baked lifeline skeleton: 2 blits per segment
    ctx.globalAlpha = intro;
    for (let i = first; i <= last; i++) {
      const seg = get(i);
      if (!seg) continue;
      const top = i * SEG_H - scrollY;
      if (top - PAD > viewportH || top + SEG_H + PAD < 0) continue;
      if (!seg.baked) seg.baked = bake(seg, env);
      const half = seg.baked.width / 2;
      ctx.drawImage(
        seg.baked,
        0,
        0,
        half,
        seg.baked.height,
        0,
        top - PAD,
        zoneOuter,
        SEG_H + 2 * PAD,
      );
      ctx.drawImage(
        seg.baked,
        half,
        0,
        half,
        seg.baked.height,
        w - zoneOuter,
        top - PAD,
        zoneOuter,
        SEG_H + 2 * PAD,
      );
    }
    ctx.globalAlpha = 1;
    for (let i = first; i <= last; i++) {
      const seg = get(i);
      if (seg) drawUnder(seg, env, intro);
    }

    // 2) growing vignettes (scroll-scrubbed)
    const lo = Math.max(0, Math.floor((scrollY - gy0 - 480 * scale) / GAP) - 1);
    const hi = Math.min(
      vigCount - 1,
      Math.ceil((scrollY + viewportH - gy0 + 320 * scale) / GAP),
    );
    for (let i = lo; i <= hi; i++) drawVig(getVig(i), env, intro);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();

    // 3) the ecosystem, anchored to the real bottom of the world
    drawEco(env, intro);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  return { resize, theme, step, draw, settle };
};

/* =========================================================
   Component
========================================================= */

export const AboutSeedBackground = ({
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

export default AboutSeedBackground;
