/**
 * Performance tiers.
 *
 * "high" keeps every effect exactly as designed. "mid" / "low" only shrink
 * hidden-cost knobs (e.g. backdrop-blur radius via --kz-blur-scale) — nothing
 * is removed. The tier is stored on <html data-perf="…">.
 */
export type PerfTier = "high" | "mid" | "low";

const ORDER: PerfTier[] = ["high", "mid", "low"];

const setTier = (tier: PerfTier) => {
  document.documentElement.dataset.perf = tier;
};

export const getPerfTier = (): PerfTier =>
  (document.documentElement.dataset.perf as PerfTier) || "high";

/** Static guess from hardware hints (runs once, instantly). */
export const applyPerfTier = (): PerfTier => {
  const n = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = n.hardwareConcurrency ?? 4;
  const mem = n.deviceMemory ?? 8; // not exposed on Safari/Firefox → assume fine
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  let tier: PerfTier = "high";
  if (n.connection?.saveData || cores <= 2 || mem <= 2) tier = "low";
  else if (cores <= 4 || mem <= 4 || coarse) tier = "mid";

  setTier(tier);
  return tier;
};

/**
 * Real-world check: samples ~90 frames a few seconds after the intro and
 * steps the tier down once if the median frame is slower than ~38 fps.
 * It never steps up. Returns a cleanup function.
 */
export const probePerf = (): (() => void) => {
  let raf = 0;
  let timer = 0;
  let stopped = false;

  const sample = () => {
    const deltas: number[] = [];
    let prev = 0;

    const tick = (t: number) => {
      if (stopped) return;
      if (document.hidden) {
        // tab in background → discard the sample and start over
        deltas.length = 0;
        prev = 0;
      } else {
        if (prev) deltas.push(t - prev);
        prev = t;
      }
      if (deltas.length < 90) {
        raf = requestAnimationFrame(tick);
        return;
      }
      deltas.sort((a, b) => a - b);
      const median = deltas[deltas.length >> 1];
      if (median > 26) {
        const i = ORDER.indexOf(getPerfTier());
        if (i < ORDER.length - 1) setTier(ORDER[i + 1]);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  timer = window.setTimeout(sample, 3000);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
};