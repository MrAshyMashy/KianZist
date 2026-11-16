"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  startTransition,
  ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useEffects } from "@/providers/EffectsProvider";
import { useIntroReady } from "@/lib/siteStatus";
import { faHomeData } from "@/data/fa/home";
import { enHomeData } from "@/data/en/home";
import { Hero } from "./Hero";
import { Efficacy } from "./Efficacy";
import { FieldEvidence } from "./FieldEvidence";
import { Pillars } from "./Pillars";
import { RhizosphereExplorer } from "./RhizosphereExplorer";
import { Formulations } from "./Formulations";
import { FermentationHub } from "./FermentationHub";
import { Chronology } from "./Chronology";
import { Impact } from "./Impact";
import { Publications } from "./Publications";
import { Consultation } from "./Consultation";
import { MolecularBackground2D } from "@/components/shared/MolecularBackground2D";
import { RhizosphereBackground } from "@/components/shared/RhizosphereBackground";
import { ScrollIndicator } from "@/components/ui/Motion/ScrollIndicator";
import { SectionDots } from "@/components/ui/Motion/SectionDots";
import { MainWrapper } from "@/components/ui/MainWrapper";
import { cn } from "@/lib/utils";
import { setHomeSection, registerHomeScroller } from "@/lib/homeScroll";

interface HomeSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  first?: boolean;
}

/**
 * `kz-cv` (see styles/perf.css) lets the browser skip layout / paint /
 * backdrop-blur for sections that are far from the viewport on desktop.
 * The hero is excluded so it is always ready for the intro.
 */
const HomeSection = ({ id, children, className, first }: HomeSectionProps) => {
  return (
    <section
      id={id}
      data-home-section=""
      className={cn(
        "relative w-full lg:h-dvh lg:min-h-0 lg:snap-start lg:snap-always",
        "min-h-fit",
        first ? "kz-home-first" : "kz-home-rest kz-cv",
        className,
      )}
    >
      {children}
    </section>
  );
};

/** Top of `el` measured inside the scroll container's content box */
const topInside = (container: HTMLElement, el: HTMLElement) =>
  el.getBoundingClientRect().top -
  container.getBoundingClientRect().top +
  container.scrollTop;

const isTypingTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return (
    el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
  );
};

const HomeComponent = () => {
  const { effectsEnabled } = useEffects();
  const { lang } = useLanguage();
  const data = lang === "fa" ? faHomeData : enHomeData;

  const sectionLabels = data.sectionLabels || [];
  const SECTIONS_COUNT = sectionLabels.length;

  const introReady = useIntroReady();

  const [isMounted, setIsMounted] = useState(false);
  // Desktop (lg+) gets the DNA canvas; tablet & mobile get the light corner decoration
  const [isLg, setIsLg] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const activeRef = useRef(0);

  // Bumped whenever the layout crosses a breakpoint (md / lg). The sections are
  // re-mounted so every entrance / in-view animation re-arms for the new layout
  // instead of keeping stale "hidden" state from the previous one.
  const [layoutEpoch, setLayoutEpoch] = useState(0);

  // Per-section re-mount keys (index 0 = Hero). Bumping a key re-mounts that
  // section's content so its entrance animation starts from a clean state.
  const [sectionKeys, setSectionKeys] = useState<Record<number, number>>({});
  const keyOf = (i: number) => sectionKeys[i] ?? 0;
  const rearm = useCallback((i: number) => {
    setSectionKeys((prev) => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }));
  }, []);

  // The Hero is re-armed every time the visitor comes back to it by manual scrolling
  const heroGone = useRef(false);
  // Live "is the hero on screen" flag, written by the IntersectionObserver below
  const heroVisible = useRef(true);
  const restoreIdx = useRef(0);
  // True while a teleport is in progress (see teleportTo)
  const jumping = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    activeRef.current = activeSection;
    setHomeSection(activeSection);
  }, [activeSection]);
  useEffect(() => () => setHomeSection(0), []);

  const getSections = useCallback(
    () =>
      containerRef.current
        ? Array.from(
            containerRef.current.querySelectorAll<HTMLElement>(
              "[data-home-section]",
            ),
          )
        : [],
    [],
  );

  /**
   * Scroll tracking with IntersectionObserver instead of a scroll handler.
   * The old handler read getBoundingClientRect() of every section on every
   * scroll frame (forced layout). Observers are computed by the browser off
   * the hot path and works for both layouts (desktop snap slots and stacked
   * mobile sections).
   *
   *  • activeIO : the section that crosses the vertical middle of the
   *               container is the active one (same rule as before: top ≤ 50%)
   *  • viewIO   : writes data-inview on every section (no re-render) so CSS can
   *               pause its infinite animations, and drives the Hero re-arm
   */
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const sections = getSections();
    if (!sections.length) return;

    // fresh DOM (first mount / breakpoint re-mount): forget stale state
    heroGone.current = false;
    heroVisible.current = true;

    const activeIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idx = sections.indexOf(e.target as HTMLElement);
          if (idx >= 0) setActiveSection(Math.min(idx, SECTIONS_COUNT - 1));
        }
      },
      { root: c, rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    const viewIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          el.dataset.inview = e.isIntersecting ? "true" : "false";

          if (el !== sections[0]) continue;
          heroVisible.current = e.isIntersecting;

          // Hero fully scrolled out → remember it; the moment its edge re-enters,
          // re-arm it (skipped during a teleport: teleportTo re-arms the target itself)
          if (jumping.current) continue;
          if (!e.isIntersecting) {
            heroGone.current = true;
          } else if (heroGone.current) {
            heroGone.current = false;
            // low priority: the remount must never block the scroll itself
            startTransition(() => rearm(0));
          }
        }
      },
      { root: c, rootMargin: "0px", threshold: 0 },
    );

    sections.forEach((s) => {
      activeIO.observe(s);
      viewIO.observe(s);
    });

    return () => {
      activeIO.disconnect();
      viewIO.disconnect();
    };
  }, [layoutEpoch, getSections, SECTIONS_COUNT, rearm]);

  // Smooth scroll: only used by the keyboard arrows (one section at a time)
  const scrollToSection = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      if (index < 0 || index >= SECTIONS_COUNT) return;

      const el = getSections()[index];
      if (!el) return;

      container.scrollTo({
        top: topInside(container, el),
        behavior: "smooth",
      });
    },
    [SECTIONS_COUNT, getSections],
  );

  // Instant "teleport" used by the dots and the navbar, whatever the distance.
  // The container has `scroll-smooth` + `snap-mandatory`, which make the browser
  // travel through every section in between. They are switched off for the jump
  // and restored right after, so the target appears immediately.
  const teleportTo = useCallback(
    (index: number) => {
      const c = containerRef.current;
      if (!c) return;
      if (index < 0 || index >= SECTIONS_COUNT) return;
      if (index === activeRef.current) return;

      const el = getSections()[index];
      if (!el) return;

      jumping.current = true;
      heroGone.current = false;

      c.style.scrollBehavior = "auto";
      c.style.scrollSnapType = "none";
      c.scrollTop = topInside(c, el);

      // update immediately so the dots / navbar react without waiting for the observer
      activeRef.current = index;
      setActiveSection(index);

      // fresh entrance animation for the target section
      rearm(index);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // give control back to the CSS classes (scroll-smooth / snap)
          c.style.scrollBehavior = "";
          c.style.scrollSnapType = "";
          // the observer kept heroVisible up to date during the jump
          heroGone.current = !heroVisible.current;
          jumping.current = false;
        });
      });
    },
    [SECTIONS_COUNT, getSections, rearm],
  );

  useEffect(() => registerHomeScroller(teleportTo), [teleportTo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth < 1024) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeSection < SECTIONS_COUNT - 1) {
          scrollToSection(activeSection + 1);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeSection > 0) {
          scrollToSection(activeSection - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSection, scrollToSection, SECTIONS_COUNT]);

  /* ── responsive: breakpoint crossing ── */
  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 768px)"),
      window.matchMedia("(min-width: 1024px)"),
    ];
    const onBreakpoint = () => {
      restoreIdx.current = activeRef.current;
      setLayoutEpoch((e) => e + 1);
    };
    queries.forEach((q) => q.addEventListener("change", onBreakpoint));
    return () => {
      queries.forEach((q) => q.removeEventListener("change", onBreakpoint));
    };
  }, []);

  // After the re-mount, put the visitor back on the section they were viewing
  useEffect(() => {
    if (layoutEpoch === 0) return;
    let r2 = 0;
    let r3 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const c = containerRef.current;
        const el = getSections()[restoreIdx.current];
        if (c && el) {
          jumping.current = true;
          c.style.scrollBehavior = "auto";
          c.style.scrollSnapType = "none";
          c.scrollTop = topInside(c, el);
          r3 = requestAnimationFrame(() => {
            c.style.scrollBehavior = "";
            c.style.scrollSnapType = "";
            heroGone.current = !heroVisible.current;
            jumping.current = false;
          });
        }
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      cancelAnimationFrame(r3);
    };
  }, [layoutEpoch, getSections]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={containerRef}
        className="hide-scrollbar relative h-[calc(100dvh-4rem)] w-full overflow-y-auto lg:-mt-16 lg:h-dvh lg:snap-y lg:snap-mandatory lg:overflow-y-scroll lg:scroll-smooth"
      >
        {isMounted &&
          introReady &&
          effectsEnabled &&
          (isLg ? <MolecularBackground2D /> : <RhizosphereBackground />)}

        <MainWrapper key={layoutEpoch} className="w-full lg:h-full">
          <HomeSection id="hero" first>
            {introReady && <Hero key={keyOf(0)} data={data.hero} lang={lang} />}
          </HomeSection>

          <HomeSection id="efficacy">
            <Efficacy key={keyOf(1)} data={data.efficacy} lang={lang} />
          </HomeSection>

          <HomeSection id="field-evidence">
            <FieldEvidence
              key={keyOf(2)}
              data={data.fieldEvidence}
              lang={lang}
            />
          </HomeSection>

          <HomeSection id="pillars">
            <Pillars key={keyOf(3)} data={data.pillars} lang={lang} />
          </HomeSection>

          <HomeSection id="rhizosphere-explorer">
            <RhizosphereExplorer
              key={keyOf(4)}
              data={data.rhizosphereExplorer}
              lang={lang}
            />
          </HomeSection>

          <HomeSection id="formulations">
            <Formulations key={keyOf(5)} data={data.formulations} lang={lang} />
          </HomeSection>

          <HomeSection id="fermentation-hub">
            <FermentationHub
              key={keyOf(6)}
              data={data.fermentationHub}
              lang={lang}
            />
          </HomeSection>

          <HomeSection id="chronology">
            <Chronology key={keyOf(7)} data={data.chronology} lang={lang} />
          </HomeSection>

          <HomeSection id="impact">
            <Impact key={keyOf(8)} data={data.impact} lang={lang} />
          </HomeSection>

          <HomeSection id="publications">
            <Publications key={keyOf(9)} data={data.publications} lang={lang} />
          </HomeSection>

          <HomeSection id="consultation">
            <Consultation
              key={keyOf(10)}
              data={data.consultation}
              lang={lang}
            />
          </HomeSection>
        </MainWrapper>

        {introReady && activeSection === 0 && (
          <ScrollIndicator
            className="fixed bottom-[clamp(0.6rem,2vh,1.75rem)] left-1/2 z-40 hidden -translate-x-1/2 lg:flex [@media(max-height:660px)]:!hidden"
            delay={1}
          />
        )}

        {introReady && (
          <SectionDots
            count={SECTIONS_COUNT}
            activeIndex={activeSection}
            labels={sectionLabels}
            onSelect={teleportTo}
            className="hidden lg:flex"
          />
        )}
      </div>
    </MotionConfig>
  );
};

export default HomeComponent;
