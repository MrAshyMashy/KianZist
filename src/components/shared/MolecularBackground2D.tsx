"use client";

import { useEffect, useRef } from "react";

const L = 30;
const MAX_ATOMS = 11;
const MIN_ATOMS = 5;
const SPRING_K = 0.09;
const REPEL_K = 0.02;
const REPEL_R = L * 2;
const REPEL_R2 = REPEL_R * REPEL_R;
const CENTER_K = 0.0004;
const JITTER = 0.03;

const DNA_POINTS = 60;
const DNA_RUNGS = DNA_POINTS / 2;
const BLUE_RATIO = 0.25;
const FADE_SPEED = 0.045;
const SWAP_MIN = 0.25;
const SWAP_MAX = 1.35;

const TAU = 6.2832;

// ---- DNA sizing: helix half-width is soft-capped so it never gets absurd on
// big monitors nor vanishes on small ones (px, CSS pixels) ----
const AMP_MIN = 72;
const AMP_KNEE = 170; // growth starts to saturate here…
const AMP_MAX = 225; // …and can never exceed this

// ---- Render budget ----
const PIXEL_BUDGET = 3.2e6; // max canvas backing-store pixels (dpr² × w × h)
const MIX_STEPS = 24; // pre-computed green↔blue shades (no per-frame strings)

// ---- Docking state machine ----
const DOCK_IDLE = 0;
const DOCK_APPROACH = 1;
const DOCK_DOCKED = 2;
const DOCK_RELEASE = 3;
type DockState =
  | typeof DOCK_IDLE
  | typeof DOCK_APPROACH
  | typeof DOCK_DOCKED
  | typeof DOCK_RELEASE;

const DOCK_OFFSET = L * 1.6; // distance between the molecule centre and the DNA node
const GLOW_DECAY = 0.008;

// ---- Pulse / effects tuning ----
const PULSE_DECAY = 0.955; // per time unit trail fade
const PULSE_MIN = 0.03; // below this a DNA point is not drawn as lit
const MAX_WAVES = 4;
const SHOCK_SPEED = 1 / 55; // shockwave progress per time unit
const SPARKS = 18;

// ---- Director (which pair of molecules is visible) ----
const VIS_SPEED = 0.02; // visibility fade per time unit
const VIS_EPS = 0.004; // below this a molecule is fully skipped (no step, no draw)
const PH_IN = 0;
const PH_RUN = 1;
const PH_OUT = 2;

type Kind = 0 | 1;
type Order = 1 | 2;
type Tint = 0 | 1 | 2; // 0 = primary, 1 = secondary, 2 = mixed

interface Atom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: Kind;
  r: number;
  a: number;
  dying: boolean;
  sx: number;
  sy: number;
  comp: number;
}

interface Bond {
  s: Atom;
  t: Atom;
  order: Order;
  a: number;
  dying: boolean;
  flash: number;
}

interface Template {
  atoms: [number, number, Kind][];
  bonds: [number, number, Order][];
}

/**
 * Every molecule has its own "biological reaction" profile: a different flight
 * path, a different shockwave shape and a different gene-activation pulse.
 */
interface Profile {
  approach: number; // flight time toward the DNA (60fps units)
  release: number; // flight time back (60fps units)
  arc: number; // base height of the flight arc (px)
  swirl: number; // spiral turns while approaching (0 = none)
  wobble: number; // snake-like oscillation amplitude (px)
  spin: number; // extra rotation speed while flying (rad/s)
  ease: (p: number) => number;
  dir: -1 | 0 | 1; // pulse direction: -1 up, 1 down, 0 both
  relay: boolean; // pulse hops between the two strands
  speed: number; // DNA points travelled per time unit
  reach: number; // DNA points travelled before the pulse dies
  width: number; // gaussian width of the pulse front
  echoes: number; // number of staggered pulses
  echoGap: number; // delay between echoes (time units)
  tint: Tint;
  sides: number; // shockwave shape (0 = circle, 3+ = polygon)
  rings: number; // number of shock rings
  sparks: number; // number of sparks (<= SPARKS)
  hold: number; // seconds the molecule stays docked
}

const easeInOutCubic = (p: number): number =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3);

const mkProfile = (p: Omit<Profile, "hold">): Profile => ({
  ...p,
  // Stay docked until the whole pulse (including echoes) has finished travelling
  hold: (p.reach / p.speed + (p.echoes - 1) * p.echoGap) / 60 + 0.2,
});

// Index order matches buildTemplates(): benzene, acid, chain, fused
const PROFILES: Profile[] = [
  // 0) Benzene ring - auxin-like hormone: spiral approach, receptor "lock-in", symmetric wave
  mkProfile({
    approach: 105,
    release: 75,
    arc: 0,
    swirl: 1.5,
    wobble: 0,
    spin: 5,
    ease: easeInOutCubic,
    dir: 0,
    relay: false,
    speed: 0.45,
    reach: 30,
    width: 1.8,
    echoes: 1,
    echoGap: 0,
    tint: 0,
    sides: 6,
    rings: 2,
    sparks: 18,
  }),
  // 1) Acid - phosphate solubilisation: straight delivery, one-directional fast "elongation" wave
  mkProfile({
    approach: 125,
    release: 80,
    arc: 35,
    swirl: 0,
    wobble: 0,
    spin: 0,
    ease: easeOutCubic,
    dir: 1,
    relay: false,
    speed: 0.7,
    reach: 46,
    width: 1.3,
    echoes: 1,
    echoGap: 0,
    tint: 1,
    sides: 4,
    rings: 1,
    sparks: 10,
  }),
  // 2) Chain - quorum-sensing signal: snaking flight, triple pulsed ripple in both directions
  mkProfile({
    approach: 115,
    release: 75,
    arc: 20,
    swirl: 0,
    wobble: 55,
    spin: 0,
    ease: easeInOutCubic,
    dir: 0,
    relay: false,
    speed: 0.4,
    reach: 26,
    width: 1.1,
    echoes: 3,
    echoGap: 15,
    tint: 2,
    sides: 0,
    rings: 3,
    sparks: 8,
  }),
  // 3) Fused rings - cytokinin-like: counter-rotating flight, zig-zag relay pulse travelling upward
  mkProfile({
    approach: 130,
    release: 85,
    arc: 45,
    swirl: 0,
    wobble: 0,
    spin: -3,
    ease: easeInOutCubic,
    dir: -1,
    relay: true,
    speed: 0.5,
    reach: 40,
    width: 1.5,
    echoes: 1,
    echoGap: 0,
    tint: 1,
    sides: 3,
    rings: 2,
    sparks: 14,
  }),
];

// Two diagonal pairs (anchor order: TL = 0, TR = 1, BL = 2, BR = 3)
const PAIRS: [number, number][] = [
  [1, 2], // top-right + bottom-left
  [0, 3], // top-left + bottom-right
];

const A = (x: number, y: number, k: Kind = 0): [number, number, Kind] => [
  x * L,
  y * L,
  k,
];

const buildTemplates = (): Template[] => {
  const benz: Template = {
    atoms: [
      ...Array.from({ length: 6 }, (_, i) =>
        A(Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3)),
      ),
      A(2, 0, 1),
      A(-2, 0, 0),
    ],
    bonds: [
      [0, 1, 2],
      [1, 2, 1],
      [2, 3, 2],
      [3, 4, 1],
      [4, 5, 2],
      [5, 0, 1],
      [0, 6, 1],
      [3, 7, 1],
    ],
  };

  const acid: Template = {
    atoms: [
      A(0, 0),
      A(0, -1, 1),
      A(-0.87, 0.5, 1),
      A(0.87, 0.5),
      A(1.73, 0),
      A(2.6, 0.5),
      A(-1.73, 0),
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 1],
      [0, 3, 1],
      [3, 4, 1],
      [4, 5, 1],
      [2, 6, 1],
    ],
  };

  const chain: Template = {
    atoms: [
      ...Array.from({ length: 7 }, (_, i) => A((i - 3) * 0.87, (i % 2) * 0.5)),
      A(4 * 0.87, 0.5, 1),
    ],
    bonds: [
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 2],
      [3, 4, 1],
      [4, 5, 1],
      [5, 6, 1],
      [6, 7, 2],
    ],
  };

  const fused: Template = {
    atoms: [
      A(-0.87, -1),
      A(0, -0.5),
      A(0, 0.5),
      A(-0.87, 1),
      A(-1.73, 0.5),
      A(-1.73, -0.5),
      A(0.87, -1),
      A(1.73, -0.5, 1),
      A(1.73, 0.5),
      A(0.87, 1),
    ],
    bonds: [
      [0, 1, 2],
      [1, 2, 1],
      [2, 3, 2],
      [3, 4, 1],
      [4, 5, 2],
      [5, 0, 1],
      [1, 6, 1],
      [6, 7, 2],
      [7, 8, 1],
      [8, 9, 2],
      [9, 2, 1],
    ],
  };

  return [benz, acid, chain, fused];
};

const mkAtom = (x: number, y: number, kind: Kind, a = 1): Atom => ({
  x,
  y,
  vx: 0,
  vy: 0,
  kind,
  r: (kind === 1 ? 3 : 2.4) + Math.random() * 0.4,
  a,
  dying: false,
  sx: 0,
  sy: 0,
  comp: -1,
});

class Molecule {
  atoms: Atom[] = [];
  bonds: Bond[] = [];
  ax: number;
  ay: number;
  ph1 = Math.random() * 6.28;
  ph2 = Math.random() * 6.28;
  rot0 = Math.random() * 6.28;
  rotSpeed = (Math.random() - 0.5) * 0.05;
  timer = 0.8 + Math.random() * 3;
  healTimer = 0;

  /** Visibility 0..1 (hidden molecules are neither simulated nor drawn). */
  vis = 0;
  /** Accumulated rotation angle (radians). */
  rot: number;
  /** Extra rotation speed produced by the flight (rad/s). */
  spinNow = 0;
  readonly profile: Profile;

  // ---- Docking state ----
  /** Index into the DNA point arrays this molecule is heading to (-1 = none). */
  dockingTarget = -1;
  /** Which DNA strand the target node lives on (0 = xs1, 1 = xs2). */
  dockStrand: 0 | 1 = 0;
  /** Side of the DNA the molecule approaches from (-1 = left, 1 = right). */
  dockDir: -1 | 1;
  dockState: DockState = DOCK_IDLE;
  /** 0 = free floating, 1 = fully docked. */
  dockProgress = 0;
  dockTimer = 0;
  /** Signed vertical arc amplitude of the flight path. */
  arc = 0;
  /** Activation glow (0..1) applied after docking. */
  glow = 0;
  /** Current screen-space centre of the molecule (written by updateDock). */
  cx = 0;
  cy = 0;

  constructor(tpl: Template, ax: number, ay: number, profile: Profile) {
    this.ax = ax;
    this.ay = ay;
    this.profile = profile;
    this.rot = this.rot0;
    this.dockDir = ax < 0.5 ? -1 : 1;
    tpl.atoms.forEach(([x, y, k]) =>
      this.atoms.push(
        mkAtom(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, k),
      ),
    );
    tpl.bonds.forEach(([i, j, o]) =>
      this.bonds.push({
        s: this.atoms[i],
        t: this.atoms[j],
        order: o,
        a: 1,
        dying: false,
        flash: 0,
      }),
    );
  }

  /** Starts a flight toward the given DNA node. */
  beginDock(index: number, strand: 0 | 1) {
    this.dockingTarget = index;
    this.dockStrand = strand;
    this.dockState = DOCK_APPROACH;
    this.dockProgress = 0;
    this.arc =
      (Math.random() < 0.5 ? -1 : 1) * (this.profile.arc + Math.random() * 20);
  }

  /** Instantly aborts any docking activity. */
  resetDock() {
    this.dockState = DOCK_IDLE;
    this.dockingTarget = -1;
    this.dockProgress = 0;
    this.dockTimer = 0;
    this.glow = 0;
    this.spinNow = 0;
  }

  /**
   * Advances the docking state machine and writes the molecule centre to cx/cy.
   * fx/fy: free-floating centre, nx/ny: live screen position of the DNA node.
   * Returns true on the exact frame the molecule snaps onto the DNA.
   */
  updateDock(
    dt: number,
    fx: number,
    fy: number,
    nx: number,
    ny: number,
    scale: number,
  ): boolean {
    const pr = this.profile;
    let arrived = false;

    this.glow = Math.max(
      this.dockState === DOCK_DOCKED ? 0.35 : 0,
      this.glow - GLOW_DECAY * dt,
    );

    if (this.dockState === DOCK_APPROACH) {
      this.dockProgress += dt / pr.approach;
      if (this.dockProgress >= 1) {
        this.dockProgress = 1;
        this.dockState = DOCK_DOCKED;
        this.dockTimer = pr.hold;
        this.glow = 1;
        arrived = true;
      }
    } else if (this.dockState === DOCK_DOCKED) {
      this.dockTimer -= dt / 60;
      if (this.dockTimer <= 0) this.dockState = DOCK_RELEASE;
    } else if (this.dockState === DOCK_RELEASE) {
      this.dockProgress -= dt / pr.release;
      if (this.dockProgress <= 0) {
        this.dockProgress = 0;
        this.dockState = DOCK_IDLE;
        this.dockingTarget = -1;
      }
    }

    const p = this.dockProgress;
    this.spinNow = pr.spin * Math.sin(Math.PI * p);

    if (this.dockState === DOCK_IDLE) {
      this.cx = fx;
      this.cy = fy;
      return arrived;
    }

    // Blend between the floating position and the (moving) docking position
    const e = pr.ease(p);
    const tx = nx + this.dockDir * DOCK_OFFSET * scale;
    let x = fx + (tx - fx) * e;
    let y = fy + (ny - fy) * e + Math.sin(Math.PI * p) * this.arc * scale;

    if (pr.swirl !== 0) {
      // Spiral that decays to zero at both ends of the flight
      const a = e * pr.swirl * TAU;
      const r = Math.sin(Math.PI * e) * 60 * scale;
      x += Math.cos(a) * r;
      y += Math.sin(a) * r;
    }
    if (pr.wobble !== 0) {
      y += Math.sin(e * TAU * 2.5) * pr.wobble * Math.sin(Math.PI * e) * scale;
    }

    this.cx = x;
    this.cy = y;
    return arrived;
  }

  private valence(a: Atom): number {
    let v = 0;
    for (const b of this.bonds) {
      if (!b.dying && (b.s === a || b.t === a)) v += b.order;
    }
    return v;
  }

  private degree(a: Atom): number {
    let v = 0;
    for (const b of this.bonds) {
      if (!b.dying && (b.s === a || b.t === a)) v++;
    }
    return v;
  }

  private free(a: Atom): number {
    return (a.kind === 1 ? 3 : 4) - this.valence(a);
  }

  private bonded(s: Atom, t: Atom): boolean {
    for (const b of this.bonds) {
      if (!b.dying && ((b.s === s && b.t === t) || (b.s === t && b.t === s)))
        return true;
    }
    return false;
  }

  private centroid(list: Atom[]): [number, number] {
    let cx = 0;
    let cy = 0;
    for (const a of list) {
      cx += a.x;
      cy += a.y;
    }
    return [cx / list.length, cy / list.length];
  }

  private components(): number {
    const alive = this.atoms.filter((a) => !a.dying);
    for (const a of alive) a.comp = -1;
    let c = 0;
    for (const a of alive) {
      if (a.comp >= 0) continue;
      a.comp = c;
      const stack = [a];
      while (stack.length) {
        const u = stack.pop()!;
        for (const b of this.bonds) {
          if (b.dying) continue;
          const v = b.s === u ? b.t : b.t === u ? b.s : null;
          if (v && !v.dying && v.comp < 0) {
            v.comp = c;
            stack.push(v);
          }
        }
      }
      c++;
    }
    return c;
  }

  private addBond(s: Atom, t: Atom, order: Order) {
    this.bonds.push({ s, t, order, a: 0, dying: false, flash: 1 });
  }

  private addAtom(alive: Atom[]): boolean {
    const [cx, cy] = this.centroid(alive);
    const cands = alive.filter(
      (a) => this.free(a) >= 1 && Math.hypot(a.x - cx, a.y - cy) < L * 3,
    );
    if (!cands.length) return false;
    const p = cands[(Math.random() * cands.length) | 0];
    const dist = Math.hypot(p.x - cx, p.y - cy);
    const base =
      dist < 5 ? Math.random() * 6.28 : Math.atan2(p.y - cy, p.x - cx);
    const ang = base + (Math.random() - 0.5) * 2;
    const kind: Kind = Math.random() < 0.28 ? 1 : 0;
    const order: Order =
      kind === 1 && this.free(p) >= 2 && Math.random() < 0.5 ? 2 : 1;
    const atom = mkAtom(
      p.x + Math.cos(ang) * L * 0.55,
      p.y + Math.sin(ang) * L * 0.55,
      kind,
      0,
    );
    this.atoms.push(atom);
    this.addBond(p, atom, order);
    return true;
  }

  private removeAtom(alive: Atom[]): boolean {
    const leaves = alive.filter((a) => this.degree(a) <= 1);
    const pool = leaves.length ? leaves : alive;
    const v = pool[(Math.random() * pool.length) | 0];
    const [cx, cy] = this.centroid(alive);
    const ang = Math.atan2(v.y - cy, v.x - cx);
    v.dying = true;
    v.vx += Math.cos(ang) * 2.2;
    v.vy += Math.sin(ang) * 2.2;
    for (const b of this.bonds) {
      if (b.s === v || b.t === v) b.dying = true;
    }
    if (!leaves.length) this.healTimer = 0.9 + Math.random() * 1.2;
    return true;
  }

  private breakBond() {
    const live = this.bonds.filter((b) => !b.dying && b.a >= 1);
    if (!live.length) return;
    const b = live[(Math.random() * live.length) | 0];
    b.dying = true;
    const dx = b.t.x - b.s.x;
    const dy = b.t.y - b.s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const k = 1.7;
    b.s.vx -= (dx / d) * k;
    b.s.vy -= (dy / d) * k;
    b.t.vx += (dx / d) * k;
    b.t.vy += (dy / d) * k;
    this.healTimer = 0.7 + Math.random() * 1.3;
  }

  private heal() {
    const comps = this.components();
    const alive = this.atoms.filter((a) => !a.dying);
    const live = this.bonds.filter((b) => !b.dying).length;
    if (comps === 1 && live - alive.length + 1 >= 3) return;
    const maxD = comps > 1 ? Infinity : L * 2.4;
    const cands: { s: Atom; t: Atom; d: number }[] = [];
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const s = alive[i];
        const t = alive[j];
        if (comps > 1 && s.comp === t.comp) continue;
        if (comps === 1 && this.bonded(s, t)) continue;
        if (this.free(s) < 1 || this.free(t) < 1) continue;
        const d = Math.hypot(s.x - t.x, s.y - t.y);
        if (d <= maxD) cands.push({ s, t, d });
      }
    }
    if (!cands.length) {
      if (comps > 1) {
        const size = new Map<number, number>();
        for (const a of alive) size.set(a.comp, (size.get(a.comp) || 0) + 1);
        let small = -1;
        let min = Infinity;
        size.forEach((n, c) => {
          if (n < min) {
            min = n;
            small = c;
          }
        });
        for (const a of alive) if (a.comp === small) a.dying = true;
        for (const b of this.bonds) {
          if (b.s.dying || b.t.dying) b.dying = true;
        }
      }
      return;
    }
    cands.sort((p, q) => p.d - q.d);
    const pick = cands[(Math.random() * Math.min(3, cands.length)) | 0];
    this.addBond(pick.s, pick.t, 1);
  }

  private mutate() {
    if (this.healTimer > 0) return;
    if (this.components() > 1) {
      this.heal();
      return;
    }
    const alive = this.atoms.filter((a) => !a.dying);
    const n = alive.length;
    const pAdd = n <= MIN_ATOMS + 1 ? 0.6 : n >= MAX_ATOMS - 1 ? 0.06 : 0.3;
    const pRem = n <= MIN_ATOMS ? 0 : n >= MAX_ATOMS - 1 ? 0.45 : 0.22;
    const r = Math.random();
    if (r < pAdd && n < MAX_ATOMS && this.addAtom(alive)) return;
    if (r < pAdd + pRem && n > MIN_ATOMS && this.removeAtom(alive)) return;
    this.breakBond();
  }

  step(dt: number, damp: number) {
    const { atoms, bonds } = this;
    let deadAtom = false;
    let deadBond = false;

    this.timer -= dt / 60;
    if (this.healTimer > 0) {
      this.healTimer -= dt / 60;
      if (this.healTimer <= 0) this.heal();
    }
    if (this.timer <= 0) {
      this.timer = 1.3 + Math.random() * 2.7;
      this.mutate();
    }

    for (const a of atoms) {
      if (a.dying) {
        a.a -= 0.02 * dt;
        if (a.a <= 0) deadAtom = true;
      } else if (a.a < 1) {
        a.a = Math.min(1, a.a + 0.022 * dt);
      }
    }

    for (const b of bonds) {
      if (b.dying) {
        b.a -= 0.04 * dt;
        if (b.a <= 0) deadBond = true;
      } else if (b.a < 1) {
        b.a = Math.min(1, b.a + 0.03 * dt);
      }
      if (b.flash > 0) b.flash = Math.max(0, b.flash - 0.025 * dt);

      const dx = b.t.x - b.s.x;
      const dy = b.t.y - b.s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const f = ((d - L) * SPRING_K * Math.max(b.a, 0) * dt) / d;
      b.s.vx += dx * f;
      b.s.vy += dy * f;
      b.t.vx -= dx * f;
      b.t.vy -= dy * f;
    }

    const n = atoms.length;
    for (let i = 0; i < n; i++) {
      const ai = atoms[i];
      for (let j = i + 1; j < n; j++) {
        const aj = atoms[j];
        const dx = aj.x - ai.x;
        const dy = aj.y - ai.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const f = ((REPEL_R - d) * REPEL_K * dt) / d;
          ai.vx -= dx * f;
          ai.vy -= dy * f;
          aj.vx += dx * f;
          aj.vy += dy * f;
        }
      }
    }

    for (const a of atoms) {
      a.vx += -a.x * CENTER_K * dt + (Math.random() - 0.5) * JITTER * dt * 2;
      a.vy += -a.y * CENTER_K * dt + (Math.random() - 0.5) * JITTER * dt * 2;
      a.vx *= damp;
      a.vy *= damp;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }

    if (deadAtom) {
      this.atoms = atoms.filter((a) => !(a.dying && a.a <= 0));
      const keep = this.atoms;
      this.bonds = bonds.filter(
        (b) =>
          keep.includes(b.s) && keep.includes(b.t) && !(b.dying && b.a <= 0),
      );
    } else if (deadBond) {
      this.bonds = bonds.filter((b) => !(b.dying && b.a <= 0));
    }
  }
}

export const MolecularBackground2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let resizeTimer = 0;
    let width = 0;
    let height = 0;
    let scale = 1;
    let time = 0;
    let clock = 0;
    let last = 0;
    let interval = 1000 / 30;
    let ema = 0;
    // Tablet + phone: DNA only. Molecules + docking effects: desktop only.
    let isDesktop = window.innerWidth >= 1024;
    let isMobile = window.innerWidth < 768;
    let isTablet = !isDesktop && !isMobile;
    let lite = !isDesktop;

    // DNA geometry per tier (written in resize)
    let ampW = 0.17; // helix half-width as a fraction of the screen width
    let dnaAmp = 160; // resulting helix half-width in px
    let dnaFreq = 0.005; // twist per px of height
    let dnaSpeed = 0.0105; // phase speed per 60fps unit (lower = calmer)
    let dnaLine = 1.6; // rung width
    let dotR = 1.6; // backbone dot radius
    let pulseLive = false; // any gene-activation light currently visible
    let sparksLive = false;
    let themeSig = "";
    let themeTimer = 0;

    // Theme variables (updated in updateColors)
    let isDarkTheme = false;
    let lineAlphaVal = 0.3;
    let dotAlphaVal = 0.5;
    let flashBaseVal = 0.38;
    let flashPeakVal = 0.55;
    let atomAlphaVal = 1;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let colors = { primary: "0, 229, 153", secondary: "0, 163, 255" };
    let priRGB = [0, 229, 153];
    let secRGB = [0, 163, 255];
    let bondStyle = "";
    let primarySolid = "rgb(0,229,153)";
    let sprites: HTMLCanvasElement[] = [];

    let lineGreen = "";
    let lineBlue = "";
    let dotGreen = "";
    let dotBlue = "";
    let lineMix: string[] = [];
    let dotMix: string[] = [];

    // Solid "hot" pulse colours indexed by Tint (alpha is driven by globalAlpha)
    const pulseCol: string[] = [
      "rgb(0,229,153)",
      "rgb(0,163,255)",
      "rgb(0,200,200)",
    ];

    const lineT = new Uint8Array(DNA_RUNGS);
    const lineC = new Float32Array(DNA_RUNGS);
    const dotT = new Uint8Array(DNA_POINTS * 2);
    const dotC = new Float32Array(DNA_POINTS * 2);
    const xs1 = new Float32Array(DNA_POINTS);
    const xs2 = new Float32Array(DNA_POINTS);
    const ys = new Float32Array(DNA_POINTS);
    let dnaTimer = 0.4 + Math.random();

    // ---- Gene activation pulse state (all preallocated, reused every frame) ----
    const p1 = new Float32Array(DNA_POINTS); // light on strand 1
    const p2 = new Float32Array(DNA_POINTS); // light on strand 2
    const pulseTint = new Uint8Array(DNA_POINTS);
    const waveActive = new Uint8Array(MAX_WAVES);
    const waveOrigin = new Float32Array(MAX_WAVES);
    const waveFront = new Float32Array(MAX_WAVES);
    const waveDelay = new Float32Array(MAX_WAVES);
    const waveSpeed = new Float32Array(MAX_WAVES);
    const waveReach = new Float32Array(MAX_WAVES);
    const waveWidth = new Float32Array(MAX_WAVES);
    const waveDir = new Int8Array(MAX_WAVES);
    const waveRelay = new Uint8Array(MAX_WAVES);
    const waveTint = new Uint8Array(MAX_WAVES);

    // ---- Docking shockwave state ----
    let shockT = 1; // >= 1 means idle
    let shockI = 0;
    let shockStrand: 0 | 1 = 0;
    let shockProf: Profile = PROFILES[0];

    // ---- Spark particle pool ----
    const sparkX = new Float32Array(SPARKS);
    const sparkY = new Float32Array(SPARKS);
    const sparkVX = new Float32Array(SPARKS);
    const sparkVY = new Float32Array(SPARKS);
    const sparkL = new Float32Array(SPARKS);

    // ---- Director state: only one diagonal pair is visible at a time ----
    let pairIdx = 0;
    let phase = PH_IN;
    let step = 0; // how many molecules of the current pair have started docking
    let gap = 0.8; // seconds to wait before the next docking starts
    let activeDocker: Molecule | null = null;

    const seedBlue = (t: Uint8Array, c: Float32Array) => {
      const n = t.length;
      const k = Math.round(n * BLUE_RATIO);
      let placed = 0;
      while (placed < k) {
        const i = (Math.random() * n) | 0;
        if (!t[i]) {
          t[i] = 1;
          c[i] = 1;
          placed++;
        }
      }
    };
    seedBlue(lineT, lineC);
    seedBlue(dotT, dotC);

    const swapRandom = (t: Uint8Array, count: number) => {
      const n = t.length;
      for (let c = 0; c < count; c++) {
        let b = -1;
        let g = -1;
        for (let k = 0; k < 48 && b < 0; k++) {
          const i = (Math.random() * n) | 0;
          if (t[i] === 1) b = i;
        }
        for (let k = 0; k < 48 && g < 0; k++) {
          const i = (Math.random() * n) | 0;
          if (t[i] === 0) g = i;
        }
        if (b >= 0 && g >= 0) {
          t[b] = 0;
          t[g] = 1;
        }
      }
    };

    const fade = (t: Uint8Array, c: Float32Array, stp: number) => {
      for (let i = 0; i < t.length; i++) {
        const tg = t[i];
        const v = c[i];
        if (v === tg) continue;
        if (v < tg) c[i] = v + stp >= tg ? tg : v + stp;
        else c[i] = v - stp <= tg ? tg : v - stp;
      }
    };

    const stepDNA = (dt: number) => {
      dnaTimer -= dt / 60;
      if (dnaTimer <= 0) {
        dnaTimer = SWAP_MIN + Math.random() * (SWAP_MAX - SWAP_MIN);
        if (Math.random() < 0.7)
          swapRandom(lineT, 1 + (Math.random() < 0.35 ? 1 : 0));
        swapRandom(dotT, 1 + ((Math.random() * 3) | 0));
      }
      const stp = FADE_SPEED * dt;
      fade(lineT, lineC, stp);
      fade(dotT, dotC, stp);
    };

    // Starts the profile's pulse(s) from the given DNA point index
    const spawnWaves = (origin: number, pr: Profile) => {
      for (let e = 0; e < pr.echoes; e++) {
        let slot = -1;
        for (let w = 0; w < MAX_WAVES; w++) {
          if (!waveActive[w]) {
            slot = w;
            break;
          }
        }
        if (slot < 0) {
          // All slots busy: recycle the wave that has travelled the furthest
          let best = -1;
          for (let w = 0; w < MAX_WAVES; w++) {
            if (waveFront[w] > best) {
              best = waveFront[w];
              slot = w;
            }
          }
        }
        waveActive[slot] = 1;
        waveOrigin[slot] = origin;
        waveFront[slot] = 0;
        waveDelay[slot] = e * pr.echoGap;
        waveSpeed[slot] = pr.speed;
        waveReach[slot] = pr.reach;
        waveWidth[slot] = pr.width;
        waveDir[slot] = pr.dir;
        waveRelay[slot] = pr.relay ? 1 : 0;
        waveTint[slot] = pr.tint;
      }
      p1[origin] = 1;
      p2[origin] = 1;
      pulseTint[origin] = pr.tint;
    };

    // Advances the pulse fronts and fades the lingering trail
    const stepPulseCore = (dt: number) => {
      const decay = Math.pow(PULSE_DECAY, dt);
      for (let i = 0; i < DNA_POINTS; i++) {
        const a = p1[i] * decay;
        const b = p2[i] * decay;
        p1[i] = a < 0.004 ? 0 : a;
        p2[i] = b < 0.004 ? 0 : b;
      }

      for (let w = 0; w < MAX_WAVES; w++) {
        if (!waveActive[w]) continue;
        if (waveDelay[w] > 0) {
          waveDelay[w] -= dt;
          continue;
        }
        const front = waveFront[w] + waveSpeed[w] * dt;
        if (front >= waveReach[w]) {
          waveActive[w] = 0;
          continue;
        }
        waveFront[w] = front;
        const life = 1 - front / waveReach[w];
        const o = waveOrigin[w];
        const dir = waveDir[w];
        const wid = waveWidth[w];
        const relay = waveRelay[w] === 1;
        const tn = waveTint[w];

        for (let i = 0; i < DNA_POINTS; i++) {
          // Signed distance along the travel direction (both directions use |i - o|)
          const d = dir === 0 ? Math.abs(i - o) : dir * (i - o);
          const x = (d - front) / wid;
          if (x > 3 || x < -3) continue;
          const v = Math.exp(-x * x) * life;
          if (relay) {
            // Zig-zag: the light hops between the two strands every two points
            if (((Math.abs(i - o) >> 1) & 1) === 0) {
              if (v > p1[i]) {
                p1[i] = v;
                pulseTint[i] = tn;
              }
            } else if (v > p2[i]) {
              p2[i] = v;
              pulseTint[i] = tn;
            }
          } else {
            if (v > p1[i]) {
              p1[i] = v;
              pulseTint[i] = tn;
            }
            if (v > p2[i]) p2[i] = v;
          }
        }
      }
    };

    const stepPulse = (dt: number) => {
      stepPulseCore(dt);
      let live = false;
      for (let w = 0; w < MAX_WAVES; w++) {
        if (waveActive[w]) {
          live = true;
          break;
        }
      }
      if (!live) {
        for (let i = 0; i < DNA_POINTS; i++) {
          if (p1[i] > 0 || p2[i] > 0) {
            live = true;
            break;
          }
        }
      }
      pulseLive = live;
    };

    const spawnSparks = (x: number, y: number, count: number) => {
      for (let k = 0; k < SPARKS; k++) {
        if (k >= count) {
          sparkL[k] = 0;
          continue;
        }
        const ang = Math.random() * TAU;
        const sp = (1.4 + Math.random() * 2.8) * scale;
        sparkX[k] = x;
        sparkY[k] = y;
        sparkVX[k] = Math.cos(ang) * sp;
        sparkVY[k] = Math.sin(ang) * sp;
        sparkL[k] = 0.6 + Math.random() * 0.4;
      }
    };

    const stepSparksCore = (dt: number) => {
      const drag = Math.pow(0.94, dt);
      for (let k = 0; k < SPARKS; k++) {
        if (sparkL[k] <= 0) continue;
        sparkX[k] += sparkVX[k] * dt;
        sparkY[k] += sparkVY[k] * dt;
        sparkVX[k] *= drag;
        sparkVY[k] *= drag;
        sparkL[k] -= 0.02 * dt;
      }
    };

    const stepSparks = (dt: number) => {
      stepSparksCore(dt);
      let live = false;
      for (let k = 0; k < SPARKS; k++) {
        if (sparkL[k] > 0) {
          live = true;
          break;
        }
      }
      sparksLive = live;
    };

    const mixStyle = (c: number, alpha: number) => {
      const e = c * c * (3 - 2 * c);
      const r = Math.round(priRGB[0] + (secRGB[0] - priRGB[0]) * e);
      const g = Math.round(priRGB[1] + (secRGB[1] - priRGB[1]) * e);
      const b = Math.round(priRGB[2] + (secRGB[2] - priRGB[2]) * e);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const makeSprite = (
      rgb: string,
      intensity: number = 1,
    ): HTMLCanvasElement => {
      const [r, g, b] = rgb.split(",").map((s) => parseInt(s.trim(), 10));
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const sc = c.getContext("2d")!;

      const hiFactor = 0.75 * intensity;
      const hi = `rgb(${Math.round(r + (255 - r) * hiFactor)},${Math.round(
        g + (255 - g) * hiFactor,
      )},${Math.round(b + (255 - b) * hiFactor)})`;

      const base = (al: number) => `rgba(${r},${g},${b},${al * intensity})`;
      const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, hi);
      grad.addColorStop(0.14, base(1));
      grad.addColorStop(0.32, base(0.95));
      grad.addColorStop(0.42, base(0.3));
      grad.addColorStop(0.7, base(0.08));
      grad.addColorStop(1, base(0));
      sc.fillStyle = grad;
      sc.fillRect(0, 0, 64, 64);
      return c;
    };

    const updateColors = () => {
      const style = getComputedStyle(document.documentElement);

      // Check dark theme status
      isDarkTheme = document.documentElement.classList.contains("dark");

      // Update theme-based opacities for a subtler look in dark mode
      lineAlphaVal = isDarkTheme ? 0.2 : 0.3;
      dotAlphaVal = isDarkTheme ? 0.4 : 0.5;
      flashBaseVal = isDarkTheme ? 0.27 : 0.38;
      flashPeakVal = isDarkTheme ? 0.42 : 0.55;
      atomAlphaVal = isDarkTheme ? 0.78 : 1;

      const primaryHex = isDarkTheme
        ? style.getPropertyValue("--kz-brand-accent").trim() || "#27d7a6"
        : style.getPropertyValue("--kz-brand-primary").trim() || "#00e599";
      const secondaryHex =
        style.getPropertyValue("--kz-brand-secondary").trim() || "#00a3ff";

      const hexToRgb = (hex: string, fb: number[]) => {
        const ch = /^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/.exec(hex);
        if (ch) return [+ch[1], +ch[2], +ch[3]];
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
            ]
          : fb;
      };

      priRGB = hexToRgb(
        primaryHex,
        isDarkTheme ? [39, 215, 166] : [0, 229, 153],
      );
      secRGB = hexToRgb(secondaryHex, [0, 163, 255]);

      colors = {
        primary: `${priRGB[0]}, ${priRGB[1]}, ${priRGB[2]}`,
        secondary: `${secRGB[0]}, ${secRGB[1]}, ${secRGB[2]}`,
      };

      const bondAlpha = isDarkTheme ? 0.3 : 0.38;
      bondStyle = `rgba(${colors.primary}, ${bondAlpha})`;
      primarySolid = `rgb(${priRGB[0]},${priRGB[1]},${priRGB[2]})`;
      lineGreen = `rgba(${colors.primary}, ${lineAlphaVal})`;
      lineBlue = `rgba(${colors.secondary}, ${lineAlphaVal})`;
      dotGreen = `rgba(${colors.primary}, ${dotAlphaVal})`;
      dotBlue = `rgba(${colors.secondary}, ${dotAlphaVal})`;

      // Green↔blue transition shades, pre-built so drawDNA allocates nothing
      lineMix = [];
      dotMix = [];
      for (let k = 0; k <= MIX_STEPS; k++) {
        lineMix.push(mixStyle(k / MIX_STEPS, lineAlphaVal));
        dotMix.push(mixStyle(k / MIX_STEPS, dotAlphaVal));
      }

      // Pulse colours: brand colours pushed toward white for a "hot" core
      const white = isDarkTheme ? 0.55 : 0.15;
      const hot = (c: number[]) =>
        `rgb(${Math.round(c[0] + (255 - c[0]) * white)},${Math.round(
          c[1] + (255 - c[1]) * white,
        )},${Math.round(c[2] + (255 - c[2]) * white)})`;
      pulseCol[0] = hot(priRGB);
      pulseCol[1] = hot(secRGB);
      pulseCol[2] = hot([
        (priRGB[0] + secRGB[0]) / 2,
        (priRGB[1] + secRGB[1]) / 2,
        (priRGB[2] + secRGB[2]) / 2,
      ]);

      const spriteIntensity = isDarkTheme ? 0.85 : 1;
      sprites = [
        makeSprite(colors.primary, spriteIntensity),
        makeSprite(colors.secondary, spriteIntensity),
      ];
    };

    const ANCHORS: [number, number][] = [
      [0.15, 0.2], // 0: top-left
      [0.85, 0.25], // 1: top-right
      [0.15, 0.8], // 2: bottom-left
      [0.85, 0.75], // 3: bottom-right
    ];

    const molecules = buildTemplates().map(
      (t, i) => new Molecule(t, ANCHORS[i][0], ANCHORS[i][1], PROFILES[i]),
    );

    // Clears every docking-related effect (used when the layout leaves desktop mode)
    const resetInteraction = () => {
      for (const m of molecules) {
        m.resetDock();
        m.vis = 0;
      }
      activeDocker = null;
      pairIdx = 0;
      phase = PH_IN;
      step = 0;
      gap = 0.8;
      p1.fill(0);
      p2.fill(0);
      waveActive.fill(0);
      sparkL.fill(0);
      shockT = 1;
      pulseLive = false;
      sparksLive = false;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      isMobile = width < 768;
      isDesktop = width >= 1024;
      isTablet = !isDesktop && !isMobile;
      lite = !isDesktop;
      scale = Math.max(0.65, Math.min(1.1, Math.min(width, height) / 900));

      // Pixel budget: big monitors / retina screens don't pay for pixels
      // nobody can see on a thin decorative line.
      let dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
      dpr = Math.min(
        dpr,
        Math.max(1, Math.sqrt(PIXEL_BUDGET / (width * height))),
      );

      if (isMobile) {
        ampW = 0.3;
        dnaFreq = 0.0075;
        dnaSpeed = 0.009;
        dnaLine = 2;
        dotR = 2;
      } else if (isTablet) {
        ampW = 0.2;
        dnaFreq = 0.006;
        dnaSpeed = 0.0095;
        dnaLine = 1.8;
        dotR = 1.8;
      } else {
        ampW = 0.17;
        dnaFreq = 0.005;
        dnaSpeed = 0.0105;
        dnaLine = 1.6;
        dotR = 1.6;
      }

      // Helix half-width: proportional to the screen, then smoothly saturated
      // (exponential ease-out between the knee and the max) and floored.
      const raw = Math.min(width * ampW, height * 0.34);
      const soft =
        raw <= AMP_KNEE
          ? raw
          : AMP_KNEE +
            (AMP_MAX - AMP_KNEE) *
              (1 - Math.exp(-(raw - AMP_KNEE) / (AMP_MAX - AMP_KNEE)));
      dnaAmp = Math.max(AMP_MIN, soft);

      if (!isDesktop) resetInteraction();

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) render(0);
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    // Picks a random visible rung (even DNA point index) close to the given height
    const pickRung = (anchorY: number): number => {
      const range = height * 0.25;
      let chosen = -1;
      let count = 0;
      for (let r = 0; r < DNA_RUNGS; r++) {
        const y = ys[r << 1];
        if (y < 60 || y > height - 60 || Math.abs(y - anchorY) > range)
          continue;
        count++;
        if (Math.random() * count < 1) chosen = r << 1;
      }
      return chosen;
    };

    // Sends the given molecule toward a DNA node; returns false if no rung is available yet
    const tryStartDock = (m: Molecule): boolean => {
      const i = pickRung(m.ay * height);
      if (i < 0) return false;
      // Dock on the strand that is currently on the molecule's own side
      const strand: 0 | 1 = xs1[i] < xs2[i] === m.dockDir < 0 ? 0 : 1;
      m.beginDock(i, strand);
      return true;
    };

    // Called on the exact frame a molecule snaps onto the DNA
    const onDock = (m: Molecule, nx: number, ny: number) => {
      spawnWaves(m.dockingTarget, m.profile);
      shockT = 0;
      shockI = m.dockingTarget;
      shockStrand = m.dockStrand;
      shockProf = m.profile;
      spawnSparks(nx, ny, m.profile.sparks);
    };

    // Called when the active molecule finishes its pulse and starts flying back
    const onRelease = () => {
      activeDocker = null;
      if (step >= 2)
        phase = PH_OUT; // both molecules of the pair are done: fade the pair out
      else gap = 0.35;
    };

    // Drives the whole choreography: fade in a pair, dock one by one, fade out, swap pairs
    const updateDirector = (dt: number) => {
      const pair = PAIRS[pairIdx];
      const rate = VIS_SPEED * dt;
      let allHidden = true;
      let pairShown = true;

      for (let i = 0; i < molecules.length; i++) {
        const m = molecules[i];
        const inPair = i === pair[0] || i === pair[1];
        const target = inPair && phase !== PH_OUT ? 1 : 0;
        if (m.vis < target) m.vis = Math.min(target, m.vis + rate);
        else if (m.vis > target) m.vis = Math.max(target, m.vis - rate);
        if (m.vis > 0) allHidden = false;
        if (inPair && m.vis < 1) pairShown = false;
      }

      if (phase === PH_IN) {
        if (pairShown) {
          phase = PH_RUN;
          step = 0;
          gap = 0.5;
        }
      } else if (phase === PH_RUN) {
        if (activeDocker === null && step < 2) {
          gap -= dt / 60;
          if (gap <= 0) {
            const m = molecules[pair[step]];
            if (tryStartDock(m)) {
              activeDocker = m;
              step++;
            } else {
              gap = 0.3;
            }
          }
        }
      } else if (allHidden) {
        // Pair fully faded out: reset everything and bring in the other diagonal pair
        for (const m of molecules) m.resetDock();
        pairIdx = pairIdx === 0 ? 1 : 0;
        phase = PH_IN;
        step = 0;
        activeDocker = null;
      }
    };

    const drawDNA = () => {
      const amplitude = dnaAmp;
      const frequency = dnaFreq;
      const speed = time * dnaSpeed;
      const stepY = (height + 200) / DNA_POINTS;
      const cx = width / 2;

      for (let i = 0; i < DNA_POINTS; i++) {
        const y = -100 + i * stepY;
        const phs = y * frequency + speed;
        ys[i] = y;
        xs1[i] = cx + Math.sin(phs) * amplitude;
        xs2[i] = cx + Math.cos(phs) * amplitude;
      }

      ctx.lineWidth = dnaLine;

      ctx.strokeStyle = lineGreen;
      ctx.beginPath();
      for (let r = 0; r < DNA_RUNGS; r++) {
        if (lineC[r] !== 0) continue;
        const i = r << 1;
        ctx.moveTo(xs1[i], ys[i]);
        ctx.lineTo(xs2[i], ys[i]);
      }
      ctx.stroke();

      ctx.strokeStyle = lineBlue;
      ctx.beginPath();
      for (let r = 0; r < DNA_RUNGS; r++) {
        if (lineC[r] !== 1) continue;
        const i = r << 1;
        ctx.moveTo(xs1[i], ys[i]);
        ctx.lineTo(xs2[i], ys[i]);
      }
      ctx.stroke();

      for (let r = 0; r < DNA_RUNGS; r++) {
        const c = lineC[r];
        if (c === 0 || c === 1) continue;
        const i = r << 1;
        ctx.strokeStyle = lineMix[(c * MIX_STEPS + 0.5) | 0];
        ctx.beginPath();
        ctx.moveTo(xs1[i], ys[i]);
        ctx.lineTo(xs2[i], ys[i]);
        ctx.stroke();
      }

      ctx.fillStyle = dotGreen;
      ctx.beginPath();
      for (let i = 0; i < DNA_POINTS; i++) {
        const d = i << 1;
        if (dotC[d] === 0) {
          ctx.moveTo(xs1[i] + dotR, ys[i]);
          ctx.arc(xs1[i], ys[i], dotR, 0, TAU);
        }
        if (dotC[d + 1] === 0) {
          ctx.moveTo(xs2[i] + dotR, ys[i]);
          ctx.arc(xs2[i], ys[i], dotR, 0, TAU);
        }
      }
      ctx.fill();

      ctx.fillStyle = dotBlue;
      ctx.beginPath();
      for (let i = 0; i < DNA_POINTS; i++) {
        const d = i << 1;
        if (dotC[d] === 1) {
          ctx.moveTo(xs1[i] + dotR, ys[i]);
          ctx.arc(xs1[i], ys[i], dotR, 0, TAU);
        }
        if (dotC[d + 1] === 1) {
          ctx.moveTo(xs2[i] + dotR, ys[i]);
          ctx.arc(xs2[i], ys[i], dotR, 0, TAU);
        }
      }
      ctx.fill();

      for (let i = 0; i < DNA_POINTS; i++) {
        const d = i << 1;
        let c = dotC[d];
        if (c !== 0 && c !== 1) {
          ctx.fillStyle = dotMix[(c * MIX_STEPS + 0.5) | 0];
          ctx.beginPath();
          ctx.arc(xs1[i], ys[i], dotR, 0, TAU);
          ctx.fill();
        }
        c = dotC[d + 1];
        if (c !== 0 && c !== 1) {
          ctx.fillStyle = dotMix[(c * MIX_STEPS + 0.5) | 0];
          ctx.beginPath();
          ctx.arc(xs2[i], ys[i], dotR, 0, TAU);
          ctx.fill();
        }
      }
    };

    // Draws the gene-activation light travelling along the strands and rungs
    const drawPulse = () => {
      // Opacity gains follow the theme-tuned variables so dark mode stays subtle
      const lineGain = Math.min(1, flashPeakVal * 1.6);
      ctx.lineCap = "round";

      // Backbone segments (each strand has its own light value for the relay mode)
      for (let i = 0; i < DNA_POINTS - 1; i++) {
        const q1 = (p1[i] + p1[i + 1]) * 0.5;
        const q2 = (p2[i] + p2[i + 1]) * 0.5;
        if (q1 < PULSE_MIN && q2 < PULSE_MIN) continue;
        const t = pulseTint[i];
        if (q1 >= PULSE_MIN) {
          ctx.lineWidth = 1 + 2.4 * q1;
          ctx.globalAlpha = Math.min(1, lineGain * q1 * 1.2);
          ctx.strokeStyle = pulseCol[t];
          ctx.beginPath();
          ctx.moveTo(xs1[i], ys[i]);
          ctx.lineTo(xs1[i + 1], ys[i + 1]);
          ctx.stroke();
        }
        if (q2 >= PULSE_MIN) {
          ctx.lineWidth = 1 + 2.4 * q2;
          ctx.globalAlpha = Math.min(1, lineGain * q2 * 1.2);
          ctx.strokeStyle = pulseCol[t === 2 ? 2 : 1 - t];
          ctx.beginPath();
          ctx.moveTo(xs2[i], ys[i]);
          ctx.lineTo(xs2[i + 1], ys[i + 1]);
          ctx.stroke();
        }
      }

      // Rungs (only even points carry a base-pair rung)
      for (let i = 0; i < DNA_POINTS; i += 2) {
        const p = p1[i] > p2[i] ? p1[i] : p2[i];
        if (p < PULSE_MIN) continue;
        ctx.lineWidth = 1.5 + 2.8 * p;
        ctx.globalAlpha = Math.min(1, lineGain * p);
        ctx.strokeStyle = pulseCol[pulseTint[i]];
        ctx.beginPath();
        ctx.moveTo(xs1[i], ys[i]);
        ctx.lineTo(xs2[i], ys[i]);
        ctx.stroke();
      }

      // Soft glowing nodes whose radius grows with intensity
      for (let i = 0; i < DNA_POINTS; i++) {
        const a = p1[i];
        const b = p2[i];
        if (a < PULSE_MIN && b < PULSE_MIN) continue;
        const t = pulseTint[i];
        if (a >= PULSE_MIN) {
          const s = (8 + 22 * a) * scale;
          ctx.globalAlpha = Math.min(1, atomAlphaVal * a);
          ctx.drawImage(
            sprites[t === 1 ? 1 : 0],
            xs1[i] - s / 2,
            ys[i] - s / 2,
            s,
            s,
          );
        }
        if (b >= PULSE_MIN) {
          const s = (8 + 22 * b) * scale;
          ctx.globalAlpha = Math.min(1, atomAlphaVal * b);
          ctx.drawImage(
            sprites[t === 1 ? 0 : 1],
            xs2[i] - s / 2,
            ys[i] - s / 2,
            s,
            s,
          );
        }
      }
      ctx.globalAlpha = 1;
    };

    // Traces a circle (sides < 3) or a regular polygon into the current path
    const tracePoly = (
      x: number,
      y: number,
      r: number,
      sides: number,
      rot: number,
    ) => {
      if (sides < 3) {
        ctx.arc(x, y, r, 0, TAU);
        return;
      }
      for (let k = 0; k < sides; k++) {
        const a = rot + (k * TAU) / sides;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // Draws the docking flash, the expanding profile-specific rings and the sparks
    const drawShock = () => {
      if (shockT < 1) {
        const t = shockT;
        const k = 1 - t;
        const sp = shockProf;
        const x = shockStrand === 1 ? xs2[shockI] : xs1[shockI];
        const y = ys[shockI];
        const c1 = sp.tint === 1 ? 1 : 0;

        // Central flash
        const fs = (40 + 70 * t) * scale;
        ctx.globalAlpha = Math.min(1, atomAlphaVal * k * k * 1.2);
        ctx.drawImage(sprites[c1], x - fs / 2, y - fs / 2, fs, fs);

        // Staggered rings; their shape (circle / triangle / diamond / hexagon) depends on the molecule
        const rot = sp.sides >= 3 ? t * 1.2 : 0;
        for (let r = 0; r < sp.rings; r++) {
          const off = r * 0.18;
          const tr = (t - off) / (1 - off);
          if (tr <= 0) continue;
          const kr = 1 - tr;
          ctx.lineWidth = 0.6 + (2 - r * 0.5) * kr;
          ctx.strokeStyle = pulseCol[sp.tint === 2 ? 2 : (sp.tint + r) & 1];
          ctx.globalAlpha = Math.min(
            1,
            flashPeakVal * 1.6 * kr * kr * (1 - r * 0.15),
          );
          ctx.beginPath();
          tracePoly(x, y, (6 + tr * (95 - r * 12)) * scale, sp.sides, rot);
          ctx.stroke();
        }
      }

      for (let k = 0; k < SPARKS; k++) {
        const life = sparkL[k];
        if (life <= 0) continue;
        const s = (4 + 10 * life) * scale;
        ctx.globalAlpha = Math.min(1, life * atomAlphaVal * 1.2);
        ctx.drawImage(
          sprites[k & 1],
          sparkX[k] - s / 2,
          sparkY[k] - s / 2,
          s,
          s,
        );
      }
      ctx.globalAlpha = 1;
    };

    const trace = (b: Bond, off: number) => {
      const x1 = b.s.sx;
      const y1 = b.s.sy;
      const x2 = b.t.sx;
      const y2 = b.t.sy;
      if (b.order === 1) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        return;
      }
      const dx = x2 - x1;
      const dy = y2 - y1;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const px = (-dy / d) * off;
      const py = (dx / d) * off;
      ctx.moveTo(x1 + px, y1 + py);
      ctx.lineTo(x2 + px, y2 + py);
      ctx.moveTo(x1 - px, y1 - py);
      ctx.lineTo(x2 - px, y2 - py);
    };

    const render = (dt: number) => {
      ctx.clearRect(0, 0, width, height);

      time += dt;
      clock += dt / 60;

      if (dt > 0) {
        stepDNA(dt);
        if (isDesktop) {
          stepPulse(dt);
          stepSparks(dt);
          if (shockT < 1) shockT = Math.min(1, shockT + SHOCK_SPEED * dt);
        }
      }

      // Base DNA: plain source-over (cheap). Additive blending is only used
      // for the glowing effects, and only while one is actually visible.
      drawDNA();
      if (isDesktop && (pulseLive || sparksLive || shockT < 1)) {
        ctx.globalCompositeOperation = "lighter";
        drawPulse();
        drawShock();
        ctx.globalCompositeOperation = "source-over";
      }

      if (isDesktop) {
        const damp = Math.pow(0.9, dt);
        const sec = dt / 60;

        if (dt > 0) updateDirector(dt);

        for (const m of molecules) {
          // Hidden molecules cost nothing: no physics, no drawing
          if (m.vis <= VIS_EPS) continue;
          if (dt > 0) m.step(dt, damp);

          const fx = m.ax * width + Math.sin(clock * 0.15 + m.ph1) * 30 * scale;
          const fy =
            m.ay * height + Math.cos(clock * 0.12 + m.ph2) * 30 * scale;

          // Live position of the DNA node this molecule is targeting
          const target = m.dockingTarget;
          let nx = 0;
          let ny = 0;
          if (target >= 0) {
            nx = m.dockStrand === 1 ? xs2[target] : xs1[target];
            ny = ys[target];
          }

          if (m.updateDock(dt, fx, fy, nx, ny, scale)) onDock(m, nx, ny);

          // Keep the docked node lit while the molecule is attached
          if (m.dockState === DOCK_DOCKED && target >= 0 && p1[target] < 0.6) {
            p1[target] = 0.6;
            p2[target] = 0.6;
            pulseTint[target] = m.profile.tint;
          }

          // The pulse is finished and the molecule starts leaving
          if (activeDocker === m && m.dockState === DOCK_RELEASE) onRelease();

          m.rot += (m.rotSpeed + m.spinNow) * sec;
          const cs = Math.cos(m.rot);
          const sn = Math.sin(m.rot);
          for (const a of m.atoms) {
            a.sx = m.cx + (a.x * cs - a.y * sn) * scale;
            a.sy = m.cy + (a.x * sn + a.y * cs) * scale;
          }
        }

        const off = 1.8 * scale;
        ctx.lineCap = "round";

        // Bonds (stable ones batched into one path per molecule, flashing ones drawn individually)
        for (const m of molecules) {
          if (m.vis <= VIS_EPS) continue;

          ctx.globalAlpha = m.vis;
          ctx.strokeStyle = bondStyle;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (const b of m.bonds) {
            if (!b.dying && b.a >= 1 && b.flash <= 0) trace(b, off);
          }
          ctx.stroke();

          ctx.strokeStyle = primarySolid;
          for (const b of m.bonds) {
            if (!b.dying && b.a >= 1 && b.flash <= 0) continue;
            const al = Math.min(
              1,
              flashBaseVal * Math.max(b.a, 0) + flashPeakVal * b.flash,
            );
            ctx.globalAlpha = al * m.vis;
            ctx.lineWidth = 1.4 + b.flash * 1.1;
            ctx.beginPath();
            trace(b, off);
            ctx.stroke();
          }
        }

        // Activated molecules light up their bonds after docking
        for (const m of molecules) {
          if (m.vis <= VIS_EPS || m.glow <= 0.02) continue;
          ctx.globalAlpha = Math.min(1, flashPeakVal * m.glow * 1.5) * m.vis;
          ctx.strokeStyle = pulseCol[m.profile.tint];
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (const b of m.bonds) {
            if (!b.dying && b.a >= 1) trace(b, off);
          }
          ctx.stroke();
        }

        // Binding tether between the docked molecule and the DNA node
        for (const m of molecules) {
          const target = m.dockingTarget;
          if (m.vis <= VIS_EPS || target < 0 || m.dockProgress <= 0.6) continue;
          const nx = m.dockStrand === 1 ? xs2[target] : xs1[target];
          const ny = ys[target];

          let best: Atom | null = null;
          let bestD = Infinity;
          for (const a of m.atoms) {
            if (a.dying) continue;
            const dx = a.sx - nx;
            const dy = a.sy - ny;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = a;
            }
          }
          if (!best) continue;

          const ramp = (m.dockProgress - 0.6) / 0.4;
          ctx.globalAlpha =
            Math.min(1, flashPeakVal * (0.6 + 1.4 * m.glow) * ramp) * m.vis;
          ctx.strokeStyle = pulseCol[m.profile.tint];
          ctx.lineWidth = 1.2 + 1.6 * m.glow;
          ctx.beginPath();
          ctx.moveTo(best.sx, best.sy);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }

        // Atoms (sprites), brighter and larger while the molecule is activated
        for (const m of molecules) {
          if (m.vis <= VIS_EPS) continue;
          const boost = 1 + 0.45 * m.glow;
          for (const a of m.atoms) {
            const s = a.r * scale * 6 * (0.65 + 0.35 * a.a) * boost;
            const al =
              (a.a < 0 ? 0 : a.a) * atomAlphaVal * (1 + 0.8 * m.glow) * m.vis;
            ctx.globalAlpha = al > 1 ? 1 : al;
            ctx.drawImage(sprites[a.kind], a.sx - s / 2, a.sy - s / 2, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = now - last;
      if (elapsed < interval - 2) return;
      last = now;

      const t0 = performance.now();
      render(Math.min(elapsed, 50) / 16.667);
      ema = ema * 0.9 + (performance.now() - t0) * 0.1;

      if (ema > 9 && interval < 50) interval = 50;
      else if (ema < 3.5 && interval > 34) interval = 1000 / 30;
    };

    // Reduced motion: show the first pair statically (no director, no docking)
    if (reduceMotion) {
      for (const idx of PAIRS[0]) molecules[idx].vis = 1;
    }

    updateColors();
    resize();
    if (!reduceMotion) raf = requestAnimationFrame(frame);

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

    // Only the theme-relevant bits of <html> are compared; scroll-lock classes,
    // inline overflow styles, etc. no longer trigger getComputedStyle + sprite rebuilds.
    const readThemeSig = () => {
      const root = document.documentElement;
      const vars = (root.getAttribute("style") || "").match(/--kz[^;]*/g);
      return `${root.classList.contains("dark")}|${root.getAttribute("data-theme")}|${vars ? vars.join(";") : ""}`;
    };
    themeSig = readThemeSig();
    const observer = new MutationObserver(() => {
      const sig = readThemeSig();
      if (sig === themeSig) return;
      themeSig = sig;
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(() => {
        updateColors();
        if (reduceMotion) render(0);
      }, 60);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(themeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none w-full h-full"
      aria-hidden="true"
    />
  );
};
