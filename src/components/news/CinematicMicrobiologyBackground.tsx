"use client";

/* =========================================================
   Cinematic Microbiology — a camera sinking through a bacterial world
   ---------------------------------------------------------
   - Shared Usebiocanvas viewport engine (useBioCanvas).
   - The "camera depth" is the real scroll progress
       prog = scrollY / (pageHeight - viewportHeight)   (0 → 1)
     so the whole story is stretched to the true, dynamic content height.
   - Three parallax layers (blurred background, sharp middle, blurred
     foreground) with different scroll speeds. Each layer streams
     height-independent procedural segments forever; a fresh seed per page
     mount makes every visit different. Elements own a random rank and
     appear when density(prog) passes it, so height changes regenerate
     nothing.
   - Acts (cross-faded by prog):
       I    bokeh, marine snow, out-of-focus cells
       II   motile bacteria with beating flagella, spirochetes, light shafts
       III  binary fission (septum, nucleoid segregation), biofilms,
            conjugation bridges
       IV   bacteriophage attacks ending in lysis bursts
   - Side gutters carry full intensity; the centre stays a soft ghost so
     page content remains readable.
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
  mixRGB,
  mulberry32,
  rgba,
  smooth,
  useBioCanvas,
} from "../shared/Usebiocanvas";

const SEG_H = 900;
const MAX_SEGMENTS = 20;
const PAR = [0.55, 1, 1.5]; // parallax factor per layer: back, mid, front

/* body sprites: 0 rod · 1 short rod · 2 coccus · 3 vibrio */
const HL = [46, 30, 19, 40]; // centre → tip
const BR = [14, 14, 19, 12]; // radius
const SPW = 128;
const SPH = 64;

interface Bokeh {
  x: number;
  y: number;
  r: number;
  phase: number;
  rank: number;
  tint: number;
  sp: number;
}
interface Snow {
  x: number;
  y: number;
  s: number;
  phase: number;
  rank: number;
  tint: number;
}
interface Body {
  x: number;
  y: number;
  ampX: number;
  ampY: number;
  fx: number;
  fy: number;
  px: number;
  py: number;
  rot: number;
  scale: number;
  kind: number;
  tint: number;
  rank: number;
  flag: number;
}
interface Spiro {
  x: number;
  y: number;
  len: number;
  amp: number;
  lam: number;
  rot: number;
  phase: number;
  rank: number;
  tint: number;
  speed: number;
}
interface Divider {
  x: number;
  y: number;
  rot: number;
  L0: number;
  rate: number;
  phase: number;
  rank: number;
  tint: number;
  flag: number;
}
interface Film {
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
    rot: number;
    s: number;
    kind: number;
    ph: number;
  }>;
}
interface Conj {
  x: number;
  y: number;
  ang: number;
  dist: number;
  bend: number;
  rank: number;
  phase: number;
  tint: number;
  s: number;
}
interface Attack {
  x: number;
  y: number;
  rot: number;
  s: number;
  rate: number;
  phase: number;
  rank: number;
  tint: number;
  phages: Array<{ lx: number; ly: number; ang: number }>;
}
interface Seg {
  layer: number;
  index: number;
  bokeh: Bokeh[];
  snow: Snow[];
  bodies: Body[];
  spiros: Spiro[];
  dividers: Divider[];
  films: Film[];
  conjs: Conj[];
  attacks: Attack[];
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
    // restricted browser contexts fall through
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

const dens = (prog: number) => 0.35 + 0.65 * prog;

const WHITE: RGB = [255, 255, 255];

/* ribosome positions, normalised: u along the axis (-1..1), v across */
const RIB: number[] = (() => {
  const r = mulberry32(90210);
  const a: number[] = [];
  for (let i = 0; i < 70; i++) a.push(r() * 2 - 1, (r() * 2 - 1) * 0.78);
  return a;
})();

/* ---------------- sprites ---------------- */

const blurSprite = (src: HTMLCanvasElement, px: number) => {
  const cv = document.createElement("canvas");
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext("2d")!;
  if (typeof g.filter === "string") {
    g.filter = `blur(${px}px)`;
    g.drawImage(src, 0, 0);
    g.filter = "none";
  } else {
    // Safari fallback: down-then-up sampling gives a soft blur.
    const sm = document.createElement("canvas");
    sm.width = Math.max(1, src.width >> 2);
    sm.height = Math.max(1, src.height >> 2);
    sm.getContext("2d")!.drawImage(src, 0, 0, sm.width, sm.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(sm, 0, 0, cv.width, cv.height);
  }
  return cv;
};

const axisY = (kind: number, x: number) => {
  if (kind !== 3) return SPH / 2;
  const t = clamp((x - (SPW / 2 - 28)) / 56, 0, 1);
  return 36 - 32 * t * (1 - t);
};

const bodyPath = (g: CanvasRenderingContext2D, kind: number) => {
  const cx = SPW / 2;
  const cy = SPH / 2;
  g.beginPath();
  if (kind === 0 || kind === 1) {
    const h = HL[kind] - BR[kind];
    g.moveTo(cx - h, cy);
    g.lineTo(cx + h, cy);
  } else if (kind === 2) {
    g.moveTo(cx, cy);
    g.lineTo(cx + 0.01, cy);
  } else {
    g.moveTo(cx - 28, 36);
    g.quadraticCurveTo(cx, 20, cx + 28, 36);
  }
};

const makeBodySprite = (
  kind: number,
  c: RGB,
  pal: BioPalette,
  seed: number,
  blur: boolean,
) => {
  const cv = document.createElement("canvas");
  cv.width = SPW;
  cv.height = SPH;
  const g = cv.getContext("2d")!;
  const dark = pal.dark;
  const rim = dark ? mixRGB(c, WHITE, 0.4) : mixRGB(c, [0, 30, 40], 0.35);
  const r = BR[kind];
  const cx = SPW / 2;
  const rng = mulberry32(seed);
  g.lineCap = "round";
  g.lineJoin = "round";

  g.save();
  g.shadowColor = rgba(c, dark ? 0.9 : 0.5);
  g.shadowBlur = 10;
  bodyPath(g, kind);
  g.strokeStyle = rgba(c, 0.5);
  g.lineWidth = 2 * r + 1;
  g.stroke();
  g.restore();

  bodyPath(g, kind);
  g.strokeStyle = rgba(rim, 0.92);
  g.lineWidth = 2 * r;
  g.stroke();

  bodyPath(g, kind);
  g.strokeStyle = rgba(
    mixRGB(c, dark ? [0, 15, 30] : [255, 255, 255], 0.6),
    dark ? 0.86 : 0.78,
  );
  g.lineWidth = 2 * r - 3.2;
  g.stroke();

  // glassy highlight
  g.save();
  g.translate(0, -r * 0.45);
  bodyPath(g, kind);
  g.strokeStyle = rgba(WHITE, 0.22);
  g.lineWidth = 2.4;
  g.stroke();
  g.restore();

  // surface texture
  const hh = HL[kind] - r * 0.6;
  for (let i = 0; i < 26; i++) {
    let x: number;
    let y: number;
    if (kind === 2) {
      const a = rng() * TAU;
      const rr = Math.sqrt(rng()) * r * 0.78;
      x = cx + Math.cos(a) * rr;
      y = SPH / 2 + Math.sin(a) * rr;
    } else {
      x = cx + (rng() * 2 - 1) * hh;
      y = axisY(kind, x) + (rng() * 2 - 1) * r * 0.7;
    }
    g.fillStyle = rgba(rim, 0.3 + 0.3 * rng());
    g.beginPath();
    g.arc(x, y, 0.7 + rng() * 1.2, 0, TAU);
    g.fill();
  }

  // nucleoid
  g.strokeStyle = rgba(mixRGB(c, WHITE, 0.55), 0.55);
  g.lineWidth = 2;
  g.beginPath();
  if (kind === 2) {
    g.arc(cx, SPH / 2, r * 0.38, 0, TAU);
  } else {
    const span = (HL[kind] - r) * 0.55;
    for (let i = 0; i <= 20; i++) {
      const x = cx + (i / 20 - 0.5) * 2 * span;
      const y = axisY(kind, x) + Math.sin(i * 1.1 + seed) * r * 0.35;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
  }
  g.stroke();

  // pili
  g.strokeStyle = rgba(rim, 0.28);
  g.lineWidth = 0.7;
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    if (kind === 2) {
      const a = rng() * TAU;
      const l = 4 + rng() * 6;
      g.moveTo(cx + Math.cos(a) * r, SPH / 2 + Math.sin(a) * r);
      g.lineTo(cx + Math.cos(a) * (r + l), SPH / 2 + Math.sin(a) * (r + l));
    } else {
      const x = cx + (rng() * 2 - 1) * (HL[kind] - r);
      const side = rng() < 0.5 ? -1 : 1;
      const y0 = axisY(kind, x) + side * r;
      g.moveTo(x, y0);
      g.lineTo(x + (rng() - 0.5) * 3, y0 + side * (4 + rng() * 6));
    }
  }
  g.stroke();

  return blur ? blurSprite(cv, 3.5) : cv;
};

const makeBokehSprite = (c: RGB, pal: BioPalette) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  const rim = pal.dark ? mixRGB(c, WHITE, 0.4) : c;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = 0.2 + (k * TAU) / 6;
    const px = 64 + Math.cos(a) * 54;
    const py = 64 + Math.sin(a) * 54;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 56);
  gr.addColorStop(0, rgba(c, 0.08));
  gr.addColorStop(1, rgba(c, 0.24));
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = rgba(rim, 0.38);
  g.lineWidth = 2.5;
  g.stroke();
  return cv;
};

/* ---------------- the scene ---------------- */

export const createCinematicScene = (): BioScene => {
  const worldSeed = freshSeed();
  const cache = new Map<number, Seg>();

  let worldHeight = 1;
  let width = 0;
  let scale = 1;
  let lite = false;
  let zone = 0;
  let clock = 0;
  let useCounter = 0;
  let glow: HTMLCanvasElement[] = [];
  let bodySp: HTMLCanvasElement[] = [];
  let blurSp: HTMLCanvasElement[] = [];
  let bokehSp: HTMLCanvasElement[] = [];
  let cols: RGB[] = [];
  let rims: RGB[] = [];
  const buf: number[] = [];

  const gutter = (x: number) =>
    1 - smooth(zone * 0.55, zone * 1.15, Math.min(x, width - x));
  const gf = (x: number) => 0.18 + 0.82 * gutter(x);

  const calcProg = (env: BioEnv) => {
    const maxScroll = Math.max(1, worldHeight - env.viewportH);
    return clamp(env.scrollY / maxScroll, 0, 1);
  };

  /* ---------------- segment generation ---------------- */

  const buildSeg = (layer: number, index: number, env: BioEnv): Seg => {
    const rng = mulberry32(
      hash32(
        worldSeed ^
          Math.imul(layer + 1, 0x7f4a7c15) ^
          Math.imul(index + 1, 0x9e3779b1),
      ),
    );
    const sc = env.scale;
    const lt = env.lite;
    const w = env.w;
    const seg: Seg = {
      layer,
      index,
      bokeh: [],
      snow: [],
      bodies: [],
      spiros: [],
      dividers: [],
      films: [],
      conjs: [],
      attacks: [],
      lastUsed: ++useCounter,
    };
    const pickX = () => {
      if (rng() < 0.78) {
        const u = rng() * zone;
        return rng() < 0.5 ? u : w - u;
      }
      return rng() * w;
    };
    const pickKind = () => {
      const r = rng();
      return r < 0.4 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : 3;
    };
    const mkBody = (sMin: number, sMax: number): Body => {
      const kind = pickKind();
      return {
        x: pickX(),
        y: rng() * SEG_H,
        ampX: 20 + rng() * 50,
        ampY: 15 + rng() * 40,
        fx: 0.15 + rng() * 0.25,
        fy: 0.12 + rng() * 0.22,
        px: rng() * TAU,
        py: rng() * TAU,
        rot: rng() * TAU,
        scale: sMin + rng() * (sMax - sMin),
        kind,
        tint: Math.floor(rng() * 3),
        rank: rng(),
        flag: kind !== 2 && rng() < 0.55 ? 1 + Math.floor(rng() * 3) : 0,
      };
    };
    const mkBokeh = (r0: number, r1: number) =>
      seg.bokeh.push({
        x: pickX(),
        y: rng() * SEG_H,
        r: (r0 + rng() * (r1 - r0)) * sc,
        phase: rng() * TAU,
        rank: rng(),
        tint: Math.floor(rng() * 4),
        sp: 0.05 + rng() * 0.1,
      });
    const mkSnow = (n: number) => {
      for (let i = 0; i < n; i++) {
        seg.snow.push({
          x: rng() * w,
          y: rng() * SEG_H,
          s: 0.6 + rng() * 1.5,
          phase: rng() * TAU,
          rank: rng(),
          tint: Math.floor(rng() * 4),
        });
      }
    };

    if (layer === 0) {
      for (let i = 0; i < (lt ? 4 : 7); i++) mkBokeh(30, 110);
      mkSnow(lt ? 14 : 28);
      for (let i = 0; i < (lt ? 2 : 3); i++) seg.bodies.push(mkBody(1.2, 2.0));
    } else if (layer === 2) {
      for (let i = 0; i < (lt ? 1 : 2); i++) mkBokeh(70, 190);
      for (let i = 0; i < (lt ? 1 : 2); i++) seg.bodies.push(mkBody(2.2, 3.6));
    } else {
      mkSnow(lt ? 8 : 14);
      for (let i = 0; i < (lt ? 4 : 7); i++)
        seg.bodies.push(mkBody(0.55, 0.95));

      for (let i = 0; i < (lt ? 1 : 2); i++) {
        seg.spiros.push({
          x: pickX(),
          y: rng() * SEG_H,
          len: (110 + rng() * 120) * sc,
          amp: (6 + rng() * 6) * sc,
          lam: (22 + rng() * 14) * sc,
          rot: rng() * TAU,
          phase: rng() * TAU,
          rank: rng(),
          tint: rng() < 0.5 ? 0 : 3,
          speed: 0.15 + rng() * 0.2,
        });
      }

      for (let i = 0; i < (lt ? 1 : 2); i++) {
        seg.dividers.push({
          x: pickX(),
          y: rng() * SEG_H,
          rot: rng() * TAU,
          L0: (48 + rng() * 26) * sc,
          rate: 0.05 + rng() * 0.04,
          phase: rng(),
          rank: rng(),
          tint: Math.floor(rng() * 3),
          flag: rng() < 0.4 ? 2 : 0,
        });
      }

      {
        const n = (lt ? 8 : 10) + Math.floor(rng() * 8);
        const R = (46 + rng() * 34) * sc;
        const cells: Film["cells"] = [];
        for (let k = 0; k < n; k++) {
          const r = R * Math.sqrt((k + 0.5) / n) * (0.85 + rng() * 0.3);
          const a = k * 2.399 + rng() * 0.4;
          cells.push({
            dx: Math.cos(a) * r,
            dy: Math.sin(a) * r,
            rot: a + Math.PI / 2 + (rng() - 0.5) * 1.2,
            s: 0.38 + rng() * 0.28,
            kind: rng() < 0.55 ? 1 : 2,
            ph: rng() * TAU,
          });
        }
        seg.films.push({
          x: pickX(),
          y: rng() * SEG_H,
          R,
          rank: rng(),
          phase: rng(),
          rate: 0.07 + rng() * 0.07,
          tint: Math.floor(rng() * 3),
          cells,
        });
      }

      if (!lt) {
        seg.conjs.push({
          x: pickX(),
          y: rng() * SEG_H,
          ang: rng() * TAU,
          dist: (88 + rng() * 40) * sc,
          bend: (rng() - 0.5) * 40 * sc,
          rank: rng(),
          phase: rng(),
          tint: Math.floor(rng() * 3),
          s: (0.6 + rng() * 0.2) * sc,
        });
      }

      for (let i = 0; i < (lt ? 1 : 2); i++) {
        const phages: Attack["phages"] = [];
        const n = 4 + Math.floor(rng() * 3);
        for (let k = 0; k < n; k++) {
          if (k < n - 2) {
            const side = rng() < 0.5 ? -1 : 1;
            phages.push({
              lx: (rng() * 2 - 1) * 0.7,
              ly: side,
              ang: side * (Math.PI / 2) * -1,
            });
          } else {
            const end = k % 2 === 0 ? 1 : -1;
            phages.push({ lx: end, ly: 0, ang: end > 0 ? 0 : Math.PI });
          }
        }
        seg.attacks.push({
          x: pickX(),
          y: rng() * SEG_H,
          rot: rng() * TAU,
          s: (0.8 + rng() * 0.3) * sc,
          rate: 0.05 + rng() * 0.04,
          phase: rng(),
          rank: rng(),
          tint: Math.floor(rng() * 3),
          phages,
        });
      }
    }
    return seg;
  };

  const getSeg = (layer: number, index: number, env: BioEnv) => {
    const key = layer * 1000000 + index;
    let seg = cache.get(key);
    if (!seg) {
      seg = buildSeg(layer, index, env);
      cache.set(key, seg);
    }
    seg.lastUsed = ++useCounter;
    return seg;
  };

  const pruneCache = () => {
    if (cache.size <= MAX_SEGMENTS) return;
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].lastUsed - b[1].lastUsed,
    );
    while (cache.size > MAX_SEGMENTS && entries.length) {
      cache.delete(entries.shift()![0]);
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

  /** Flagella in the current transform (body axis = +x). */
  const flagellaLocal = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    dirSign: number,
    len: number,
    count: number,
    phase: number,
  ) => {
    ctx.beginPath();
    for (let k = 0; k < count; k++) {
      const off = (k - (count - 1) / 2) * 0.3;
      const ang = (dirSign < 0 ? Math.PI : 0) + off;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const pxv = -dy;
      const pyv = dx;
      ctx.moveTo(x0, 0);
      for (let i = 1; i <= 14; i++) {
        const s = i / 14;
        const al = len * s;
        const lat =
          len *
          0.16 *
          s *
          Math.sin(s * TAU * 1.5 - clock * 7 + phase + k * 1.9);
        ctx.lineTo(x0 + dx * al + pxv * lat, dy * al + pyv * lat);
      }
    }
    ctx.stroke();
  };

  const phageLocal = (
    ctx: CanvasRenderingContext2D,
    ps: number,
    col: RGB,
    alpha: number,
  ) => {
    ctx.strokeStyle = rgba(col, 0.85 * alpha);
    ctx.fillStyle = rgba(col, 0.2 * alpha);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ps * 1.5, 0);
    ctx.moveTo(ps * 1.5, -ps * 0.3);
    ctx.lineTo(ps * 1.5, ps * 0.3);
    ctx.moveTo(ps * 0.35, 0);
    ctx.lineTo(-ps * 0.1, ps * 0.85);
    ctx.moveTo(ps * 0.35, 0);
    ctx.lineTo(-ps * 0.1, -ps * 0.85);
    ctx.stroke();
    const hx = ps * 2.45;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * TAU) / 6;
      const px = hx + Math.cos(a) * ps * 0.95;
      const py = Math.sin(a) * ps * 0.95;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - ps * 0.82, ps * 0.47);
    ctx.lineTo(hx + ps * 0.82, -ps * 0.47);
    ctx.moveTo(hx - ps * 0.82, -ps * 0.47);
    ctx.lineTo(hx + ps * 0.82, ps * 0.47);
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  /**
   * Binary fission, one parameter p (0..1):
   * elongation → nucleoid segregation → septum constriction → separation.
   */
  const drawFission = (
    ctx: CanvasRenderingContext2D,
    env: BioEnv,
    x: number,
    y: number,
    rot: number,
    L0: number,
    p: number,
    tint: number,
    alpha: number,
    flag: number,
    detail: boolean,
  ) => {
    const pal = env.pal;
    const dark = pal.dark;
    const r = L0 * 0.17;
    const fadeIn = smooth(0, 0.07, p);
    const fadeOut = 1 - smooth(0.94, 1, p);
    const a = alpha * fadeIn * fadeOut;
    if (a < 0.01) return;

    const e = smooth(0, 0.5, p);
    const c = smooth(0.42, 0.88, p);
    const sep = smooth(0.86, 1, p);
    const Lt = L0 * (1 + 0.95 * e);
    const gap = sep * L0 * 0.45;
    const sigma = r * (2.0 - 1.1 * c);
    const hl = Lt / 2;
    const col = cols[tint];
    const rim = rims[tint];

    const prof = (xx: number) => {
      const ax = Math.abs(xx);
      const edge = hl - r;
      let h = r;
      if (ax > edge) {
        const q = (ax - edge) / r;
        h = r * Math.sqrt(Math.max(0, 1 - q * q));
      }
      return h * (1 - c * Math.exp(-(xx * xx) / (2 * sigma * sigma)));
    };
    const addOutline = (xa: number, xb: number, shift: number) => {
      const m = 28;
      for (let i = 0; i <= m; i++) {
        const xx = xa + ((xb - xa) * i) / m;
        if (i === 0) ctx.moveTo(xx + shift, -prof(xx));
        else ctx.lineTo(xx + shift, -prof(xx));
      }
      for (let i = m; i >= 0; i--) {
        const xx = xa + ((xb - xa) * i) / m;
        ctx.lineTo(xx + shift, prof(xx));
      }
      ctx.closePath();
    };
    const outline = () => {
      ctx.beginPath();
      if (gap < 0.6) addOutline(-hl, hl, 0);
      else {
        addOutline(-hl, 0, -gap / 2);
        addOutline(0, hl, gap / 2);
      }
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    const hs = Lt * 1.6 + gap;
    ctx.globalAlpha = Math.min(1, 0.22 * a * pal.k);
    ctx.drawImage(glow[tint], -hs / 2, -hs * 0.36, hs, hs * 0.72);
    ctx.globalAlpha = 1;

    outline();
    ctx.fillStyle = rgba(col, (dark ? 0.15 : 0.12) * a);
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.85 * a);
    ctx.lineWidth = detail ? 2.2 : 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // ribosomes
    const nr = detail ? 70 : 22;
    ctx.fillStyle = rgba(rim, 0.5 * a);
    ctx.beginPath();
    for (let i = 0; i < nr; i++) {
      const u = RIB[i * 2];
      const v = RIB[i * 2 + 1];
      const xx = u * hl;
      if (Math.abs(v) * r > prof(xx) * 0.82) continue;
      const sx = xx + (u >= 0 ? gap / 2 : -gap / 2);
      ctx.moveTo(sx + 1.2, v * r);
      ctx.arc(sx, v * r, detail ? 1.3 : 0.9, 0, TAU);
    }
    ctx.fill();

    // nucleoids split in two
    const seg = smooth(0.12, 0.62, p);
    const half = Lt * (0.22 - 0.06 * seg);
    const amp = r * 0.5;
    const ncol = mixRGB(cols[3], WHITE, 0.4);
    ctx.strokeStyle = rgba(ncol, 0.75 * a);
    ctx.lineWidth = detail ? 2.4 : 1.6;
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? -1 : 1;
      const ka = k === 0 ? 1 : smooth(0.1, 0.25, p);
      if (ka < 0.02) continue;
      const cx0 = sgn * Lt * 0.24 * seg + sgn * (gap / 2);
      ctx.globalAlpha = ka;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const xx = cx0 + (i / 24 - 0.5) * 2 * half;
        const yy =
          amp *
          (Math.sin(i * 0.9 + clock * 1.3 + k * 2) * 0.6 +
            Math.sin(i * 2.1 - clock * 0.8) * 0.4);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // FtsZ ring
    const z = smooth(0.38, 0.5, p) * (1 - smooth(0.9, 0.97, p));
    if (z > 0.02) {
      const hz = prof(0) + r * 0.08;
      ctx.strokeStyle = rgba(mixRGB(cols[2], WHITE, 0.4), 0.9 * z * a);
      ctx.lineWidth = detail ? 3 : 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -hz);
      ctx.lineTo(0, hz);
      ctx.stroke();
      const gs = r * 3.4;
      ctx.globalAlpha = Math.min(1, 0.5 * z * a * pal.k);
      ctx.drawImage(glow[2], -gs / 2, -gs / 2, gs, gs);
      ctx.globalAlpha = 1;
    }

    if (detail) {
      ctx.strokeStyle = rgba(rim, 0.3 * a);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const xx = (i / 25 - 0.5) * 2 * (hl - r * 0.2);
        const h = prof(xx);
        if (h < r * 0.25) continue;
        const sx = xx + (xx >= 0 ? gap / 2 : -gap / 2);
        const side = i % 2 === 0 ? -1 : 1;
        ctx.moveTo(sx, side * h);
        ctx.lineTo(sx + (i % 3) - 1, side * (h + r * (0.28 + 0.14 * (i % 4))));
      }
      ctx.stroke();
    }

    if (flag > 0) {
      ctx.strokeStyle = rgba(rim, 0.5 * a);
      ctx.lineWidth = detail ? 1.6 : 1.2;
      flagellaLocal(
        ctx,
        -hl - gap / 2,
        -1,
        L0 * (detail ? 1.1 : 0.9),
        flag,
        tint,
      );
      flagellaLocal(
        ctx,
        hl + gap / 2,
        1,
        L0 * (detail ? 1.1 : 0.9),
        flag,
        tint + 2,
      );
    }

    ctx.restore();
  };

  /* ---------------- layer drawing ---------------- */

  const drawSeg = (
    seg: Seg,
    env: BioEnv,
    prog: number,
    intro: number,
    vs: number,
  ) => {
    const { ctx, scale: sc, pal, viewportH } = env;
    const layer = seg.layer;
    const blurred = layer !== 1;
    const oy = seg.index * SEG_H - vs;
    const vTop = -oy - 220;
    const vBot = -oy + viewportH + 220;
    const dn = dens(prog);
    const layerA = layer === 0 ? 0.4 : layer === 2 ? 0.42 : 0.92;
    const sprites = blurred ? blurSp : bodySp;

    ctx.save();
    ctx.translate(0, oy);
    ctx.globalCompositeOperation = pal.blend;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // bokeh
    for (const b of seg.bokeh) {
      const x = b.x + Math.sin(clock * b.sp + b.phase) * 24;
      const y = b.y + Math.cos(clock * b.sp * 0.8 + b.phase) * 18;
      if (y < vTop || y > vBot) continue;
      const a = smooth(b.rank, b.rank + 0.15, dn) * intro * gf(x);
      if (a < 0.02) continue;
      ctx.globalAlpha = Math.min(1, a * pal.k * (layer === 2 ? 0.8 : 1));
      ctx.drawImage(bokehSp[b.tint], x - b.r, y - b.r, b.r * 2, b.r * 2);
    }

    // marine snow
    for (const s of seg.snow) {
      const x = s.x + Math.sin(clock * 0.2 + s.phase) * 8;
      const y = s.y + Math.cos(clock * 0.16 + s.phase) * 10;
      if (y < vTop || y > vBot) continue;
      const a = smooth(s.rank, s.rank + 0.2, dn) * intro * (0.3 + 0.7 * gf(x));
      if (a < 0.02) continue;
      ctx.globalAlpha = Math.min(1, 0.55 * a * pal.k);
      ctx.fillStyle = rgba(rims[s.tint], 1);
      ctx.beginPath();
      ctx.arc(x, y, s.s * sc, 0, TAU);
      ctx.fill();
    }

    // drifting bacteria
    for (const b of seg.bodies) {
      const x = b.x + Math.sin(clock * b.fx + b.px) * b.ampX;
      const y = b.y + Math.sin(clock * b.fy + b.py) * b.ampY;
      if (y < vTop || y > vBot) continue;
      const act = layer === 1 ? win(prog, 0, 0.08, 0.8, 1.1) : 1;
      const a =
        smooth(b.rank, b.rank + 0.15, dn) * act * intro * gf(x) * layerA;
      if (a < 0.02) continue;
      const rot = b.rot + 0.25 * Math.sin(clock * 0.5 + b.px);
      const s = b.scale * sc;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = Math.min(1, a * pal.k);
      ctx.drawImage(
        sprites[b.kind * 3 + b.tint],
        (-SPW / 2) * s,
        (-SPH / 2) * s,
        SPW * s,
        SPH * s,
      );
      if (b.flag && !blurred) {
        ctx.strokeStyle = rgba(rims[b.tint], 0.5 * a);
        ctx.lineWidth = 1.2 * sc;
        flagellaLocal(ctx, -HL[b.kind] * s, -1, 85 * s, b.flag, b.px);
      }
      ctx.restore();
    }

    if (layer === 1) {
      // spirochetes
      for (const sp of seg.spiros) {
        const act = win(prog, 0.2, 0.4, 0.9, 1.1);
        const a = smooth(sp.rank, sp.rank + 0.15, dn) * act * intro;
        if (a < 0.02) continue;
        const ox = Math.sin(clock * sp.speed + sp.phase) * 40;
        const x = sp.x + Math.cos(sp.rot) * ox;
        const y = sp.y + Math.sin(sp.rot) * ox;
        if (y < vTop || y > vBot) continue;
        const g = gf(x);
        const ca = Math.cos(sp.rot);
        const sa = Math.sin(sp.rot);
        const col = cols[sp.tint];
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i <= 28; i++) {
            const u = i / 28;
            const along = (u - 0.5) * sp.len;
            const env2 = Math.pow(Math.sin(Math.PI * u), 0.6);
            const lat =
              sp.amp *
              env2 *
              Math.sin((along / sp.lam) * TAU - clock * 3 + sp.phase);
            const px = x + ca * along - sa * lat;
            const py = y + sa * along + ca * lat;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.globalAlpha = Math.min(
            1,
            (pass === 0 ? 0.22 : 0.85) * a * g * pal.k,
          );
          ctx.strokeStyle = rgba(pass === 0 ? col : rims[sp.tint], 1);
          ctx.lineWidth = (pass === 0 ? 6 : 2) * sc;
          ctx.stroke();
        }
      }

      // binary fission
      for (const d of seg.dividers) {
        if (d.y < vTop || d.y > vBot) continue;
        const act = win(prog, 0.3, 0.5, 1.5, 2);
        const a = smooth(d.rank, d.rank + 0.15, dn) * act * intro;
        const g = gf(d.x);
        if (a * g < 0.02) continue;
        const p = (clock * d.rate + d.phase) % 1;
        ctx.globalAlpha = 1;
        drawFission(
          ctx,
          env,
          d.x,
          d.y,
          d.rot,
          d.L0,
          p,
          d.tint,
          a * g * pal.k,
          d.flag,
          false,
        );
      }

      // biofilms
      for (const f of seg.films) {
        if (f.y < vTop - 100 || f.y > vBot + 100) continue;
        const act = win(prog, 0.35, 0.55, 0.92, 1.1);
        const a = smooth(f.rank, f.rank + 0.15, dn) * act * intro;
        const g = gf(f.x);
        if (a * g < 0.02) continue;
        const hs = f.R * 3.4;
        ctx.globalAlpha = Math.min(1, 0.14 * a * g * pal.k);
        ctx.drawImage(glow[f.tint], f.x - hs / 2, f.y - hs / 2, hs, hs);
        const q = (clock * f.rate + f.phase) % 1;
        const fl = q < 0.2 ? Math.sin((q / 0.2) * Math.PI) : 0;
        for (const c of f.cells) {
          const cx = f.x + c.dx + Math.sin(clock * 0.6 + c.ph) * 1.6;
          const cy = f.y + c.dy + Math.cos(clock * 0.5 + c.ph) * 1.6;
          const s = c.s * sc;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(c.rot);
          ctx.globalAlpha = Math.min(1, (0.7 + 0.3 * fl) * a * g * pal.k);
          ctx.drawImage(
            bodySp[c.kind * 3 + f.tint],
            (-SPW / 2) * s,
            (-SPH / 2) * s,
            SPW * s,
            SPH * s,
          );
          ctx.restore();
        }
        if (q < 0.6) {
          const k2 = q / 0.6;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(
            rims[2],
            Math.pow(1 - k2, 2) * 0.4 * a * g * pal.k,
          );
          ctx.lineWidth = 1.2 * sc;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.R * (0.6 + 2.4 * k2), 0, TAU);
          ctx.stroke();
        }
      }

      // conjugation
      for (const cj of seg.conjs) {
        if (cj.y < vTop || cj.y > vBot) continue;
        const act = win(prog, 0.4, 0.6, 0.95, 1.15);
        const a = smooth(cj.rank, cj.rank + 0.15, dn) * act * intro;
        const g = gf(cj.x);
        if (a * g < 0.02) continue;
        const ux = Math.cos(cj.ang);
        const uy = Math.sin(cj.ang);
        const ax = cj.x - ux * cj.dist * 0.5;
        const ay = cj.y - uy * cj.dist * 0.5;
        const bx2 = cj.x + ux * cj.dist * 0.5;
        const by2 = cj.y + uy * cj.dist * 0.5;
        const hlA = HL[0] * cj.s;
        const bodies: Array<[number, number, number]> = [
          [ax, ay, cj.ang + 0.4 + Math.sin(clock * 0.5 + cj.phase) * 0.06],
          [bx2, by2, cj.ang - 0.3 + Math.cos(clock * 0.45 + cj.phase) * 0.06],
        ];
        for (const [bx0, by0, br] of bodies) {
          ctx.save();
          ctx.translate(bx0, by0);
          ctx.rotate(br);
          ctx.globalAlpha = Math.min(1, a * g * pal.k);
          ctx.drawImage(
            bodySp[cj.tint],
            (-SPW / 2) * cj.s,
            (-SPH / 2) * cj.s,
            SPW * cj.s,
            SPH * cj.s,
          );
          ctx.restore();
        }
        const x0 = ax + ux * (hlA + 2);
        const y0 = ay + uy * (hlA + 2);
        const x1 = bx2 - ux * (hlA + 2);
        const y1 = by2 - uy * (hlA + 2);
        const qx = (x0 + x1) / 2 - uy * cj.bend;
        const qy = (y0 + y1) / 2 + ux * cj.bend;
        ctx.globalAlpha = Math.min(1, 0.75 * a * g * pal.k);
        ctx.strokeStyle = rgba(rims[cj.tint], 1);
        ctx.lineWidth = 1.5 * sc;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(qx, qy, x1, y1);
        ctx.stroke();
        for (let k = 0; k < 3; k++) {
          const t = (clock * 0.22 + cj.phase + k / 3) % 1;
          const u = 1 - t;
          buf.push(
            u * u * x0 + 2 * u * t * qx + t * t * x1,
            u * u * y0 + 2 * u * t * qy + t * t * y1,
            9 * sc,
            Math.sin(t * Math.PI) * 0.9 * a * g,
            3,
          );
        }
      }

      // phage attacks ending in lysis
      for (const at of seg.attacks) {
        if (at.y < vTop || at.y > vBot) continue;
        const act = win(prog, 0.55, 0.75, 1.5, 2);
        const a = smooth(at.rank, at.rank + 0.15, dn) * act * intro;
        const g = gf(at.x);
        if (a * g < 0.02) continue;
        const q = (clock * at.rate + at.phase) % 1;
        const alive = 1 - smooth(0.78, 0.84, q);
        const fadeIn = smooth(0, 0.08, q);
        const pulse = smooth(0.55, 0.8, q);
        const swell =
          1 + 0.12 * smooth(0.5, 0.8, q) + 0.03 * Math.sin(clock * 18) * pulse;
        const s = at.s * swell;
        const hs = HL[0] * s * 3.4;
        ctx.globalAlpha = Math.min(1, 0.28 * pulse * alive * a * g * pal.k);
        ctx.drawImage(
          glow[at.tint === 1 ? 3 : 2],
          at.x - hs / 2,
          at.y - hs / 2,
          hs,
          hs,
        );

        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(at.rot);
        if (alive * fadeIn > 0.02) {
          ctx.globalAlpha = Math.min(1, alive * fadeIn * a * g * pal.k);
          ctx.drawImage(
            bodySp[at.tint],
            (-SPW / 2) * s,
            (-SPH / 2) * s,
            SPW * s,
            SPH * s,
          );
        }
        const away = smooth(0.82, 1, q) * 70 * sc;
        const comeIn = (1 - smooth(0, 0.1, q)) * 50 * sc;
        const pa = a * g * (1 - smooth(0.95, 1, q)) * smooth(0, 0.06, q);
        if (pa > 0.02) {
          for (const ph of at.phages) {
            const px = ph.lx * HL[0] * s;
            const py = ph.ly * BR[0] * s;
            const off = away + comeIn;
            ctx.save();
            ctx.translate(
              px + Math.cos(ph.ang) * off,
              py + Math.sin(ph.ang) * off,
            );
            ctx.rotate(ph.ang);
            ctx.globalAlpha = 1;
            phageLocal(ctx, 6.5 * sc, rims[(at.tint + 1) % 3], pa * pal.k);
            ctx.restore();
          }
        }
        ctx.restore();

        const b = (q - 0.8) / 0.14;
        if (b > 0 && b < 1) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(
            rims[2],
            Math.pow(1 - b, 2) * 0.55 * a * g * pal.k,
          );
          ctx.lineWidth = 1.6 * sc;
          ctx.beginPath();
          ctx.ellipse(
            at.x,
            at.y,
            HL[0] * s * (0.6 + 3 * b),
            HL[0] * s * (0.6 + 3 * b) * 0.8,
            0,
            0,
            TAU,
          );
          ctx.stroke();
          for (let k = 0; k < 16; k++) {
            const ang = (k * TAU) / 16 + k * 0.37;
            const dist = (30 + HL[0] * s * 1.6) * b * (0.5 + ((k * 7) % 5) / 5);
            buf.push(
              at.x + Math.cos(ang) * dist,
              at.y + Math.sin(ang) * dist,
              7 * sc,
              (1 - b) * 0.9 * a * g,
              k % 2 ? 3 : 2,
            );
          }
        }
      }
    }

    flush(ctx, env);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  const drawLayer = (
    layer: number,
    env: BioEnv,
    prog: number,
    intro: number,
  ) => {
    const vs = env.scrollY * PAR[layer];
    const first = Math.max(0, Math.floor(vs / SEG_H) - 1);
    const last = Math.floor((vs + env.viewportH) / SEG_H) + 1;
    for (let index = first; index <= last; index++) {
      drawSeg(getSeg(layer, index, env), env, prog, intro, vs);
    }
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
    zone = env.w * (env.lite ? 0.15 : 0.22);
    // Height-only changes keep every cached segment; only prog's mapping moves.
    if (geometryChanged) cache.clear();
  };

  const theme = (env: BioEnv) => {
    const { pal } = env;
    const violet = pal.dark
      ? mixRGB(pal.sec, [160, 90, 255], 0.55)
      : mixRGB(pal.sec, [110, 60, 190], 0.55);
    cols = [pal.pri, pal.sec, pal.pist, violet];
    rims = cols.map((c) =>
      pal.dark ? mixRGB(c, WHITE, 0.4) : mixRGB(c, [0, 30, 40], 0.35),
    );
    glow = cols.map((c) => makeGlowSprite(c, pal));
    bokehSp = cols.map((c) => makeBokehSprite(c, pal));
    bodySp = [];
    blurSp = [];
    for (let kind = 0; kind < 4; kind++) {
      for (let tint = 0; tint < 3; tint++) {
        const seed = 1000 + kind * 17 + tint * 5;
        bodySp.push(makeBodySprite(kind, cols[tint], pal, seed, false));
        blurSp.push(makeBodySprite(kind, cols[tint], pal, seed, true));
      }
    }
  };

  const step = (dt: number, _env: BioEnv) => {
    clock += dt / 60;
    pruneCache();
  };

  const settle = (_env: BioEnv) => {
    clock = 3;
  };

  const draw = (env: BioEnv) => {
    if (glow.length < 4 || bodySp.length < 12 || !cols.length) return;
    const { ctx, w, viewportH, pal } = env;
    const intro = smooth(0, 1.35, clock);
    const prog = calcProg(env);
    drawLayer(0, env, prog, intro);
    drawLayer(1, env, prog, intro);
    drawLayer(2, env, prog, intro);

    // cinematic vignette (dark theme only)
    if (pal.dark) {
      const vg = ctx.createRadialGradient(
        w / 2,
        viewportH / 2,
        Math.min(w, viewportH) * 0.45,
        w / 2,
        viewportH / 2,
        Math.max(w, viewportH) * 0.8,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.26)");
      ctx.globalAlpha = intro;
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, viewportH);
      ctx.globalAlpha = 1;
    }
  };

  return { resize, theme, step, draw, settle };
};

export const CinematicMicrobiologyBackground = ({
  scrollContainerRef,
}: {
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) => {
  const ref = useBioCanvas(createCinematicScene, scrollContainerRef);
  return (
    <canvas
      ref={ref}
      className="fixed z-[1] hidden md:block pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default CinematicMicrobiologyBackground;
