import { useSyncExternalStore } from "react";
import { isFirstLoad } from "@/lib/appState";

/**
 * Tiny store that tells the rest of the app whether the intro loader
 * is still running. The Navbar and the Hero both wait for it before
 * playing their entrance animations.
 *
 *  idle    → nothing decided yet (first render) or no loader on this page
 *  loading → LoadingScreen is on screen (entrance animations must wait)
 *  ready   → LoadingScreen is exiting / gone (entrances may play now)
 */
export type SiteStatus = "idle" | "loading" | "ready";

let status: SiteStatus = "idle";
const listeners = new Set<() => void>();

export const setSiteStatus = (next: SiteStatus) => {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
};

export const useSiteStatus = (): SiteStatus =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => status,
    () => "idle" as SiteStatus,
  );

/**
 * Intro choreography (seconds, measured from the moment the loader starts
 * to exit). The loader's curtain opens from the middle outwards, so the
 * navbar (top edge) is the last thing it uncovers. The navbar therefore
 * starts first and the hero follows right behind it.
 */
export const INTRO = {
  nav: 0.4,
  hero: 0.9,
} as const;

/**
 * True once entrance animations are allowed to play.
 * - first page load: only after the loader has started to exit ("ready")
 * - later visits (client navigation): immediately
 * This closes the old gap where the very first render (status = "idle")
 * let the Hero mount and animate underneath the loader.
 */
export const useIntroReady = (): boolean => {
  const s = useSiteStatus();
  return s === "ready" || (s === "idle" && !isFirstLoad());
};
