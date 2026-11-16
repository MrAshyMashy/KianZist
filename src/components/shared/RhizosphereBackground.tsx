"use client";

import { useEffect, useRef } from "react";

/**
 * RhizosphereBackground  (tablet & mobile, < lg)
 * ----------------------------------------------
 * A living, procedurally generated "underground" that grows along the two
 * side edges of the screen. Nothing is pre-drawn: every page load builds a
 * brand-new set of organisms from random parameters, and while the page stays
 * open they keep being born, grow, live and fade, then are replaced by new
 * ones - so it never repeats.
 *
 * Three organism species (random mix every load, random parameters each):
 *   0  root system      - tapering roots, gravity-driven, with root hairs
 *   1  mycorrhizal web  - thin, wavy, highly branched hyphae
 *   2  xylem vessels    - long near-vertical vessels with perpendicular branches
 *
 * Life layer:
 *   - growing tips glow while they push forward and "bloom" when they stop
 *   - nutrient pulses with comet trails run along the real grown paths
 *   - signal rings ripple out from random nodes
 *   - spores / bacteria drift upward and breathe
 *   - the whole organism gently sways
 *
 * Text safety: everything lives in two side bands (width ~14% of the screen,
 * 40-170px) and a horizontal alpha mask fades it out toward the content.
 * It is fixed, pointer-events-none and on the same layer as the desktop DNA.
 *
 * Perf: one canvas, 30fps (auto-drops to 20fps if slow), segments stored in
 * typed arrays and stroked in 6 batches per organism, paused when the tab is
 * hidden, static when `prefers-reduced-motion` is set.
 */

const TAU = Math.PI * 2;
const SEG = 4.2; // px per growth step
const HAIR_GEN = 9;
const FADE_TIME = 3.2; // s
const MAX_TIPS = 16;
const BUCKETS = 6;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const angDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));

interface Kind {
  id: 0 | 1 | 2;
  turn: number; // random-walk wobble per step (rad)
  branchP: number; // branch chance per step
  angMin: number;
  angMax: number;
  taper: number;
  maxGen: number;
  hair: number; // root-hair chance per step
  w0: number; // starting width
  trop: number; // tropism strength (trunk)
  tropBr: number; // tropism strength (branches)
  lenMin: number;
  lenMax: number;
}

const KINDS: Kind[] = [
  {
    id: 0,
    turn: 0.16,
    branchP: 0.05,
    angMin: 0.45,
    angMax: 1.15,
    taper: 0.9935,
    maxGen: 3,
    hair: 0.1,
    w0: 2.3,
    trop: 0.012,
    tropBr: 0.006,
    lenMin: 260,
    lenMax: 520,
  },
  {
    id: 1,
    turn: 0.34,
    branchP: 0.075,
    angMin: 0.3,
    angMax: 0.95,
    taper: 0.996,
    maxGen: 4,
    hair: 0,
    w0: 1.2,
    trop: 0.004,
    tropBr: 0.004,
    lenMin: 140,
    lenMax: 340,
  },
  {
    id: 2,
    turn: 0.04,
    branchP: 0.022,
    angMin: 1.3,
    angMax: 1.65,
    taper: 0.999,
    maxGen: 2,
    hair: 0,
    w0: 1.9,
    trop: 0.035,
    tropBr: 0.012,
    lenMin: 300,
    lenMax: 700,
  },
];

interface Tip {
  x: number;
  y: number;
  a: number;
  w: number;
  gen: number;
  seg: number;
  len: number;
  maxLen: number;
  acc: number;
  sp: number;
  tro: number;
  k: number;
}

interface Pulse {
  path: number[];
  pos: number;
  dir: 1 | -1;
  sp: number;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  max: number;
}

interface Org {
  side: 0 | 1;
  kind: Kind;
  speed: number;
  tips: Tip[];
  x1: Float32Array;
  y1: Float32Array;
  x2: Float32Array;
  y2: Float32Array;
  par: Int16Array;
  bk: Uint8Array;
  n: number;
  max: number;
  leaves: number[];
  pulses: Pulse[];
  rings: Ring[];
  phase: 0 | 1 | 2 | 3; // wait, grow, live, fade
  t: number;
  hold: number;
  alpha: number;
  sway: number;
  nextPulse: number;
  nextBloom: number;
}

interface Spore {
  side: 0 | 1;
  base: number;
  v: number;
  amp: number;
  f: number;
  ph: number;
  rise: number;
  size: number;
  cap: boolean;
  tint: 0 | 1;
}

/* ───────────── growth engine ───────────── */

const mkTip = (
  o: Org,
  x: number,
  y: number,
  a: number,
  w: number,
  gen: number,
  seg: number,
): Tip => {
  const k = o.kind;
  const hair = gen === HAIR_GEN;
  return {
    x,
    y,
    a,
    w,
    gen,
    seg,
    len: 0,
    maxLen: hair
      ? rnd(8, 18)
      : rnd(k.lenMin, k.lenMax) * Math.pow(0.62, Math.max(0, gen)),
    acc: 0,
    sp: hair ? o.speed * 0.5 : o.speed * Math.pow(0.9, gen),
    tro: Math.PI / 2,
    k: hair ? 0 : gen === 0 ? k.trop : k.tropBr,
  };
};

const makeOrg = (
  side: 0 | 1,
  H: number,
  band: number,
  maxSegs: number,
  delay: number,
): Org => {
  const r = Math.random();
  const kind = r < 0.45 ? KINDS[0] : r < 0.75 ? KINDS[1] : KINDS[2];
  const o: Org = {
    side,
    kind,
    speed:
      kind.id === 2 ? rnd(50, 70) : kind.id === 1 ? rnd(30, 42) : rnd(40, 56),
    tips: [],
    x1: new Float32Array(maxSegs),
    y1: new Float32Array(maxSegs),
    x2: new Float32Array(maxSegs),
    y2: new Float32Array(maxSegs),
    par: new Int16Array(maxSegs),
    bk: new Uint8Array(maxSegs),
    n: 0,
    max: maxSegs,
    leaves: [],
    pulses: [],
    rings: [],
    phase: 0,
    t: delay,
    hold: rnd(10, 22),
    alpha: 0,
    sway: rnd(0, TAU),
    nextPulse: rnd(0.3, 1),
    nextBloom: rnd(1, 3),
  };

  if (kind.id === 2) {
    // vessels: parallel trunks entering from the top or the bottom
    const count = 2 + ((Math.random() * 2) | 0);
    const fromTop = Math.random() < 0.5;
    const dir = fromTop ? Math.PI / 2 : -Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const t = mkTip(
        o,
        rnd(0.06, 0.6) * band,
        fromTop ? -8 : H + 8,
        dir + rnd(-0.12, 0.12),
        kind.w0,
        0,
        -1,
      );
      t.tro = dir;
      o.tips.push(t);
    }
  } else {
    // roots / hyphae: enter from the screen edge at a random height
    const v = rnd(0.08, 0.92) * H;
    const count = kind.id === 0 ? 1 + ((Math.random() * 2) | 0) : 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < count; i++) {
      const a = rnd(-0.9, 0.9);
      const t = mkTip(o, -6, v + rnd(-10, 10), a, kind.w0, 0, -1);
      t.tro = kind.id === 0 ? Math.PI / 2 : a;
      o.tips.push(t);
    }
  }
  return o;
};

const finishTip = (o: Org, t: Tip) => {
  if (t.gen === HAIR_GEN || t.seg < 0) return;
  o.leaves.push(t.seg);
  if (o.rings.length < 24 && Math.random() < 0.7) {
    o.rings.push({ x: t.x, y: t.y, t: 0, max: rnd(9, 16) });
  }
};

/** returns true when the tip is finished */
const stepTip = (o: Org, t: Tip, H: number, L: number): boolean => {
  const k = o.kind;
  if (o.n >= o.max) return true;

  t.a += (Math.random() - 0.5) * k.turn * (t.gen === HAIR_GEN ? 1.4 : 1);
  if (t.k) t.a += angDiff(t.a, t.tro) * t.k;

  // soft wall: never wander far from the edge band
  if (t.x > L && Math.cos(t.a) > 0) {
    const target = Math.sin(t.a) >= 0 ? Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25;
    t.a += angDiff(t.a, target) * 0.16;
  }

  const nx = t.x + Math.cos(t.a) * SEG;
  const ny = t.y + Math.sin(t.a) * SEG;
  const i = o.n++;
  o.x1[i] = t.x;
  o.y1[i] = t.y;
  o.x2[i] = nx;
  o.y2[i] = ny;
  o.par[i] = t.seg;
  o.bk[i] = Math.min(BUCKETS - 1, Math.floor(t.w / 0.4));

  t.x = nx;
  t.y = ny;
  t.seg = i;
  t.len += SEG;
  if (t.gen !== HAIR_GEN) t.w *= k.taper;

  if (t.gen <= k.maxGen) {
    if (o.tips.length < MAX_TIPS && t.w > 0.5 && Math.random() < k.branchP) {
      const sign = Math.random() < 0.5 ? -1 : 1;
      const c = mkTip(
        o,
        nx,
        ny,
        t.a + sign * rnd(k.angMin, k.angMax),
        t.w * 0.72,
        t.gen + 1,
        i,
      );
      c.tro = k.id === 1 ? t.a : k.id === 0 ? Math.PI / 2 : t.tro;
      o.tips.push(c);
      if (o.rings.length < 24) o.rings.push({ x: nx, y: ny, t: 0, max: 6 });
    }
    if (k.hair && o.tips.length < MAX_TIPS + 10 && Math.random() < k.hair) {
      const sign = Math.random() < 0.5 ? -1 : 1;
      const h = mkTip(o, nx, ny, t.a + sign * rnd(1.2, 1.9), 0.45, HAIR_GEN, i);
      o.tips.push(h);
    }
  }

  return t.len >= t.maxLen || t.w < 0.3 || nx < -18 || ny < -24 || ny > H + 24;
};

const growOrg = (o: Org, dt: number, H: number, L: number) => {
  for (let ti = o.tips.length - 1; ti >= 0; ti--) {
    const t = o.tips[ti];
    t.acc += t.sp * dt;
    let dead = false;
    while (t.acc >= SEG && !dead) {
      t.acc -= SEG;
      dead = stepTip(o, t, H, L);
    }
    if (dead) {
      finishTip(o, t);
      o.tips[ti] = o.tips[o.tips.length - 1];
      o.tips.pop();
    }
  }
};

const buildPath = (o: Org, leaf: number): number[] => {
  const arr: number[] = [];
  let i = leaf;
  while (i >= 0 && arr.length < 400) {
    arr.push(i);
    i = o.par[i];
  }
  return arr.reverse();
};

/** returns true when the organism is gone and must be replaced */
const updateOrg = (o: Org, dt: number, H: number, L: number): boolean => {
  if (o.phase === 0) {
    o.t -= dt;
    if (o.t <= 0) o.phase = 1;
    return false;
  }

  if (o.phase === 1) {
    growOrg(o, dt, H, L);
    if (!o.tips.length) {
      o.phase = 2;
      o.t = o.hold;
    }
  } else if (o.phase === 2) {
    o.t -= dt;
    if (o.t <= 0) {
      o.phase = 3;
      o.t = FADE_TIME;
    }
  } else {
    o.t -= dt;
    o.alpha = Math.max(0, o.t / FADE_TIME);
    if (o.t <= 0) return true;
  }
  if (o.phase < 3) o.alpha = Math.min(1, o.alpha + dt);

  // nutrient pulses along real, already-grown paths
  o.nextPulse -= dt;
  if (o.nextPulse <= 0) {
    o.nextPulse = rnd(0.5, 1.6);
    if (o.pulses.length < 5 && o.leaves.length) {
      const leaf = o.leaves[(Math.random() * o.leaves.length) | 0];
      const path = buildPath(o, leaf);
      if (path.length > 3) {
        const up = Math.random() < 0.5;
        o.pulses.push({
          path,
          pos: up ? 0 : path.length - 1,
          dir: up ? 1 : -1,
          sp: rnd(16, 34),
        });
      }
    }
  }
  for (let i = o.pulses.length - 1; i >= 0; i--) {
    const p = o.pulses[i];
    p.pos += p.dir * p.sp * dt;
    if (p.pos < -1 || p.pos > p.path.length) {
      o.pulses[i] = o.pulses[o.pulses.length - 1];
      o.pulses.pop();
    }
  }

  // random "signal" blooms on the grown network
  o.nextBloom -= dt;
  if (o.nextBloom <= 0) {
    o.nextBloom = rnd(1.2, 3.2);
    if (o.n > 8 && o.rings.length < 24) {
      const i = (Math.random() * o.n) | 0;
      o.rings.push({ x: o.x2[i], y: o.y2[i], t: 0, max: rnd(8, 15) });
    }
  }
  for (let i = o.rings.length - 1; i >= 0; i--) {
    const r = o.rings[i];
    r.t += dt / 1.4;
    if (r.t >= 1) {
      o.rings[i] = o.rings[o.rings.length - 1];
      o.rings.pop();
    }
  }

  return false;
};

/* ───────────── component ───────────── */

export const RhizosphereBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let band = 60;
    let wallL = 54;
    let maxSegs = 400;
    let mask: CanvasGradient | null = null;

    let orgs: Org[] = [];
    let spores: Spore[] = [];
    let clock = 0;

    // theme
    let isDark = false;
    let lineA = 0.55;
    let priSolid = "rgb(0,229,153)";
    let secSolid = "rgb(0,163,255)";
    let spritePri: HTMLCanvasElement | null = null;
    let spriteSec: HTMLCanvasElement | null = null;

    const makeSprite = (rgb: number[]) => {
      const s = document.createElement("canvas");
      s.width = s.height = 48;
      const c = s.getContext("2d");
      if (!c) return s;
      const g = c.createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      g.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.45)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 48, 48);
      return s;
    };

    const hexToRgb = (hex: string, fb: number[]) => {
      const ch = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/.exec(hex);
      if (ch) return [+ch[1], +ch[2], +ch[3]];
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m
        ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
        : fb;
    };

    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);
      isDark = document.documentElement.classList.contains("dark");
      lineA = isDark ? 0.5 : 0.62;
      const priHex = isDark
        ? style.getPropertyValue("--kz-brand-accent").trim() || "#27d7a6"
        : style.getPropertyValue("--kz-brand-primary").trim() || "#00e599";
      const secHex =
        style.getPropertyValue("--kz-brand-secondary").trim() || "#00a3ff";
      const pri = hexToRgb(priHex, isDark ? [39, 215, 166] : [0, 229, 153]);
      const sec = hexToRgb(secHex, [0, 163, 255]);
      priSolid = `rgb(${pri[0]},${pri[1]},${pri[2]})`;
      secSolid = `rgb(${sec[0]},${sec[1]},${sec[2]})`;
      spritePri = makeSprite(pri);
      spriteSec = makeSprite(sec);
    };

    /* ── layout / population ── */

    const layout = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      band = Math.max(40, Math.min(W * 0.14, 170));
      wallL = band * 0.9;
      maxSegs = W < 600 ? 360 : 520;

      // alpha mask: full strength at the edge, gone before the content
      const f1 = (band * 0.3) / W;
      const f2 = band / W;
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(f1, "rgba(0,0,0,1)");
      g.addColorStop(f2, "rgba(0,0,0,0)");
      g.addColorStop(1 - f2, "rgba(0,0,0,0)");
      g.addColorStop(1 - f1, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,1)");
      mask = g;
    };

    const populate = () => {
      const perSide = W < 600 ? 1 + ((Math.random() * 2) | 0) : 2 + ((Math.random() * 2) | 0);
      orgs = [];
      for (const side of [0, 1] as const) {
        for (let i = 0; i < perSide; i++) {
          orgs.push(
            makeOrg(side, H, band, maxSegs, rnd(0, 2.5) + i * rnd(1.5, 3.5)),
          );
        }
      }
      const sporeCount = W < 600 ? 7 : 12;
      spores = [];
      for (const side of [0, 1] as const) {
        for (let i = 0; i < sporeCount; i++) {
          spores.push({
            side,
            base: rnd(0.04, 0.85) * band,
            v: rnd(0, H),
            amp: rnd(4, 16),
            f: rnd(0.3, 0.9),
            ph: rnd(0, TAU),
            rise: rnd(5, 14),
            size: rnd(5, 11),
            cap: Math.random() < 0.3,
            tint: Math.random() < 0.5 ? 0 : 1,
          });
        }
      }

      if (reduceMotion) {
        for (const o of orgs) {
          let guard = 0;
          o.phase = 1;
          while (o.tips.length && guard++ < 3000) growOrg(o, 0.05, H, wallL);
          o.phase = 2;
          o.alpha = 1;
        }
      }
    };

    /* ── simulation ── */

    const step = (dt: number) => {
      clock += dt;
      for (let i = 0; i < orgs.length; i++) {
        const o = orgs[i];
        if (updateOrg(o, dt, H, wallL)) {
          orgs[i] = makeOrg(o.side, H, band, maxSegs, rnd(0.2, 2));
        }
      }
      for (const s of spores) {
        s.v -= s.rise * dt;
        if (s.v < -20) s.v = H + 20;
      }
    };

    /* ── drawing ── */

    const render = () => {
      if (!spritePri || !spriteSec) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const o of orgs) {
        if (o.phase === 0 || o.alpha <= 0.005 || !o.n) continue;

        // local space: u = distance from the screen edge, v = down
        const sx = Math.sin(clock * 0.5 + o.sway) * 1.6;
        const sy = Math.sin(clock * 0.37 + o.sway * 1.3) * 2.2;
        if (o.side === 0) ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
        else ctx.setTransform(-dpr, 0, 0, dpr, (W - sx) * dpr, sy * dpr);

        // body
        ctx.strokeStyle = priSolid;
        ctx.globalAlpha = o.alpha * lineA;
        for (let b = 0; b < BUCKETS; b++) {
          ctx.lineWidth = 0.5 + 0.32 * b;
          ctx.beginPath();
          for (let i = 0; i < o.n; i++) {
            if (o.bk[i] !== b) continue;
            ctx.moveTo(o.x1[i], o.y1[i]);
            ctx.lineTo(o.x2[i], o.y2[i]);
          }
          ctx.stroke();
        }

        // glow layer
        if (isDark) ctx.globalCompositeOperation = "lighter";

        // signal rings
        ctx.strokeStyle = secSolid;
        ctx.lineWidth = 1;
        for (const r of o.rings) {
          const e = 1 - Math.pow(1 - r.t, 3);
          ctx.globalAlpha = o.alpha * (1 - r.t) * 0.55;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 1 + r.max * e, 0, TAU);
          ctx.stroke();
        }

        // growing tips
        for (const t of o.tips) {
          if (t.gen === HAIR_GEN) continue;
          ctx.globalAlpha = o.alpha * 0.95;
          ctx.drawImage(spriteSec, t.x - 8, t.y - 8, 16, 16);
          ctx.globalAlpha = o.alpha;
          ctx.drawImage(spritePri, t.x - 4, t.y - 4, 8, 8);
        }

        // nutrient pulses (comet trail)
        for (const p of o.pulses) {
          for (let j = 0; j < 5; j++) {
            const q = p.pos - p.dir * j * 1.1;
            const qi = Math.max(0, Math.min(p.path.length - 1, Math.floor(q)));
            const si = p.path[qi];
            const fr = Math.max(0, Math.min(1, q - qi));
            const x = o.x1[si] + (o.x2[si] - o.x1[si]) * fr;
            const y = o.y1[si] + (o.y2[si] - o.y1[si]) * fr;
            const s = 13 - j * 2;
            ctx.globalAlpha = o.alpha * (1 - j * 0.19);
            ctx.drawImage(j === 0 ? spritePri : spriteSec, x - s / 2, y - s / 2, s, s);
          }
        }

        ctx.globalCompositeOperation = "source-over";
      }

      // spores & bacteria drifting inside the bands
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (isDark) ctx.globalCompositeOperation = "lighter";
      for (const s of spores) {
        const u = s.base + Math.sin(clock * s.f + s.ph) * s.amp;
        const x = s.side ? W - u : u;
        const pulse = 0.5 + 0.5 * Math.sin(clock * 1.3 + s.ph * 2);
        const a = 0.22 + 0.45 * pulse;
        if (s.cap) {
          const ang = s.ph + clock * 0.3;
          const dx = Math.cos(ang) * 3.5;
          const dy = Math.sin(ang) * 3.5;
          ctx.globalAlpha = a;
          ctx.strokeStyle = s.tint ? secSolid : priSolid;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(x - dx, s.v - dy);
          ctx.lineTo(x + dx, s.v + dy);
          ctx.stroke();
        } else {
          const size = s.size * (0.8 + 0.4 * pulse);
          ctx.globalAlpha = a;
          ctx.drawImage(
            s.tint ? spriteSec : spritePri,
            x - size / 2,
            s.v - size / 2,
            size,
            size,
          );
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // fade everything toward the content
      if (mask) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = mask;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
    };

    /* ── loop ── */

    let raf = 0;
    let last = 0;
    let interval = 1000 / 30;
    let ema = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = now - last;
      if (elapsed < interval - 2) return;
      last = now;
      const t0 = performance.now();
      step(Math.min(elapsed, 60) / 1000);
      render();
      ema = ema * 0.9 + (performance.now() - t0) * 0.1;
      if (ema > 9 && interval < 50) interval = 50;
      else if (ema < 3.5 && interval > 34) interval = 1000 / 30;
    };

    updateColors();
    layout();
    populate();
    if (reduceMotion) render();
    else raf = requestAnimationFrame(frame);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const dw = Math.abs(window.innerWidth - W);
        const dh = Math.abs(window.innerHeight - H);
        layout();
        // mobile browser bars change the height a little: keep the organisms
        if (dw > 8 || dh > 200) populate();
        if (reduceMotion) render();
      }, 180);
    };
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reduceMotion) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let themeTimer = 0;
    const observer = new MutationObserver(() => {
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(() => {
        updateColors();
        if (reduceMotion) render();
      }, 60);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(themeTimer);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full lg:hidden"
      aria-hidden="true"
    />
  );
};