"use client";

import { useSyncExternalStore } from "react";

/* Tiny store: which snap-section of the Home page is active.
   Home writes it, Navbar reads it (navbar only shows on section 0). */
let current = 0;
const subs = new Set<() => void>();

export const setHomeSection = (n: number) => {
  if (n === current) return;
  current = n;
  subs.forEach((f) => f());
};

/* Non-reactive read (used by the context menu at the moment of the click) */
export const getHomeSection = () => current;

export const useHomeSection = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => current,
    () => 0,
  );

/* Lets the Navbar (or anything else) ask the Home page to snap to a section */
let scroller: ((index: number) => void) | null = null;

export const registerHomeScroller = (fn: (index: number) => void) => {
  scroller = fn;
  return () => {
    if (scroller === fn) scroller = null;
  };
};

export const scrollHomeTo = (index: number) => scroller?.(index);
