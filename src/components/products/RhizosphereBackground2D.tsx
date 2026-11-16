"use client";

/* =========================================================
   Products page — Living Rhizosphere (unbounded procedural world)
   ---------------------------------------------------------
   - Uses the shared UseBioCanvas viewport engine.
   - Generates deterministic world segments on demand.
   - Segment geometry is independent of total page height.
   - Only visible segments (+ one-segment buffer) are cached/rendered.
   - No giant full-page offscreen canvas and no time-limited root growth.
   - A fresh world seed is created once per page mount.
========================================================= */

import type { RefObject } from "react";
import {
  BioEnv,
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

const SEGMENT_H = 960;
const MAX_CACHED_SEGMENTS = 12;
const CHILD_P = [0.22, 0.2, 0.14];
const LINE_W = [2.7, 1.8, 1.15, 0.78];

type Side = 0 | 1;

interface Branch {
  side: Side;
  xs: number[];
  ys: number[]; // segment-local world coordinates
  depth: number;
}

interface Bac {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  side: Side;
  rod: boolean;
  tint: 0 | 1 | 2;
  size: number;
  phase: number;
  glow: number;
}

interface Mote {
  x: number;
  y: number;
  phase: number;
  tint: 0 | 1 | 2;
  side: Side;
  size: number;
  speed: number;
}

interface Segment {
  index: number;
  branches: Branch[];
  specks: Array<{ x: number; y: number; size: number; alpha: number }>;
  bacteria: Bac[];
  motes: Mote[];
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
    // Fall through to Math.random in restricted browser contexts.
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

const createScene = (): BioScene => {
  // One seed per mounted page visit. Height changes never replace this seed.
  const worldSeed = freshSeed();
  const cache = new Map<number, Segment>();

  let worldHeight = 1;
  let segmentCount = 1;
  let width = 0;
  let scale = 1;
  let lite = false;
  let compact = false; // phones: the lightest variant
  let zone = 0;
  let zoneOuter = 0;
  let clock = 0;
  let useCounter = 0;
  let glow: HTMLCanvasElement[] = [];
  let rods: HTMLCanvasElement[] = [];

  const boundaryU = (
    segmentBoundary: number,
    side: Side,
    rootIndex: number,
    rootZone: number,
  ) => {
    const key =
      worldSeed ^
      Math.imul(segmentBoundary + 17, 0x9e3779b1) ^
      Math.imul(side + 3, 0x85ebca6b) ^
      Math.imul(rootIndex + 11, 0xc2b2ae35);
    const n = hash32(key) / 0xffffffff;
    return rootZone * (0.32 + n * 0.36);
  };

  const segmentRandom = (index: number) =>
    mulberry32(hash32(worldSeed ^ Math.imul(index + 1, 0x9e3779b1)));

  // Keep this separate so branch-length variation remains explicit and bounded.
  const depthSafeLength = (_depth: number, rng: () => number) =>
    170 + rng() * 210;

  const buildSegment = (index: number, env: BioEnv): Segment => {
    const rng = segmentRandom(index);
    const branches: Branch[] = [];
    const specks: Segment["specks"] = [];
    const bacteria: Bac[] = [];
    const motes: Mote[] = [];
    const tiny = env.compact;
    // Phones: coarser root sampling → fewer points to build and stroke
    const step = Math.max(tiny ? 16 : 10, 14 * env.scale);
    const rootCount = env.lite ? 1 : 2;
    const maxBranches = tiny ? 9 : env.lite ? 15 : 25;

    const addBranch = (
      side: Side,
      startU: number,
      startY: number,
      theta0: number,
      length: number,
      depth: number,
      targetU?: number,
    ) => {
      if (branches.length >= maxBranches || depth > 3 || length < 24)
        return null;
      const xs = [edgeX(env.w, side, startU)];
      const ys = [startY];
      const points: Array<{ u: number; y: number; theta: number }> = [];
      let u = startU;
      let y = startY;
      let theta = theta0;
      const count = Math.max(
        2,
        Math.ceil(length / (step * (depth > 1 ? 0.78 : 1))),
      );
      const localStep = length / count;

      for (let i = 1; i <= count; i++) {
        theta += (rng() - 0.5) * (depth === 0 ? 0.22 : 0.42);
        theta = clamp(theta, -1.18, 1.18);
        const correction =
          targetU === undefined
            ? 0
            : (targetU - u) / Math.max(1, count - i + 1);
        u = clamp(
          u +
            Math.sin(theta) * localStep * (depth === 0 ? 0.2 : 0.48) +
            correction * 0.72,
          zone * 0.035,
          zone * 0.98,
        );
        y += Math.max(2, Math.cos(theta) * localStep);
        xs.push(edgeX(env.w, side, u));
        ys.push(y);
        points.push({ u, y, theta });
      }

      if (targetU !== undefined && points.length) {
        const last = points[points.length - 1];
        last.u = targetU;
        xs[xs.length - 1] = edgeX(env.w, side, targetU);
      }

      branches.push({ side, xs, ys, depth });
      return points;
    };

    for (const side of [0, 1] as const) {
      // Main roots connect exactly at adjacent segment boundaries. Therefore
      // the world remains continuous even when new segments are added later.
      for (let rootIndex = 0; rootIndex < rootCount; rootIndex++) {
        // Main roots are sampled from a shared boundary function. The
        // Catmull/Hermite tangents are derived from neighbouring boundaries,
        // so position AND direction match exactly where two segments meet.
        const uAt = (boundary: number) =>
          boundaryU(boundary, side, rootIndex, zone);
        const u0 = uAt(index);
        const u1 = uAt(index + 1);
        const m0 = (u1 - uAt(index - 1)) * 0.5;
        const m1 = (uAt(index + 2) - u0) * 0.5;
        const main: Array<{ u: number; y: number; theta: number }> = [];
        const mainCount = Math.max(24, Math.ceil(SEGMENT_H / step));

        for (let pointIndex = 0; pointIndex <= mainCount; pointIndex++) {
          const t = pointIndex / mainCount;
          const t2 = t * t;
          const t3 = t2 * t;
          const h00 = 2 * t3 - 3 * t2 + 1;
          const h10 = t3 - 2 * t2 + t;
          const h01 = -2 * t3 + 3 * t2;
          const h11 = t3 - t2;
          const u = clamp(
            h00 * u0 + h10 * m0 + h01 * u1 + h11 * m1,
            zone * 0.035,
            zone * 0.98,
          );
          const derivative =
            (6 * t2 - 6 * t) * u0 +
            (3 * t2 - 4 * t + 1) * m0 +
            (-6 * t2 + 6 * t) * u1 +
            (3 * t2 - 2 * t) * m1;
          const y = t * SEGMENT_H;
          main.push({
            u,
            y,
            theta: Math.atan2(derivative * zone, SEGMENT_H),
          });
        }

        branches.push({
          side,
          xs: main.map((point) => edgeX(env.w, side, point.u)),
          ys: main.map((point) => point.y),
          depth: 0,
        });
        // Procedural lateral roots emerge at irregular intervals.
        const stride = tiny ? 13 : env.lite ? 10 : 7;
        for (
          let i = 4;
          i < main.length - 3 && branches.length < maxBranches - 2;
          i += stride
        ) {
          if (rng() > CHILD_P[0] * (tiny ? 0.6 : env.lite ? 0.72 : 1)) continue;
          const p = main[i];
          const sign = rng() < 0.5 ? -1 : 1;
          const branchLength = 95 + rng() * depthSafeLength(0, rng);
          const child = addBranch(
            side,
            p.u,
            p.y,
            p.theta + sign * (0.72 + rng() * 0.48),
            branchLength,
            1,
          );
          if (
            child &&
            branches.length < maxBranches - 1 &&
            rng() < CHILD_P[1]
          ) {
            const pick = child[Math.floor(rng() * child.length)];
            addBranch(
              side,
              pick.u,
              pick.y,
              pick.theta + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.55),
              42 + rng() * 105,
              2,
            );
          }
        }
      }

      // Small independent rootlets make each segment visually distinctive.
      const rootletCount = tiny ? 1 : env.lite ? 2 : 4;
      for (let i = 0; i < rootletCount && branches.length < maxBranches; i++) {
        const startY = 80 + rng() * (SEGMENT_H - 180);
        addBranch(
          side,
          zone * (0.12 + rng() * 0.7),
          startY,
          (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.7),
          75 + rng() * 190,
          1 + (rng() < 0.45 ? 1 : 0),
        );
      }

      const speckCount = tiny ? 12 : env.lite ? 22 : 38;
      for (let i = 0; i < speckCount; i++) {
        specks.push({
          x: edgeX(env.w, side, rng() * zoneOuter),
          y: rng() * SEGMENT_H,
          size: 0.7 + rng() * 1.5,
          alpha: 0.08 + rng() * 0.13,
        });
      }

      const bacCount = tiny ? 3 : env.lite ? 5 : 8;
      for (let i = 0; i < bacCount; i++) {
        const tintRoll = rng();
        bacteria.push({
          x: edgeX(env.w, side, rng() * zoneOuter),
          y: rng() * SEGMENT_H,
          vx: (rng() - 0.5) * 0.3,
          vy: (rng() - 0.5) * 0.3,
          angle: rng() * TAU,
          side,
          rod: rng() < 0.58,
          tint: tintRoll < 0.55 ? 0 : tintRoll < 0.84 ? 1 : 2,
          size: 0.75 + rng() * 0.6,
          phase: rng() * TAU,
          glow: rng() * 0.2,
        });
      }

      const moteCount = tiny ? 3 : env.lite ? 5 : 9;
      for (let i = 0; i < moteCount; i++) {
        const tintRoll = rng();
        motes.push({
          x: edgeX(env.w, side, rng() * zoneOuter),
          y: rng() * SEGMENT_H,
          phase: rng() * TAU,
          tint: tintRoll < 0.5 ? 0 : tintRoll < 0.8 ? 2 : 1,
          side,
          size: 3.5 + rng() * 3.5,
          speed: 0.06 + rng() * 0.12,
        });
      }
    }

    return { index, branches, specks, bacteria, motes, lastUsed: ++useCounter };
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
    const first = Math.max(0, Math.floor(env.scrollY / SEGMENT_H) - 1);
    const last = Math.min(
      segmentCount - 1,
      Math.floor((env.scrollY + env.viewportH) / SEGMENT_H) + 1,
    );
    return [first, last] as const;
  };

  const pruneCache = (centerIndex: number) => {
    const maxCache = compact ? 6 : MAX_CACHED_SEGMENTS;
    if (cache.size <= maxCache) return;
    const entries = Array.from(cache.entries()).sort((a, b) => {
      const da = Math.abs(a[0] - centerIndex);
      const db = Math.abs(b[0] - centerIndex);
      return db - da;
    });
    while (cache.size > maxCache && entries.length) {
      const [index] = entries.shift()!;
      cache.delete(index);
    }
  };

  const updateSegment = (segment: Segment, dt: number, env: BioEnv) => {
    const damp = Math.pow(0.988, dt);
    const maxV = 0.62 * env.scale;
    for (const b of segment.bacteria) {
      b.vx = (b.vx + Math.sin(clock * 1.2 + b.phase) * 0.008 * dt) * damp;
      b.vy = (b.vy + Math.cos(clock * 0.9 + b.phase) * 0.008 * dt) * damp;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > maxV) {
        b.vx *= maxV / speed;
        b.vy *= maxV / speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const u = b.side === 0 ? b.x : env.w - b.x;
      if (u < 0) b.x = edgeX(env.w, b.side, 0);
      if (u > zoneOuter) b.x = edgeX(env.w, b.side, zoneOuter);
      if (b.y < -8) b.y = SEGMENT_H + 8;
      else if (b.y > SEGMENT_H + 8) b.y = -8;
      if (speed > 0.04) {
        const target = Math.atan2(b.vy, b.vx);
        const delta = Math.atan2(
          Math.sin(target - b.angle),
          Math.cos(target - b.angle),
        );
        b.angle += delta * 0.07 * dt;
      }
      b.glow = Math.max(0, b.glow * Math.pow(0.97, dt));
      if (Math.sin(clock * 1.7 + b.phase) > 0.995) b.glow = 0.8;
    }
    for (const m of segment.motes) {
      m.y -= m.speed * dt;
      m.x += Math.sin(clock * 0.7 + m.phase) * 0.08 * dt;
      if (m.y < -6) m.y = SEGMENT_H + 6;
    }
  };

  const drawBranch = (
    ctx: CanvasRenderingContext2D,
    branch: Branch,
    env: BioEnv,
  ) => {
    if (branch.xs.length < 2) return;
    const { pal } = env;
    const dark = pal.dark;
    const colors = [
      rgba(pal.pri, dark ? 0.36 : 0.31),
      rgba(pal.pri, dark ? 0.3 : 0.27),
      rgba(mixRGB(pal.pri, pal.pist, 0.5), dark ? 0.25 : 0.24),
      rgba(pal.pist, dark ? 0.2 : 0.22),
    ];

    ctx.beginPath();
    ctx.moveTo(branch.xs[0], branch.ys[0]);
    for (let i = 1; i < branch.xs.length; i++) {
      ctx.lineTo(branch.xs[i], branch.ys[i]);
    }

    if (branch.depth === 0) {
      ctx.strokeStyle = rgba(pal.pri, dark ? 0.045 : 0.035);
      ctx.lineWidth = 22 * env.scale;
      ctx.stroke();
    }
    ctx.strokeStyle = colors[branch.depth] ?? colors[3];
    ctx.lineWidth = LINE_W[branch.depth] * env.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Root hairs (root-hair zone): visible, fine lateral filaments are
    // distributed along primary AND secondary roots on both page margins.
    // Their spacing/length scales with branch order to retain a natural look.
    ctx.beginPath();
    const stride = (branch.depth === 0 ? 3 : 2) + (env.compact ? 1 : 0);
    const baseHair = branch.depth === 0 ? 7.2 : branch.depth === 1 ? 5.4 : 3.8;
    for (let i = 2; i < branch.xs.length - 1; i += stride) {
      const dx = branch.xs[i + 1] - branch.xs[i - 1];
      const dy = branch.ys[i + 1] - branch.ys[i - 1];
      const length = Math.hypot(dx, dy) || 1;
      const normalX = -dy / length;
      const normalY = dx / length;
      const variation = 0.72 + ((i * 13 + branch.depth * 7) % 9) / 30;
      const hair = baseHair * env.scale * variation;
      const direction = (i + branch.depth) % 2 === 0 ? 1 : -1;

      // Alternate sides, with a second shorter filament every few anchors.
      ctx.moveTo(branch.xs[i], branch.ys[i]);
      ctx.lineTo(
        branch.xs[i] + normalX * direction * hair,
        branch.ys[i] + normalY * direction * hair,
      );
      if (i % 4 === 0) {
        ctx.moveTo(branch.xs[i], branch.ys[i]);
        ctx.lineTo(
          branch.xs[i] - normalX * direction * hair * 0.58,
          branch.ys[i] - normalY * direction * hair * 0.58,
        );
      }
    }
    ctx.strokeStyle = rgba(pal.pist, dark ? 0.32 : 0.36);
    ctx.lineWidth = Math.max(0.65, 0.82 * env.scale);
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const drawSegment = (segment: Segment, env: BioEnv, intro: number) => {
    const { ctx, w, scrollY, scale, pal } = env;
    const worldTop = segment.index * SEGMENT_H;
    const localBottom = Math.min(SEGMENT_H, worldHeight - worldTop);
    if (localBottom <= 0) return;

    ctx.save();
    // Clip this segment to the true page world; the last segment is shortened
    // automatically when the product list/content is shorter than one segment.
    ctx.beginPath();
    ctx.rect(0, worldTop - scrollY, w, localBottom);
    ctx.clip();
    ctx.translate(0, worldTop - scrollY);

    for (const branch of segment.branches) drawBranch(ctx, branch, env);

    for (const speck of segment.specks) {
      if (speck.y > localBottom + 2) continue;
      const sideAlpha =
        speck.x < w / 2
          ? 1 - smooth(zoneOuter * 0.76, zoneOuter, speck.x)
          : 1 - smooth(zoneOuter * 0.76, zoneOuter, w - speck.x);
      ctx.globalAlpha = speck.alpha * intro * sideAlpha;
      ctx.fillStyle = rgba(pal.pist, 1);
      ctx.fillRect(speck.x, speck.y, speck.size, speck.size);
    }

    for (const m of segment.motes) {
      if (m.y > localBottom + 12) continue;
      const distance = m.side === 0 ? m.x : w - m.x;
      const fade = 1 - smooth(zoneOuter * 0.7, zoneOuter, distance);
      const size = m.size * scale;
      ctx.globalAlpha = 0.3 * pal.k * intro * fade;
      ctx.drawImage(glow[m.tint], m.x - size / 2, m.y - size / 2, size, size);
    }

    for (const b of segment.bacteria) {
      if (b.y > localBottom + 20) continue;
      const distance = b.side === 0 ? b.x : w - b.x;
      const fade = 1 - smooth(zoneOuter * 0.7, zoneOuter, distance);
      const alpha = pal.k * intro * fade * (0.72 + b.glow * 0.25);
      if (alpha < 0.025) continue;
      ctx.globalAlpha = Math.min(1, alpha);
      if (b.rod) {
        const dw = 16 * scale * b.size;
        const dh = dw * 0.5;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.drawImage(rods[b.tint], -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      } else {
        const size = 12 * scale * b.size;
        ctx.drawImage(glow[b.tint], b.x - size / 2, b.y - size / 2, size, size);
      }
      if (b.glow > 0.12) {
        const size = 27 * scale * b.glow;
        ctx.globalAlpha = 0.28 * pal.k * intro * b.glow;
        ctx.drawImage(glow[b.tint], b.x - size / 2, b.y - size / 2, size, size);
      }
    }

    ctx.restore();
  };

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
    segmentCount = Math.max(1, Math.ceil(worldHeight / SEGMENT_H));
    // Wider gutters on small screens so the roots stay clearly visible
    zone = env.w * (env.compact ? 0.17 : env.lite ? 0.14 : 0.15);
    zoneOuter = zone + env.w * 0.03;

    // Height-only changes do not invalidate previous segment geometry. This
    // is what lets the world extend seamlessly as product content is added.
    if (geometryChanged) cache.clear();
    for (const index of Array.from(cache.keys())) {
      if (index >= segmentCount) cache.delete(index);
    }
  };

  const theme = (env: BioEnv) => {
    const colors = [env.pal.pri, env.pal.sec, env.pal.pist];
    glow = colors.map((color) => makeGlowSprite(color, env.pal));
    rods = colors.map((color) => makeRodSprite(color, env.pal));
  };

  const step = (dt: number, env: BioEnv) => {
    clock += dt / 60;
    const [first, last] = visibleRange(env);
    for (let index = first; index <= last; index++) {
      const segment = getSegment(index, env);
      if (segment) updateSegment(segment, dt, env);
    }
    pruneCache(Math.floor((env.scrollY + env.viewportH * 0.5) / SEGMENT_H));
  };

  const settle = (_env: BioEnv) => {
    clock = 3;
  };

  const draw = (env: BioEnv) => {
    if (!glow.length || !rods.length) return;
    const { ctx, w, scrollY, viewportH, h, pal } = env;
    const intro = smooth(0, 1.35, clock);
    const [first, last] = visibleRange(env);

    // Restrict all biological geometry to the two side gutters so product
    // cards and page text remain completely unobstructed.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, zoneOuter, viewportH);
    ctx.rect(w - zoneOuter, 0, zoneOuter, viewportH);
    ctx.clip();
    ctx.globalCompositeOperation = "source-over";
    for (let index = first; index <= last; index++) {
      const segment = getSegment(index, env);
      if (segment) drawSegment(segment, env, intro);
    }
    ctx.restore();

    // The terminal cue is tied to the real content bottom, never to a fixed
    // viewport multiplier or a guessed product count.
    // Exact content terminus: h is measured from the live scroll container,
    // not estimated from viewport height or a fixed number of sections.
    const contentBottomInViewport = h - scrollY;
    const distanceToBottom = contentBottomInViewport - viewportH;
    if (distanceToBottom > -150 && distanceToBottom < 180) {
      // Keep the terminus safely inside the canvas; reveal it progressively
      // during the final 180px of scrolling, reaching full strength at the end.
      const bottomY = Math.min(contentBottomInViewport - 18, viewportH - 18);
      const reveal = 1 - smooth(0, 180, Math.max(0, distanceToBottom));
      const coreX = w * 0.5;
      const radius = Math.min(150, w * 0.2);
      ctx.save();
      ctx.globalCompositeOperation = pal.blend;
      const gradient = ctx.createRadialGradient(
        coreX,
        bottomY,
        1,
        coreX,
        bottomY,
        radius,
      );
      gradient.addColorStop(0, rgba(pal.pist, 0.5));
      gradient.addColorStop(0.32, rgba(pal.pri, 0.17));
      gradient.addColorStop(1, rgba(pal.pri, 0));
      ctx.globalAlpha = 0.24 * pal.k * intro * reveal;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(coreX, bottomY, radius, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.36 * pal.k * intro * reveal;
      ctx.strokeStyle = rgba(pal.pri, 0.8);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, bottomY + 8);
      ctx.bezierCurveTo(
        w * 0.2,
        bottomY - 18,
        w * 0.34,
        bottomY + 24,
        coreX,
        bottomY + 1,
      );
      ctx.bezierCurveTo(
        w * 0.66,
        bottomY - 18,
        w * 0.8,
        bottomY + 24,
        w,
        bottomY + 8,
      );
      ctx.stroke();

      // A subtle "end of the rhizosphere" horizon: converging root veins,
      // concentric organic contours and a luminous terminal node.
      ctx.globalAlpha = 0.24 * pal.k * intro * reveal;
      ctx.strokeStyle = rgba(pal.pri, 0.72);
      ctx.lineWidth = 1.05 * scale;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(
          coreX,
          bottomY + 2 * scale,
          radius * (0.42 + ring * 0.2),
          (8 + ring * 5) * scale,
          0,
          Math.PI,
          TAU,
        );
        ctx.stroke();
      }

      ctx.globalAlpha = 0.28 * pal.k * intro * reveal;
      ctx.lineWidth = 1.1 * scale;
      for (let vein = 0; vein < 8; vein++) {
        const side = vein % 2 === 0 ? -1 : 1;
        const spread = 0.18 + Math.floor(vein / 2) * 0.16;
        ctx.beginPath();
        ctx.moveTo(
          coreX + side * radius * (0.18 + spread),
          bottomY + 38 * scale,
        );
        ctx.bezierCurveTo(
          coreX + side * radius * (0.12 + spread),
          bottomY + 14 * scale,
          coreX + side * radius * 0.12,
          bottomY + 20 * scale,
          coreX + side * radius * 0.025,
          bottomY + 3 * scale,
        );
        ctx.stroke();
      }

      ctx.globalAlpha = 0.62 * pal.k * intro * reveal;
      ctx.fillStyle = rgba(pal.pist, 0.95);
      ctx.beginPath();
      ctx.arc(coreX, bottomY, 5.5 * scale, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  };

  return { resize, theme, step, draw, settle };
};

export const RhizosphereBackground2D = ({
  scrollContainerRef,
}: {
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) => {
  const ref = useBioCanvas(createScene, scrollContainerRef, { minWidth: 0 });
  return (
    <canvas
      ref={ref}
      className="fixed z-[1] block pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default RhizosphereBackground2D;
