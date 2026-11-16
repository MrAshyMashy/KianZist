"use client";

/* =========================================================
   Contact page — "Leaf · Flower · Fruit"
   A clean, molecular-botanical gutter scene.
   ---------------------------------------------------------
   - Shared Usebiocanvas viewport engine (useBioCanvas).
   - NO rings, NO stems, NO roots. Only three organs, drawn as
     fine line-art with cellular / molecular details:
       • LEAF   – procedural outline (ovate / lanceolate / broad /
                  lobed), midrib, curved lateral veins, stomata
                  (guard-cell pairs), sugar pulses flowing to the base.
       • FLOWER – 5-8 petals in 1–2 whorls, petal veins, pistil,
                  stamens with anthers, drifting pollen grains.
       • FRUIT  – berry clusters (calyx star + seed) or a round fruit
                  cross-section (skin, locules, seeds, flesh cells).
     plus tiny chlorophyll-like pigment molecules, photons and O₂ bubbles.
   - Scroll drives everything:
       · organs unfurl / bloom / ripen as they travel up the screen
       · page depth decides the story: leaves everywhere → flowers in
         the middle → fruit towards the end
       · at the very bottom of the page a bigger finale blooms:
         an open flower with leaves on one side, a fruit cross-section
         with berries on the other, and rising pollen / seed sparks.
   - Everything is generated from a fresh seed per page visit and is
     stretched to the real content height (endless, never repeats).
   - Everything lives in the left / right gutters with a soft inner fade.
   - Off <768px, lite on tablets, reduced-motion, pause when hidden:
     all inherited from the engine.
========================================================= */

import type { RefObject } from "react";
import {
  type BioEnv,
  type BioScene,
  type RGB,
  TAU,
  clamp,
  makeGlowSprite,
  mixRGB,
  mulberry32,
  rgba,
  smooth,
  useBioCanvas,
} from "../shared/Usebiocanvas";

const SEG_H = 1100;
const MAX_CACHED = 10;
const LEAF_N = 20; // outline resolution (per side)
const LEAF_M = 10; // midrib resolution
// sprite / colour indices: 0 primary (green) · 1 secondary (blue) · 2 pistachio · 3 teal

/* ---------------- types ---------------- */

interface Leaf {
  x: number;
  y: number;
  ang: number;
  L: number;
  r: number;
  rank: number;
  phase: number;
  tint: number;
  outline: number[];
  mid: number[];
  veins: number[]; // ax, ay, cx, cy, ex, ey …
  stomata: number[]; // x, y, angle …
}

interface Flower {
  x: number;
  y: number;
  R: number;
  r: number;
  n: number;
  two: boolean;
  pw: number;
  pp: number;
  rot: number;
  rotSpeed: number;
  phase: number;
  rank: number;
  tint: number;
  anthers: number[]; // angle, length-fraction …
  pollen: number[]; // angle, spread, speed, phase …
}

interface Fruit {
  x: number;
  y: number;
  r: number;
  size: number;
  kind: 0 | 1; // 0 berry cluster · 1 cross-section
  rank: number;
  phase: number;
  rot: number;
  m: number[];
  berries: number[]; // dx, dy, radius, angle …
  segs: number;
  seeds: number[]; // angle-jitter, dist, size …
  cells: number[]; // angle, dist …
}

interface Pigment {
  x: number;
  y: number;
  S: number;
  r: number;
  rank: number;
  phase: number;
  rot: number;
  rotSpeed: number;
  tint: number;
}

interface Mote {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  rank: number;
  tint: number;
  kind: 0 | 1; // 0 photon · 1 bubble
}

interface Segment {
  index: number;
  leaves: Leaf[];
  flowers: Flower[];
  fruits: Fruit[];
  pigments: Pigment[];
  motes: Mote[];
}

interface Spark {
  sx: number;
  phase: number;
  speed: number;
  size: number;
  tint: number;
  travel: number;
}

interface Finale {
  y: number;
  R: number;
  top: number;
  leaves: Leaf[];
  flowers: Flower[];
  fruits: Fruit[];
  sparks: Spark[];
}

/* ---------------- helpers ---------------- */

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

const win = (d: number, a: number, b: number, c: number, e: number) =>
  smooth(a, b, d) * (1 - smooth(c, e, d));

/** rank-thinned visibility: low-rank elements appear first on the fade-in */
const thin = (rank: number, v: number) =>
  smooth(rank * 0.6, rank * 0.6 + 0.4, v) * v;

// scratch buffer for the wobbly fruit skin (no per-frame allocation)
const blobX = new Float32Array(16);
const blobY = new Float32Array(16);

const blobPath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  m: number[],
  t: number,
) => {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = R * (m[i] + 0.012 * Math.sin(t + i * 1.7));
    blobX[i] = cx + Math.cos(a) * r;
    blobY[i] = cy + Math.sin(a) * r;
  }
  ctx.beginPath();
  ctx.moveTo((blobX[n - 1] + blobX[0]) / 2, (blobY[n - 1] + blobY[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(
      blobX[i],
      blobY[i],
      (blobX[i] + blobX[j]) / 2,
      (blobY[i] + blobY[j]) / 2,
    );
  }
  ctx.closePath();
};

/** one petal as a closed bezier shape, pointing along angle `a` */
const petal = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  Lp: number,
  Wp: number,
  pp: number,
) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const q = Lp * (0.55 + 0.3 * pp);
  const k = Wp * (1 - 0.45 * pp);
  const a1 = Lp * 0.22;
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x + a1 * c + Wp * s,
    y + a1 * s - Wp * c,
    x + q * c + k * s,
    y + q * s - k * c,
    x + Lp * c,
    y + Lp * s,
  );
  ctx.bezierCurveTo(
    x + q * c - k * s,
    y + q * s + k * c,
    x + a1 * c - Wp * s,
    y + a1 * s + Wp * c,
    x,
    y,
  );
};

/* ---------------- organ generators ---------------- */

const makeLeaf = (rng: () => number, x: number, y: number, L: number): Leaf => {
  const kind = Math.floor(rng() * 4); // ovate · lanceolate · broad · lobed
  const W = L * [0.44, 0.24, 0.56, 0.42][kind] * (0.85 + rng() * 0.3);
  const pa = [1, 0.9, 0.72, 1.05][kind] + (rng() - 0.5) * 0.16;
  const pw = [0.85, 0.65, 0.95, 0.8][kind];
  const lobes = kind === 3 ? 3 + Math.floor(rng() * 2) : 0;
  const lp = rng() * TAU;
  const bend = (rng() - 0.5) * 0.4 * L;
  const asym = 0.88 + rng() * 0.24;

  const prof = (t: number) => {
    let h = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, pa))), pw);
    if (lobes) h *= 0.78 + 0.22 * Math.cos(lobes * TAU * t + lp);
    return h;
  };
  const pt = (t: number, s: number, k = 1): [number, number] => [
    (t - 0.5) * L,
    bend * (t * t - 0.33) + s * 0.5 * W * prof(t) * k * (s > 0 ? 1 : asym),
  ];

  const outline: number[] = [];
  for (let i = 0; i <= LEAF_N; i++) {
    const p = pt(i / LEAF_N, 1);
    outline.push(p[0], p[1]);
  }
  for (let i = LEAF_N - 1; i >= 1; i--) {
    const p = pt(i / LEAF_N, -1);
    outline.push(p[0], p[1]);
  }

  const mid: number[] = [];
  for (let i = 0; i <= LEAF_M; i++) {
    const p = pt(i / LEAF_M, 0);
    mid.push(p[0], p[1]);
  }

  const veins: number[] = [];
  const nv = 5 + Math.floor(rng() * 3);
  for (let k = 0; k < nv; k++) {
    const t0 = 0.1 + (0.68 * (k + 0.5)) / nv;
    const t1 = Math.min(0.96, t0 + 0.16 + rng() * 0.06);
    for (const s of [1, -1]) {
      const a = pt(t0, 0);
      const c = pt((t0 + t1) / 2, s, 0.3);
      const e = pt(t1, s, 0.9);
      veins.push(a[0], a[1], c[0], c[1], e[0], e[1]);
    }
  }

  const stomata: number[] = [];
  const ns = 6 + Math.floor(rng() * 4);
  for (let k = 0; k < ns; k++) {
    const t = 0.18 + rng() * 0.62;
    const s = rng() < 0.5 ? 1 : -1;
    const p = pt(t, s, rng() * 0.7);
    stomata.push(p[0], p[1], rng() * Math.PI);
  }

  return {
    x,
    y,
    ang: rng() * TAU,
    L,
    r: L * 0.52,
    rank: rng(),
    phase: rng() * TAU,
    tint: rng() < 0.55 ? 0 : rng() < 0.6 ? 3 : 1,
    outline,
    mid,
    veins,
    stomata,
  };
};

const makeFlower = (
  rng: () => number,
  x: number,
  y: number,
  R: number,
): Flower => {
  const m = 8 + Math.floor(rng() * 6);
  const anthers: number[] = [];
  for (let j = 0; j < m; j++) {
    anthers.push((j / m) * TAU + (rng() - 0.5) * 0.3, 0.28 + rng() * 0.2);
  }
  const pollen: number[] = [];
  for (let j = 0; j < 8; j++) {
    pollen.push(rng() * TAU, 0.6 + rng() * 0.9, 0.04 + rng() * 0.06, rng());
  }
  return {
    x,
    y,
    R,
    r: R * 1.05,
    n: 5 + Math.floor(rng() * 4),
    two: rng() < 0.6,
    pw: 0.34 + rng() * 0.22,
    pp: rng(),
    rot: rng() * TAU,
    rotSpeed: (rng() - 0.5) * 0.06,
    phase: rng() * TAU,
    rank: rng(),
    tint: rng() < 0.45 ? 1 : rng() < 0.6 ? 3 : 0,
    anthers,
    pollen,
  };
};

/** kind 0: `size` = berry radius · kind 1: `size` = fruit radius */
const makeFruit = (
  rng: () => number,
  x: number,
  y: number,
  size: number,
  kind: 0 | 1,
): Fruit => {
  const berries: number[] = [];
  const seeds: number[] = [];
  const cells: number[] = [];
  const segs = 5 + Math.floor(rng() * 4);

  if (kind === 0) {
    berries.push(0, 0, size, rng() * TAU);
    const nB = 5 + Math.floor(rng() * 4);
    let tries = 0;
    while (berries.length / 4 < nB && tries < 90) {
      tries++;
      const a = rng() * TAU;
      const dd = size * (1.5 + rng() * 1.3);
      const dx = Math.cos(a) * dd;
      const dy = Math.sin(a) * dd;
      const r = size * (0.78 + rng() * 0.3);
      let ok = true;
      for (let i = 0; i < berries.length; i += 4) {
        if (
          Math.hypot(dx - berries[i], dy - berries[i + 1]) <
          r + berries[i + 2] - 2
        ) {
          ok = false;
          break;
        }
      }
      if (ok) berries.push(dx, dy, r, rng() * TAU);
    }
  } else {
    for (let i = 0; i < segs; i++) {
      seeds.push((rng() - 0.5) * 0.18, 0.44 + rng() * 0.12, 0.8 + rng() * 0.4);
    }
    for (let i = 0; i < 18; i++) cells.push(rng() * TAU, 0.2 + rng() * 0.62);
  }

  return {
    x,
    y,
    r: kind === 0 ? size * 3.1 : size * 1.05,
    size,
    kind,
    rank: rng(),
    phase: rng() * TAU,
    rot: rng() * TAU,
    m: Array.from({ length: 12 }, () => 0.94 + rng() * 0.12),
    berries,
    segs,
    seeds,
    cells,
  };
};

const makePigment = (
  rng: () => number,
  x: number,
  y: number,
  S: number,
): Pigment => ({
  x,
  y,
  S,
  r: S * 2.4,
  rank: rng(),
  phase: rng() * TAU,
  rot: rng() * TAU,
  rotSpeed: (rng() - 0.5) * 0.1,
  tint: Math.floor(rng() * 3),
});

/* ---------------- scene ---------------- */

const createScene = (): BioScene => {
  // One seed per mounted page visit. Height changes never replace it.
  const worldSeed = freshSeed();
  const cache = new Map<number, Segment>();

  let worldHeight = 1;
  let segmentCount = 1;
  let width = 0;
  let scale = 1;
  let lite = false;
  let zoneOuter = 0;
  let unitK = 1; // size unit: viewport scale × gutter width
  let clock = 0; // seconds
  let endP = 0; // 0 → 1 as the scroll reaches the page end
  let finale: Finale | null = null;
  let glow: HTMLCanvasElement[] = [];
  let cols: RGB[] = [];

  const depthAt = (wy: number) => clamp(wy / Math.max(1, worldHeight), 0, 1);

  const segmentRandom = (index: number) =>
    mulberry32(hash32(worldSeed ^ Math.imul(index + 1, 0x9e3779b1)));

  /** growth driven by the element's position on screen (scroll-linked) */
  const growAt = (wy: number, env: BioEnv, a: number, b: number) =>
    smooth(a, b, (wy - env.scrollY) / env.viewportH - endP * 0.5);

  /** regular organs fade out where the finale will sit */
  const gate = (wy: number) =>
    finale ? 1 - endP * smooth(finale.top - 60, finale.top + 40, wy) : 1;

  /* ---------------- segment generation ---------------- */

  const buildSegment = (index: number, env: BioEnv): Segment => {
    const rng = segmentRandom(index);
    const lt = env.lite;
    const w = env.w;

    const leaves: Leaf[] = [];
    const flowers: Flower[] = [];
    const fruits: Fruit[] = [];
    const pigments: Pigment[] = [];
    const motes: Mote[] = [];

    for (const side of [0, 1] as const) {
      const edge = (u: number) => (side === 0 ? u : w - u);
      const placed: Array<{ u: number; y: number; r: number }> = [];

      // collision-free placement inside the gutter
      const place = (r: number): [number, number] | null => {
        const rr = Math.min(r, zoneOuter * 0.36);
        const uMin = rr + 6;
        const uMax = Math.max(uMin + 1, zoneOuter * 0.82 - rr);
        for (let t = 0; t < 40; t++) {
          const u = uMin + rng() * (uMax - uMin);
          const y = rr + rng() * Math.max(1, SEG_H - 2 * rr);
          if (
            placed.every((p) => Math.hypot(p.u - u, p.y - y) >= p.r + rr + 4)
          ) {
            placed.push({ u, y, r: rr });
            return [edge(u), y];
          }
        }
        return null;
      };

      /* flowers */
      const nF = lt ? 1 : 1 + (rng() < 0.45 ? 1 : 0);
      for (let i = 0; i < nF; i++) {
        const R = (30 + rng() * 16) * unitK;
        const p = place(R * 1.05);
        if (p) flowers.push(makeFlower(rng, p[0], p[1], R));
      }

      /* fruit */
      const nFr = lt ? 1 : 2;
      for (let i = 0; i < nFr; i++) {
        const kind: 0 | 1 = rng() < 0.5 ? 0 : 1;
        const size =
          kind === 0 ? (9 + rng() * 5) * unitK : (20 + rng() * 10) * unitK;
        const p = place(kind === 0 ? size * 3.1 : size * 1.05);
        if (p) fruits.push(makeFruit(rng, p[0], p[1], size, kind));
      }

      /* leaves */
      const nL = lt ? 2 : 4;
      for (let i = 0; i < nL; i++) {
        const L = Math.min((84 + rng() * 70) * unitK, zoneOuter * 0.66);
        const p = place(L * 0.52);
        if (p) leaves.push(makeLeaf(rng, p[0], p[1], L));
      }

      /* pigment molecules */
      for (let i = 0; i < 2; i++) {
        const S = (8 + rng() * 5) * unitK;
        const p = place(S * 2.4);
        if (p) pigments.push(makePigment(rng, p[0], p[1], S));
      }

      /* photons + O₂ bubbles */
      const nMotes = lt ? 5 : 9;
      for (let q = 0; q < nMotes; q++) {
        const kind: 0 | 1 = rng() < 0.4 ? 1 : 0;
        motes.push({
          x: edge(6 + rng() * zoneOuter * 0.8),
          y: rng() * SEG_H,
          size: (kind === 1 ? 5 + rng() * 6 : 4 + rng() * 7) * scale,
          speed: 4 + rng() * 10,
          phase: rng() * TAU,
          rank: rng(),
          tint: kind === 1 ? 3 : Math.floor(rng() * 4),
          kind,
        });
      }
    }

    return { index, leaves, flowers, fruits, pigments, motes };
  };

  const buildFinale = (): Finale => {
    const rng = mulberry32(hash32(worldSeed ^ 0x51ed270b));
    const R = clamp(zoneOuter * 0.28, 46, 104);
    const y = worldHeight - R * 1.55 - 18;
    const lx = zoneOuter * 0.46;
    const rx = width - zoneOuter * 0.46;

    const flower = makeFlower(rng, lx, y, R);
    flower.two = true;
    flower.n = Math.max(flower.n, 6);

    const leaves = [
      makeLeaf(rng, lx + R * 0.1, y - R * 2.1, R * 1.8),
      makeLeaf(rng, rx - R * 0.05, y - R * 3.4, R * 1.5),
    ];
    const fruits = [
      makeFruit(rng, rx, y, R * 0.78, 1),
      makeFruit(rng, width - zoneOuter * 0.5, y - R * 1.95, R * 0.2, 0),
    ];

    const sparks: Spark[] = [];
    const travel = R * 3.2;
    for (let side = 0; side < 2; side++) {
      const cx = side === 0 ? lx : rx;
      for (let q = 0; q < 12; q++) {
        sparks.push({
          sx: cx + (rng() - 0.5) * zoneOuter * 0.7,
          phase: rng(),
          speed: 0.03 + rng() * 0.04,
          size: (4 + rng() * 6) * scale,
          tint: side === 0 ? (rng() < 0.6 ? 2 : 3) : rng() < 0.5 ? 1 : 3,
          travel,
        });
      }
    }

    return {
      y,
      R,
      top: y - R * 3.9,
      leaves,
      flowers: [flower],
      fruits,
      sparks,
    };
  };

  const getSegment = (index: number, env: BioEnv) => {
    if (index < 0 || index >= segmentCount) return null;
    let seg = cache.get(index);
    if (!seg) {
      seg = buildSegment(index, env);
      cache.set(index, seg);
    }
    return seg;
  };

  const pruneCache = (center: number) => {
    if (cache.size <= MAX_CACHED) return;
    const keys = Array.from(cache.keys()).sort(
      (a, b) => Math.abs(b - center) - Math.abs(a - center),
    );
    while (cache.size > MAX_CACHED && keys.length) cache.delete(keys.shift()!);
  };

  const visibleRange = (env: BioEnv): [number, number] => {
    const margin = Math.ceil(zoneOuter * 1.5) + 120;
    const first = Math.max(0, Math.floor((env.scrollY - margin) / SEG_H));
    const last = Math.min(
      segmentCount - 1,
      Math.floor((env.scrollY + env.viewportH + margin) / SEG_H),
    );
    return [first, last];
  };

  /* ---------------- drawing pieces ---------------- */

  const drawLeaf = (lf: Leaf, env: BioEnv, A: number, g: number) => {
    if (g < 0.04) return;
    const { ctx, pal } = env;
    const sc = env.scale;
    const col = cols[lf.tint];
    const Aa = A * (0.3 + 0.7 * g);
    const inv = 1 / g; // keeps line widths constant while the leaf unfurls

    ctx.save();
    ctx.translate(lf.x, lf.y);
    ctx.rotate(
      lf.ang + Math.sin(clock * 0.35 + lf.phase * 6) * 0.05 + (1 - g) * 0.6,
    );
    ctx.scale(g, g);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // blade
    const o = lf.outline;
    ctx.beginPath();
    ctx.moveTo(o[0], o[1]);
    for (let i = 2; i < o.length; i += 2) ctx.lineTo(o[i], o[i + 1]);
    ctx.closePath();
    ctx.fillStyle = rgba(col, 0.06 * Aa);
    ctx.fill();
    ctx.lineWidth = 3.2 * sc * inv;
    ctx.strokeStyle = rgba(col, 0.08 * Aa);
    ctx.stroke();
    ctx.lineWidth = 1.1 * sc * inv;
    ctx.strokeStyle = rgba(col, 0.58 * Aa);
    ctx.stroke();

    // lateral veins
    const v = lf.veins;
    ctx.beginPath();
    for (let i = 0; i < v.length; i += 6) {
      ctx.moveTo(v[i], v[i + 1]);
      ctx.quadraticCurveTo(v[i + 2], v[i + 3], v[i + 4], v[i + 5]);
    }
    ctx.lineWidth = 0.8 * sc * inv;
    ctx.strokeStyle = rgba(col, 0.36 * Aa);
    ctx.stroke();

    // midrib
    const m = lf.mid;
    ctx.beginPath();
    ctx.moveTo(m[0], m[1]);
    for (let i = 2; i < m.length; i += 2) ctx.lineTo(m[i], m[i + 1]);
    ctx.lineWidth = 1.3 * sc * inv;
    ctx.strokeStyle = rgba(col, 0.6 * Aa);
    ctx.stroke();

    // stomata (guard-cell pairs)
    const st = lf.stomata;
    ctx.beginPath();
    for (let i = 0; i < st.length; i += 3) {
      const rx = 2.8 * sc;
      const ry = 1.6 * sc;
      ctx.moveTo(st[i] + rx, st[i + 1]);
      ctx.ellipse(st[i], st[i + 1], rx, ry, st[i + 2], 0, TAU);
    }
    ctx.lineWidth = 0.8 * sc * inv;
    ctx.strokeStyle = rgba(pal.pist, 0.5 * Aa);
    ctx.stroke();

    // sugar pulses travelling tip → base along the midrib
    const gs = (8 * sc) / g;
    for (let q = 0; q < 2; q++) {
      const f = (clock * 0.12 + lf.phase + q * 0.5) % 1;
      const pos = (1 - f) * LEAF_M;
      const i0 = Math.min(LEAF_M - 1, Math.floor(pos));
      const fr = pos - i0;
      const px = m[i0 * 2] + (m[i0 * 2 + 2] - m[i0 * 2]) * fr;
      const py = m[i0 * 2 + 1] + (m[i0 * 2 + 3] - m[i0 * 2 + 1]) * fr;
      ctx.globalAlpha = Math.min(1, 0.8 * Aa * Math.sin(f * Math.PI));
      ctx.drawImage(glow[3], px - gs / 2, py - gs / 2, gs, gs);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  };

  const drawFlower = (fl: Flower, env: BioEnv, A: number, o: number) => {
    if (o < 0.03) return;
    const { ctx, pal } = env;
    const sc = env.scale;
    const col = cols[fl.tint];
    const col2 = fl.tint === 3 ? cols[1] : cols[3];
    const { x, y } = fl;

    const gsz = fl.R * 4.4;
    ctx.globalAlpha = Math.min(1, 0.14 * A * (0.4 + 0.6 * o));
    ctx.drawImage(glow[fl.tint], x - gsz / 2, y - gsz / 2, gsz, gsz);
    ctx.globalAlpha = 1;

    const br = 1 + 0.025 * Math.sin(clock * 0.8 + fl.phase);
    const Lp = fl.R * (0.3 + 0.7 * o) * br;
    const Wp = Lp * fl.pw * (0.5 + 0.5 * o);
    const rot = fl.rot + clock * fl.rotSpeed + (1 - o) * 0.6;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const layers = fl.two ? 2 : 1;
    for (let l = 0; l < layers; l++) {
      const k = l ? 0.6 : 1;
      const off = l ? Math.PI / fl.n : 0;
      const c = l ? col2 : col;

      ctx.beginPath();
      for (let i = 0; i < fl.n; i++) {
        petal(ctx, x, y, rot + off + (i * TAU) / fl.n, Lp * k, Wp * k, fl.pp);
      }
      ctx.fillStyle = rgba(c, (l ? 0.08 : 0.05) * A);
      ctx.fill();
      ctx.lineWidth = 1.1 * sc;
      ctx.strokeStyle = rgba(c, 0.58 * A);
      ctx.stroke();

      // petal veins
      ctx.beginPath();
      for (let i = 0; i < fl.n; i++) {
        const a = rot + off + (i * TAU) / fl.n;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        ctx.moveTo(x + ca * Lp * k * 0.14, y + sa * Lp * k * 0.14);
        ctx.lineTo(x + ca * Lp * k * 0.8, y + sa * Lp * k * 0.8);
      }
      ctx.lineWidth = 0.8 * sc;
      ctx.strokeStyle = rgba(c, 0.28 * A);
      ctx.stroke();
    }

    // stamens + anthers
    const cr = fl.R * 0.1 * (0.6 + 0.4 * o);
    const sv = smooth(0.35, 0.85, o);
    if (sv > 0.02) {
      const an = fl.anthers;
      ctx.beginPath();
      for (let j = 0; j < an.length; j += 2) {
        const a = rot + an[j] + Math.sin(clock * 0.6 + j) * 0.05;
        const len = fl.R * an[j + 1] * sv * br;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const ex = x + ca * len;
        const ey = y + sa * len;
        ctx.moveTo(x + ca * cr, y + sa * cr);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex + 2.1 * sc, ey);
        ctx.arc(ex, ey, 2.1 * sc, 0, TAU);
      }
      ctx.lineWidth = 0.9 * sc;
      ctx.strokeStyle = rgba(pal.pist, 0.6 * A * sv);
      ctx.stroke();
    }

    // pistil
    ctx.beginPath();
    ctx.arc(x, y, cr, 0, TAU);
    ctx.fillStyle = rgba(pal.sec, 0.3 * A);
    ctx.fill();
    ctx.lineWidth = 1.1 * sc;
    ctx.strokeStyle = rgba(pal.sec, 0.7 * A);
    ctx.stroke();

    // drifting pollen grains
    const pv = smooth(0.7, 1, o);
    if (pv > 0.02) {
      const ps = 5 * sc;
      const pl = fl.pollen;
      for (let j = 0; j < pl.length; j += 4) {
        const f = (clock * pl[j + 2] + pl[j + 3]) % 1;
        const a = pl[j] + f * 0.8;
        const dd = fl.R * (0.55 + pl[j + 1] * f * 1.1);
        ctx.globalAlpha = Math.min(1, 0.75 * A * pv * Math.sin(f * Math.PI));
        ctx.drawImage(
          glow[2],
          x + Math.cos(a) * dd - ps / 2,
          y + Math.sin(a) * dd - ps / 2,
          ps,
          ps,
        );
      }
      ctx.globalAlpha = 1;
    }
  };

  const drawFruit = (
    fr: Fruit,
    env: BioEnv,
    A: number,
    grow: number,
    ripe: number,
  ) => {
    if (grow < 0.04) return;
    const { ctx, pal } = env;
    const sc = env.scale;
    const gf = 0.55 + 0.45 * grow;
    const fc = mixRGB(pal.pri, pal.sec, ripe);
    const Aa = A * (0.35 + 0.65 * grow);
    const { x, y } = fr;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (fr.kind === 0) {
      /* ---- berry cluster ---- */
      const b = fr.berries;
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 4) {
        const bx = x + b[i] * gf;
        const by = y + b[i + 1] * gf;
        const br = b[i + 2] * gf;
        ctx.moveTo(bx + br, by);
        ctx.arc(bx, by, br, 0, TAU);
      }
      ctx.fillStyle = rgba(fc, (0.07 + 0.1 * ripe) * Aa);
      ctx.fill();
      ctx.lineWidth = 1.1 * sc;
      ctx.strokeStyle = rgba(fc, 0.58 * Aa);
      ctx.stroke();

      // highlight crescents
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 4) {
        const bx = x + b[i] * gf;
        const by = y + b[i + 1] * gf;
        const br = b[i + 2] * gf * 0.68;
        ctx.moveTo(
          bx + Math.cos(Math.PI * 1.1) * br,
          by + Math.sin(Math.PI * 1.1) * br,
        );
        ctx.arc(bx, by, br, Math.PI * 1.1, Math.PI * 1.55);
      }
      ctx.lineWidth = 0.8 * sc;
      ctx.strokeStyle = rgba(fc, 0.38 * Aa);
      ctx.stroke();

      // calyx star + seed
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 4) {
        const bx = x + b[i] * gf;
        const by = y + b[i + 1] * gf;
        const br = b[i + 2] * gf;
        const a0 = b[i + 3];
        const cx = bx + Math.cos(a0) * br * 0.74;
        const cy = by + Math.sin(a0) * br * 0.74;
        for (let q = 0; q < 5; q++) {
          const a = a0 + (q * TAU) / 5;
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + Math.cos(a) * br * 0.26,
            cy + Math.sin(a) * br * 0.26,
          );
        }
        ctx.moveTo(bx + br * 0.2, by);
        ctx.ellipse(bx, by, br * 0.2, br * 0.11, a0, 0, TAU);
      }
      ctx.lineWidth = 0.8 * sc;
      ctx.strokeStyle = rgba(pal.pist, 0.5 * Aa);
      ctx.stroke();

      // ripeness glow
      if (ripe > 0.2) {
        for (let i = 0; i < b.length; i += 4) {
          const s = b[i + 2] * gf * 3;
          ctx.globalAlpha = Math.min(1, 0.3 * Aa * ripe);
          ctx.drawImage(
            glow[1],
            x + b[i] * gf - s / 2,
            y + b[i + 1] * gf - s / 2,
            s,
            s,
          );
        }
        ctx.globalAlpha = 1;
      }
      return;
    }

    /* ---- round fruit cross-section ---- */
    const R = fr.size * gf;
    const rot = fr.rot + clock * 0.04;

    blobPath(ctx, x, y, R, fr.m, clock * 0.8 + fr.phase * 6);
    ctx.fillStyle = rgba(fc, (0.06 + 0.08 * ripe) * Aa);
    ctx.fill();
    ctx.lineWidth = 3 * sc;
    ctx.strokeStyle = rgba(fc, 0.1 * Aa);
    ctx.stroke();
    ctx.lineWidth = 1.1 * sc;
    ctx.strokeStyle = rgba(fc, 0.58 * Aa);
    ctx.stroke();

    // inner rind + locule walls
    ctx.beginPath();
    ctx.moveTo(x + R * 0.84, y);
    ctx.arc(x, y, R * 0.84, 0, TAU);
    for (let i = 0; i < fr.segs; i++) {
      const a = rot + (i * TAU) / fr.segs;
      ctx.moveTo(x + Math.cos(a) * R * 0.14, y + Math.sin(a) * R * 0.14);
      ctx.lineTo(x + Math.cos(a) * R * 0.84, y + Math.sin(a) * R * 0.84);
    }
    ctx.moveTo(x + R * 0.1, y);
    ctx.arc(x, y, R * 0.1, 0, TAU);
    ctx.lineWidth = 0.8 * sc;
    ctx.strokeStyle = rgba(fc, 0.32 * Aa);
    ctx.stroke();

    // flesh cells
    ctx.beginPath();
    const cl = fr.cells;
    for (let i = 0; i < cl.length; i += 2) {
      const a = rot + cl[i];
      const cx = x + Math.cos(a) * cl[i + 1] * R;
      const cy = y + Math.sin(a) * cl[i + 1] * R;
      ctx.moveTo(cx + 1.4 * sc, cy);
      ctx.arc(cx, cy, 1.4 * sc, 0, TAU);
    }
    ctx.lineWidth = 0.7 * sc;
    ctx.strokeStyle = rgba(fc, 0.38 * Aa);
    ctx.stroke();

    // seeds (one per locule)
    ctx.beginPath();
    const sd = fr.seeds;
    const half = Math.PI / fr.segs;
    const seedX: number[] = [];
    const seedY: number[] = [];
    for (let i = 0; i < fr.segs; i++) {
      const a = rot + (i * TAU) / fr.segs + half + sd[i * 3];
      const sx = x + Math.cos(a) * sd[i * 3 + 1] * R;
      const sy = y + Math.sin(a) * sd[i * 3 + 1] * R;
      const rx = R * 0.1 * sd[i * 3 + 2];
      ctx.moveTo(sx + rx, sy);
      ctx.ellipse(sx, sy, rx, rx * 0.58, a, 0, TAU);
      seedX.push(sx);
      seedY.push(sy);
    }
    ctx.lineWidth = 0.9 * sc;
    ctx.strokeStyle = rgba(pal.pist, 0.6 * Aa);
    ctx.stroke();

    if (ripe > 0.3) {
      const s = R * 0.55;
      for (let i = 0; i < seedX.length; i++) {
        ctx.globalAlpha = Math.min(1, 0.4 * Aa * ripe);
        ctx.drawImage(glow[2], seedX[i] - s / 2, seedY[i] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
  };

  const drawPigment = (pg: Pigment, env: BioEnv, A: number) => {
    const { ctx } = env;
    const sc = env.scale;
    const col = cols[pg.tint];
    const S = pg.S;
    const rr = S * 0.42;
    const rot = pg.rot + clock * pg.rotSpeed;
    const x = pg.x + Math.cos(clock * 0.4 + pg.phase) * 3;
    const y = pg.y + Math.sin(clock * 0.5 + pg.phase) * 4;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    // four pyrrole-like rings + bonds between them and to the centre
    for (let k = 0; k < 4; k++) {
      const a = rot + k * (TAU / 4) + Math.PI / 4;
      const px = x + Math.cos(a) * S;
      const py = y + Math.sin(a) * S;
      const b = a + TAU / 4;
      const qx = x + Math.cos(b) * S;
      const qy = y + Math.sin(b) * S;
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
      const dx = qx - px;
      const dy = qy - py;
      const dl = Math.hypot(dx, dy) || 1;
      ctx.moveTo(px + (dx / dl) * rr, py + (dy / dl) * rr);
      ctx.lineTo(qx - (dx / dl) * rr, qy - (dy / dl) * rr);
      ctx.moveTo(x + Math.cos(a) * S * 0.2, y + Math.sin(a) * S * 0.2);
      ctx.lineTo(x + Math.cos(a) * (S - rr), y + Math.sin(a) * (S - rr));
    }
    // phytol-like tail
    let tx = x + Math.cos(rot + Math.PI / 4) * (S + rr);
    let ty = y + Math.sin(rot + Math.PI / 4) * (S + rr);
    ctx.moveTo(tx, ty);
    for (let q = 0; q < 5; q++) {
      const a = rot + Math.PI / 4 + (q % 2 ? 0.55 : -0.55);
      tx += Math.cos(a) * S * 0.55;
      ty += Math.sin(a) * S * 0.55;
      ctx.lineTo(tx, ty);
    }
    ctx.lineWidth = 1 * sc;
    ctx.strokeStyle = rgba(col, 0.55 * A);
    ctx.stroke();

    // central atom
    const gs = S * 1.1;
    ctx.globalAlpha = Math.min(1, 0.6 * A);
    ctx.drawImage(glow[2], x - gs / 2, y - gs / 2, gs, gs);
    ctx.globalAlpha = 1;
  };

  const drawSegment = (seg: Segment, env: BioEnv, intro: number) => {
    const { ctx, pal, scrollY, viewportH } = env;
    const wt = seg.index * SEG_H;
    const vTop = scrollY - wt - 40;
    const vBot = scrollY + viewportH - wt + 40;

    ctx.save();
    ctx.translate(0, wt - scrollY);
    ctx.globalCompositeOperation = pal.blend;

    // leaves: everywhere, slowly thinning with depth
    for (const lf of seg.leaves) {
      if (lf.y + lf.r < vTop || lf.y - lf.r > vBot) continue;
      const wy = wt + lf.y;
      const d = depthAt(wy);
      const vis =
        thin(lf.rank, 1 - 0.5 * smooth(0.55, 1, d)) * intro * gate(wy);
      if (vis < 0.02) continue;
      drawLeaf(lf, env, vis * pal.k, growAt(wy, env, 1.0, 0.55));
    }

    // flowers: bloom in the middle of the page
    for (const fl of seg.flowers) {
      if (fl.y + fl.r < vTop || fl.y - fl.r > vBot) continue;
      const wy = wt + fl.y;
      const d = depthAt(wy);
      const vis =
        thin(fl.rank, win(d, 0.06, 0.26, 0.8, 0.97)) * intro * gate(wy);
      if (vis < 0.02) continue;
      drawFlower(fl, env, vis * pal.k, growAt(wy, env, 0.95, 0.4));
    }

    // fruit: more and riper towards the end
    for (const fr of seg.fruits) {
      if (fr.y + fr.r < vTop || fr.y - fr.r > vBot) continue;
      const wy = wt + fr.y;
      const d = depthAt(wy);
      const vis = thin(fr.rank, smooth(0.34, 0.6, d)) * intro * gate(wy);
      if (vis < 0.02) continue;
      const grow = growAt(wy, env, 1.0, 0.5);
      const ripe = clamp(
        growAt(wy, env, 0.85, 0.3) * (0.3 + 0.7 * smooth(0.3, 0.9, d)),
        0,
        1,
      );
      drawFruit(fr, env, vis * pal.k, grow, ripe);
    }

    // pigment molecules
    for (const pg of seg.pigments) {
      if (pg.y + pg.r < vTop || pg.y - pg.r > vBot) continue;
      const wy = wt + pg.y;
      const d = depthAt(wy);
      const vis = thin(pg.rank, 0.75 + 0.25 * d) * intro * gate(wy);
      if (vis < 0.02) continue;
      drawPigment(pg, env, vis * pal.k);
    }

    // photons + O₂ bubbles
    const span = SEG_H + 12;
    for (const m of seg.motes) {
      const y = ((((m.y - clock * m.speed) % span) + span) % span) - 6;
      if (y < vTop || y > vBot) continue;
      const wy = wt + y;
      const d = depthAt(wy);
      const vis =
        smooth(m.rank, m.rank + 0.2, 0.35 + 0.65 * d) * intro * gate(wy);
      if (vis < 0.02) continue;
      const size = m.size * (1 + 0.3 * d);
      const x = m.x + Math.sin(clock * 0.7 + m.phase) * 6;
      if (m.kind === 0) {
        ctx.globalAlpha = 0.34 * pal.k * vis;
        ctx.drawImage(glow[m.tint], x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 1;
      } else {
        const r = size * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.moveTo(
          x + Math.cos(Math.PI * 1.15) * r * 0.6,
          y + Math.sin(Math.PI * 1.15) * r * 0.6,
        );
        ctx.arc(x, y, r * 0.6, Math.PI * 1.15, Math.PI * 1.5);
        ctx.lineWidth = 0.9 * env.scale;
        ctx.strokeStyle = rgba(cols[m.tint], 0.5 * pal.k * vis);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  /** the bottom of the page: everything in full bloom */
  const drawFinale = (env: BioEnv, intro: number) => {
    if (!finale || endP < 0.02) return;
    const { ctx, pal, scrollY } = env;
    const f = finale;
    const vis = endP * intro;
    const bloom = smooth(0.1, 0.95, endP);
    const A = vis * pal.k;

    ctx.save();
    ctx.translate(0, -scrollY);
    ctx.globalCompositeOperation = pal.blend;

    // soft halos
    const hs = f.R * 6;
    ctx.globalAlpha = Math.min(1, 0.16 * A);
    ctx.drawImage(glow[3], f.flowers[0].x - hs / 2, f.y - hs / 2, hs, hs);
    ctx.drawImage(glow[1], f.fruits[0].x - hs / 2, f.y - hs / 2, hs, hs);
    ctx.globalAlpha = 1;

    for (const lf of f.leaves) drawLeaf(lf, env, A, bloom);
    for (const fl of f.flowers) drawFlower(fl, env, A, bloom);
    for (const fr of f.fruits) drawFruit(fr, env, A, bloom, bloom);

    // rising pollen / seed sparks
    for (const sp of f.sparks) {
      const t = (clock * sp.speed + sp.phase) % 1;
      const y = f.y + f.R * 0.9 - t * sp.travel;
      const x = sp.sx + Math.sin(clock * 0.6 + sp.phase * 9) * 8;
      ctx.globalAlpha = Math.min(1, 0.7 * A * bloom * Math.sin(t * Math.PI));
      ctx.drawImage(
        glow[sp.tint],
        x - sp.size / 2,
        y - sp.size / 2,
        sp.size,
        sp.size,
      );
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  /* ---------------- scene interface ---------------- */

  const resize = (env: BioEnv) => {
    const geometryChanged =
      Math.abs(width - env.w) > 0.5 ||
      Math.abs(scale - env.scale) > 0.001 ||
      lite !== env.lite;

    width = env.w;
    scale = env.scale;
    lite = env.lite;
    worldHeight = Math.max(env.viewportH, env.h);
    segmentCount = Math.max(1, Math.ceil(worldHeight / SEG_H));
    zoneOuter = env.w * (env.lite ? 0.16 : 0.21);
    unitK = env.scale * clamp(zoneOuter / 300, 0.8, 1.3);

    // Height-only changes keep every cached segment: only the depth mapping
    // moves, so the story is re-stretched without regenerating the world.
    if (geometryChanged) cache.clear();
    for (const index of Array.from(cache.keys())) {
      if (index >= segmentCount) cache.delete(index);
    }

    // The finale is anchored to the real page end, so it follows the height.
    finale = buildFinale();
  };

  const theme = (env: BioEnv) => {
    const { pal } = env;
    const teal = mixRGB(pal.pri, pal.sec, 0.5);
    cols = [pal.pri, pal.sec, pal.pist, teal];
    glow = cols.map((c) => makeGlowSprite(c, pal));
  };

  const step = (dt: number, env: BioEnv) => {
    clock += dt / 60;
    const [first, last] = visibleRange(env);
    for (let index = first; index <= last; index++) getSegment(index, env);
    pruneCache(Math.floor((env.scrollY + env.viewportH * 0.5) / SEG_H));
  };

  const settle = (_env: BioEnv) => {
    clock = 3;
  };

  const draw = (env: BioEnv) => {
    if (glow.length < 4) return;

    const { ctx, w, scrollY, viewportH } = env;
    const intro = smooth(0, 1.35, clock);
    const [first, last] = visibleRange(env);

    // 0 → 1 as the scroll approaches the end of the page
    const maxScroll = Math.max(0, worldHeight - viewportH);
    endP = smooth(maxScroll - viewportH * 0.8, maxScroll + 0.001, scrollY);

    // Gutter layer only, clipped to the real page end.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, zoneOuter, viewportH);
    ctx.rect(w - zoneOuter, 0, zoneOuter, viewportH);
    ctx.clip();

    ctx.beginPath();
    ctx.rect(0, 0, w, Math.max(0, worldHeight - scrollY));
    ctx.clip();

    for (let index = first; index <= last; index++) {
      const segment = getSegment(index, env);
      if (segment) drawSegment(segment, env, intro);
    }
    drawFinale(env, intro);

    // Feather the inner edge so nothing ends abruptly next to content.
    const zi = zoneOuter * 0.5;
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;

    let g = ctx.createLinearGradient(zi, 0, zoneOuter, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(zi, 0, zoneOuter - zi, viewportH);

    g = ctx.createLinearGradient(w - zi, 0, w - zoneOuter, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(w - zoneOuter, 0, zoneOuter - zi, viewportH);

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  return { resize, theme, step, draw, settle };
};

export const ContactGrowthBackground = ({
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

export default ContactGrowthBackground;
