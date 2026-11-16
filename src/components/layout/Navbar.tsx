"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "next-themes";
import { Moon, Sun, X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import Typography from "@/typography";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { IconButton } from "@/components/ui/IconButton";
import { Magnetic } from "@/components/ui/Fx";
import { GradientButton } from "@/components/ui/GradientButton";
import { useIntroReady, INTRO } from "@/lib/siteStatus";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useSpinner } from "@/components/ui/Spinner";
import { useHomeSection, scrollHomeTo } from "@/lib/homeScroll";

/* ════════════════════════════════════════════════════════════
   Self-drawing line icons (stroke is "written" on load,
   and re-written every time the item is clicked)
   ════════════════════════════════════════════════════════════ */
type IconName =
  | "home"
  | "products"
  | "knowledge"
  | "publications"
  | "news"
  | "about"
  | "contact"
  | "login";

const ICONS: Record<IconName, string[]> = {
  // خانه
  home: [
    "M3 10.5 12 3l9 7.5",
    "M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5",
    "M9.5 21v-6h5v6",
  ],
  // محصولات (فلاسک آزمایشگاهی)
  products: [
    "M9 3h6",
    "M10 3v6.2L4.6 18.4A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.6L14 9.2V3",
    "M7.5 15h9",
  ],
  // دانش و آموزش (کلاه فارغ‌التحصیلی)
  knowledge: [
    "M2 9.5 12 4.5l10 5-10 5-10-5Z",
    "M6 12v4.5c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5V12",
    "M22 9.5v6",
  ],
  // مقالات علمی (برگه مقاله)
  publications: [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z",
    "M14 3v5h5",
    "M8.5 12.5h7",
    "M8.5 16h5",
  ],
  // اخبار (بلندگو / اطلاع‌رسانی)
  news: [
    "M4 10.5v3a1 1 0 0 0 1 1h2l7 4V5.5l-7 4H5a1 1 0 0 0-1 1Z",
    "M17.5 9a4 4 0 0 1 0 6",
    "M20 6.5a8 8 0 0 1 0 11",
    "M7.5 14.5 8.8 19.5h2.2l-1-3.3",
  ],
  // درباره ما
  about: [
    "M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z",
    "M12 8.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z",
    "M8.2 16.4c.8-1.5 2.1-2.2 3.8-2.2s3 .7 3.8 2.2",
  ],
  // تماس با ما
  contact: [
    "M5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5Z",
    "m4 7.5 8 6 8-6",
  ],
  // ورود (دروازه‌ی شش‌ضلعی هم‌خانواده با لوگو + فلش ورود به داخل)
  login: [
    "M7 7 14 3l7 4v10l-7 4-7-4",
    "M2.5 12H13.5",
    "m10 8.5 3.5 3.5-3.5 3.5",
  ],
};

const NavIcon = ({
  name,
  play,
  replayKey = 0,
  delay = 0,
  size = 17,
  className = "",
  animateEntrance = true,
}: {
  name: IconName;
  play: boolean;
  replayKey?: number;
  delay?: number;
  size?: number;
  className?: string;
  animateEntrance?: boolean;
}) => {
  const d = replayKey > 0 ? 0 : delay;
  const shouldAnimate = replayKey > 0 || animateEntrance;

  return (
    <motion.svg
      key={replayKey}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      initial={shouldAnimate ? "hidden" : false}
      animate={play ? "show" : "hidden"}
    >
      {ICONS[name].map((p, i) => (
        <motion.path
          key={i}
          d={p}
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            show: {
              pathLength: 1,
              opacity: 1,
              transition: {
                pathLength: {
                  duration: 0.9,
                  ease: "easeInOut",
                  delay: d + i * 0.14,
                },
                opacity: { duration: 0.05, delay: d + i * 0.14 },
              },
            },
          }}
        />
      ))}
    </motion.svg>
  );
};

const navLinks: { key: IconName; href: string }[] = [
  { key: "home", href: "/" },
  { key: "products", href: "/products" },
  { key: "knowledge", href: "/training" },
  { key: "publications", href: "/publications" },
  { key: "news", href: "/news" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

const navLabels: Record<IconName, { fa: string; en: string }> = {
  home: { fa: "صفحه اصلی", en: "Home" },
  products: { fa: "محصولات", en: "Products" },
  knowledge: { fa: "دانش و آموزش", en: "Knowledge" },
  publications: { fa: "مقالات علمی", en: "Publications" },
  news: { fa: "اخبار", en: "News" },
  about: { fa: "درباره ما", en: "About Us" },
  contact: { fa: "تماس با ما", en: "Contact" },
  login: { fa: "ورود", en: "Login" },
};

const keyFromPath = (pathname: string | null): IconName | null => {
  if (!pathname) return null;
  if (pathname === "/") return "home";
  const found = navLinks.find(
    (l) =>
      l.href !== "/" &&
      (pathname === l.href || pathname.startsWith(l.href + "/")),
  );
  return found ? found.key : null;
};

const EASE = [0.22, 1, 0.36, 1] as const;
// Navbar enters first; the Hero follows (see INTRO in lib/siteStatus)
const ENTRANCE_DELAY = INTRO.nav;

const panelV: Variants = {
  hidden: { opacity: 0, y: -16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: EASE,
      when: "beforeChildren",
      staggerChildren: 0.06,
    },
  },
};

const rowV: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

/* orb centre: fa → right side, en → left side (right/left: 1.5rem + 24px, top: 1.25rem + 24px) */
const orbPos = (fa: boolean) =>
  fa ? "calc(100% - 3rem) 2.75rem" : "3rem 2.75rem";

const modalPanelV: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: -14 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE,
      when: "beforeChildren",
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -10,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const modalItemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export const Navbar = () => {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { run } = useSpinner();
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/";

  const homeSection = useHomeSection();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const introReady = useIntroReady();
  const reduceMotion = useReducedMotion();
  // The navbar only steps aside once the intro is over, on Home, on desktop
  const navHidden = isHome && isDesktop && introReady && homeSection > 0;

  useEffect(() => {
    if (!navHidden) setModalOpen(false);
  }, [navHidden]);
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const [activeLink, setActiveLink] = useState<IconName | null>(() =>
    keyFromPath(pathname),
  );
  const prevKey = useRef<IconName | null>(activeLink);

  const [drawKeys, setDrawKeys] = useState<Partial<Record<IconName, number>>>(
    {},
  );
  const replay = useCallback((k: IconName) => {
    setDrawKeys((p) => ({ ...p, [k]: (p[k] ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    const k = keyFromPath(pathname);
    if (k !== prevKey.current) {
      prevKey.current = k;
      setActiveLink(k);
      if (k) replay(k);
    }
  }, [pathname, replay]);

  /* menu-panel helpers */
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => {
    if (!modalOpen) setHoverIdx(null);
  }, [modalOpen]);
  const activeIdx = Math.max(
    0,
    navLinks.findIndex((l) => l.key === activeLink),
  );
  const shownIdx = hoverIdx ?? activeIdx;
  const fmtNum = (n: number) => {
    const s = String(n + 1).padStart(2, "0");
    return lang === "fa" ? s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : s;
  };

  const handleNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: { key: IconName; href: string },
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;
    e.preventDefault();
    setMenuOpen(false);
    setModalOpen(false);
    if (link.href === "/" && pathname === "/") scrollHomeTo(0);
    prevKey.current = link.key;
    setActiveLink(link.key);
    replay(link.key);
    if (pathname !== link.href) {
      run(() => router.push(link.href));
    }
  };

  // Safety net: never leave the navbar hidden forever if the loader stalls
  const [forced, setForced] = useState(false);
  useEffect(() => {
    setMounted(true);
    const f = setTimeout(() => setForced(true), 15000);
    return () => clearTimeout(f);
  }, []);

  const navEntered = !isHome || (mounted && (introReady || forced));

  // Remember that the navbar has been "away" so it returns with a plain fade
  // instead of replaying the entrance choreography.
  const [wasAway, setWasAway] = useState(false);
  useEffect(() => {
    if (navHidden) setWasAway(true);
  }, [navHidden]);

  /* ── Entrance / fade-away are plain CSS transitions driven by state.
        No framer-motion variant propagation is involved, so an interrupted
        animation can never leave the navbar content stuck on "hidden". ── */
  const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

  const enter = (
    delay: number,
    from = "translateY(-14px)",
    dur = 0.65,
  ): React.CSSProperties => ({
    opacity: navEntered ? 1 : 0,
    transform: navEntered ? "none" : from,
    transition: `opacity ${dur}s ${EASE_CSS} ${delay}s, transform ${dur}s ${EASE_CSS} ${delay}s`,
  });

  const headerStyle: React.CSSProperties = {
    opacity: !navEntered || navHidden ? 0 : 1,
    transform: navEntered ? "none" : "translateY(-28px)",
    visibility: navHidden ? "hidden" : "visible",
    transition: !navEntered
      ? "none"
      : navHidden
        ? "opacity 0.5s ease-in-out, visibility 0s linear 0.5s"
        : wasAway
          ? `opacity 0.55s ${EASE_CSS}, visibility 0s`
          : `opacity 0.7s ${EASE_CSS} ${ENTRANCE_DELAY}s, transform 0.7s ${EASE_CSS} ${ENTRANCE_DELAY}s, visibility 0s`,
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const onNavMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const ctaLabel = lang === "fa" ? "ورود" : "Login";

  const isDarkTheme = (resolvedTheme ?? theme) === "dark";

  const logoSrc =
    lang === "fa"
      ? isDarkTheme
        ? "/images/logo/fa/logo-dark.png"
        : "/images/logo/fa/logo-light.png"
      : "/images/logo/en/logo.png";

  return (
    <>
      <header
        aria-hidden={navHidden || undefined}
        style={headerStyle}
        className={`${navHidden ? "pointer-events-none " : ""} ${isHome ? "fixed" : "sticky"} left-0 right-0 top-0 z-50 border-b border-kz-border-main/70 bg-transparent backdrop-blur-[16px] backdrop-saturate-[1.5] shadow-[0_4px_24px_-12px_rgb(var(--kz-c-heading)/0.12)]`}
      >
        <span
          aria-hidden
          style={{
            opacity: navEntered ? 1 : 0,
            transform: navEntered ? "scaleX(1)" : "scaleX(0)",
            transition: `opacity 1.4s ${EASE_CSS} ${ENTRANCE_DELAY + 0.2}s, transform 1.4s ${EASE_CSS} ${ENTRANCE_DELAY + 0.2}s`,
          }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-center bg-gradient-to-r from-transparent via-kz-brand-accent/60 to-transparent"
        />

        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 xl:px-10 2xl:px-14">
          <div className="flex h-16 items-center justify-between gap-3 sm:h-20 sm:gap-4 lg:h-[88px]">
            {/* ── Logo ── */}
            <div
              style={enter(ENTRANCE_DELAY + 0.2)}
              className="relative z-10 shrink-0"
            >
              <Link href="/" className="group flex items-center gap-2">
                <Image
                  key={logoSrc}
                  src={logoSrc}
                  alt={lang === "fa" ? "کیان زیست" : "Kian Zist"}
                  width={240}
                  height={84}
                  className={`w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
                    lang === "en" ? "h-[28px] sm:h-[36px]" : "h-10 sm:h-12"
                  }`}
                  priority
                />
              </Link>
            </div>

            {/* ── Desktop navigation ── */}
            <nav
              style={enter(ENTRANCE_DELAY + 0.3, "scale(0.9)", 0.7)}
              onPointerMove={onNavMove}
              className="group/nav kz-neo-sm relative z-10 hidden min-w-0 items-center gap-0.5 rounded-full border border-kz-border-main bg-kz-bg-surface/70 p-1.5 lg:flex"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/nav:opacity-100"
                style={{
                  background:
                    "radial-gradient(170px circle at var(--mx,50%) var(--my,50%), rgb(var(--kz-c-accent) / 0.14), rgb(var(--kz-c-secondary) / 0.06) 55%, transparent 75%)",
                }}
              />

              {navLinks.map((link, idx) => {
                const isActive = activeLink === link.key;
                return (
                  <div
                    key={link.key}
                    className="relative"
                    style={enter(ENTRANCE_DELAY + 0.45 + idx * 0.07)}
                  >
                    <Link
                      href={link.href}
                      onClick={(e) => handleNav(e, link)}
                      aria-current={isActive ? "page" : undefined}
                      aria-label={navLabels[link.key][lang]}
                      title={navLabels[link.key][lang]}
                      className={`group/link relative flex items-center gap-1.5 rounded-full px-2.5 py-2.5 transition-colors duration-300 ease-out min-[1180px]:px-3 2xl:gap-2 2xl:px-4 ${
                        isActive
                          ? "font-medium text-kz-brand-accent"
                          : "text-kz-text-muted hover:text-kz-text-heading"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="navbar-active-indicator"
                          className="absolute inset-0 rounded-full border border-kz-brand-accent/30 bg-kz-brand-accent/10 shadow-kz-glow"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                      <NavIcon
                        name={link.key}
                        play={navEntered}
                        replayKey={drawKeys[link.key] ?? 0}
                        delay={ENTRANCE_DELAY + 0.8 + idx * 0.1}
                        size={18}
                        animateEntrance={isHome}
                        className="relative z-10 shrink-0 transition-transform duration-300 group-hover/link:-translate-y-px group-hover/link:scale-110"
                      />
                      <Typography
                        variant="navLink"
                        className={`relative z-10 whitespace-nowrap ${
                          isActive ? "" : "hidden min-[1180px]:block"
                        }`}
                      >
                        {navLabels[link.key][lang]}
                      </Typography>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* ── Controls ── */}
            <div
              style={enter(ENTRANCE_DELAY + 0.44)}
              className="relative z-10 flex shrink-0 items-center gap-2 sm:gap-3"
            >
              <div className="kz-neo-sm flex items-center gap-1 rounded-full border border-kz-border-main bg-kz-bg-surface/70 p-1">
                {/* Language Toggle */}
                <Toggle
                  options={[
                    { label: "EN", value: "en" },
                    { label: "فا", value: "fa" },
                  ]}
                  value={lang}
                  onChange={(val) => {
                    run(() => setLang(val as "en" | "fa"));
                  }}
                  className="border-none bg-transparent shadow-none"
                />

                <div className="mx-1 h-4 w-[1px] bg-kz-border-main/80" />

                <AnimatePresence mode="wait" initial={false}>
                  {mounted && (
                    <motion.div
                      key={theme}
                      initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <IconButton
                        onClick={() => {
                          run(() =>
                            setTheme(theme === "dark" ? "light" : "dark"),
                          );
                        }}
                        className="h-8 w-8 border-none bg-transparent text-kz-text-muted shadow-none hover:bg-transparent hover:text-kz-brand-accent"
                      >
                        {theme === "dark" ? (
                          <Sun size={18} />
                        ) : (
                          <Moon size={18} />
                        )}
                      </IconButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Premium CTA */}
              {/* FIX: Changed from hidden 2xl:block to hidden lg:block */}
              <div className="hidden lg:block">
                <Magnetic strength={0.2}>
                  <div onClick={() => replay("login")}>
                    <GradientButton className="h-11 px-6">
                      <span className="flex items-center gap-2">
                        <NavIcon
                          name="login"
                          play={navEntered}
                          replayKey={drawKeys.login ?? 0}
                          delay={ENTRANCE_DELAY + 0.8 + navLinks.length * 0.1}
                          size={18}
                          animateEntrance={isHome}
                          className={`shrink-0 ${lang === "fa" ? "-scale-x-100" : ""}`}
                        />
                        <Typography variant="navLink" as="span">{ctaLabel}</Typography>
                      </span>
                    </GradientButton>
                  </div>
                </Magnetic>
              </div>

              {/* Hamburger */}
              <button
                type="button"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="kz-neo-sm relative h-10 w-10 shrink-0 rounded-full border border-kz-border-main bg-kz-bg-surface/70 text-kz-text-body transition-colors hover:text-kz-brand-accent lg:hidden"
              >
                <motion.span
                  className="absolute left-1/2 top-1/2 -ml-2 -mt-px h-[2px] w-4 rounded bg-current"
                  animate={
                    menuOpen ? { y: 0, rotate: 45 } : { y: -4, rotate: 0 }
                  }
                  transition={{ duration: 0.25 }}
                />
                <motion.span
                  className="absolute left-1/2 top-1/2 -ml-2 -mt-px h-[2px] w-4 rounded bg-current"
                  animate={
                    menuOpen ? { y: 0, rotate: -45 } : { y: 4, rotate: 0 }
                  }
                  transition={{ duration: 0.25 }}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.button
                  key="kz-menu-overlay"
                  aria-label="Close menu"
                  className="fixed inset-0 z-[55] cursor-default bg-black/30 backdrop-blur-[3px] lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  key="kz-menu-panel"
                  role="dialog"
                  variants={panelV}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  className="kz-neo fixed inset-x-3 top-[72px] z-[60] max-h-[calc(100dvh-88px)] overflow-y-auto rounded-3xl border border-kz-border-main bg-kz-bg-surface/95 p-3 backdrop-blur-2xl sm:inset-x-6 sm:top-[88px] sm:max-h-[calc(100dvh-104px)] md:inset-x-auto md:end-6 md:w-[400px] lg:hidden"
                >
                  <nav className="flex flex-col gap-1">
                    {navLinks.map((link, idx) => {
                      const isActive = activeLink === link.key;
                      return (
                        <motion.div key={link.key} variants={rowV}>
                          <Link
                            href={link.href}
                            onClick={(e) => handleNav(e, link)}
                            aria-current={isActive ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                              isActive
                                ? "kz-neo-inset border border-kz-brand-accent/25 bg-kz-brand-accent/10 text-kz-brand-accent"
                                : "text-kz-text-muted hover:bg-kz-bg-sunken/60 hover:text-kz-text-heading"
                            }`}
                          >
                            <NavIcon
                              name={link.key}
                              play
                              replayKey={drawKeys[link.key] ?? 0}
                              size={22}
                              delay={0.15 + idx * 0.06}
                              animateEntrance={true}
                            />
                            <Typography variant="navLink">
                              {navLabels[link.key][lang]}
                            </Typography>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                  <motion.div variants={rowV} className="mt-3">
                    <div onClick={() => replay("login")}>
                      <GradientButton className="h-11 w-full">
                        <span className="flex items-center justify-center gap-2">
                          <NavIcon
                            name="login"
                            play
                            replayKey={drawKeys.login ?? 0}
                            size={20}
                            delay={0.15 + navLinks.length * 0.06}
                            animateEntrance={true}
                            className={`shrink-0 ${lang === "fa" ? "-scale-x-100" : ""}`}
                          />
                          <Typography variant="navLink" as="span">{ctaLabel}</Typography>
                        </span>
                      </GradientButton>
                    </div>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ── Collapsed navbar: floating orb + full menu panel (Home, desktop) ── */}
      {mounted &&
        createPortal(
          <>
            {/* Floating orb: right in Persian, left in English */}
            <AnimatePresence>
              {navHidden && (
                <motion.button
                  key="kz-fab"
                  type="button"
                  aria-label={lang === "fa" ? "منو" : "Menu"}
                  aria-haspopup="dialog"
                  aria-expanded={modalOpen}
                  onClick={() => setModalOpen(true)}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: 0.25, duration: 0.55, ease: EASE },
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.92,
                    transition: { duration: 0.3, ease: "easeOut" },
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className={`group/fab fixed top-5 z-[58] flex h-12 w-12 items-center justify-center rounded-full border border-kz-brand-accent/35 bg-kz-bg-surface/90 text-kz-brand-accent shadow-kz-glow transition-colors duration-300 hover:border-kz-brand-accent/70 hover:bg-kz-brand-accent/10 max-lg:hidden ${
                    lang === "fa" ? "right-6" : "left-6"
                  }`}
                >
                  {/* Endless ripple: tells visitors "the menu lives here" */}
                  {!reduceMotion &&
                    !modalOpen &&
                    [0, 1].map((i) => (
                      <motion.span
                        key={i}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 transform-gpu rounded-full border border-kz-brand-accent/50 bg-kz-brand-accent/[0.06]"
                        style={{ willChange: "transform, opacity" }}
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{
                          scale: [1, 1.9],
                          // fade IN at the start and OUT at the end, so the ring
                          // never pops in/out when the loop restarts
                          opacity: [0, 0.5, 0],
                        }}
                        transition={{
                          scale: {
                            duration: 3.2,
                            ease: "easeOut",
                            repeat: Infinity,
                            delay: 0.8 + i * 1.6,
                          },
                          opacity: {
                            duration: 3.2,
                            times: [0, 0.2, 1],
                            ease: "easeOut",
                            repeat: Infinity,
                            delay: 0.8 + i * 1.6,
                          },
                        }}
                      />
                    ))}
                  <span
                    aria-hidden
                    className="flex w-[18px] flex-col gap-[5px]"
                  >
                    {[
                      "w-[18px] group-hover/fab:w-[14px]",
                      "w-[12px] group-hover/fab:w-[18px]",
                      "w-[18px] group-hover/fab:w-[8px]",
                    ].map((w) => (
                      <span
                        key={w}
                        className={`h-[2px] rounded-full bg-current transition-all duration-300 ${w} ${
                          lang === "fa" ? "ml-auto" : "mr-auto"
                        }`}
                      />
                    ))}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {modalOpen && (
                <>
                  <motion.button
                    key="kz-modal-overlay"
                    aria-label="Close menu"
                    className="fixed inset-0 z-[70] cursor-default bg-black/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setModalOpen(false)}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(640px circle at ${orbPos(lang === "fa")}, rgb(var(--kz-c-accent) / 0.2), transparent 62%)`,
                      }}
                    />
                  </motion.button>

                  <div className="pointer-events-none fixed inset-0 z-[71] flex items-center justify-center px-4">
                    <motion.div
                      key="kz-modal-panel"
                      role="dialog"
                      aria-modal="true"
                      aria-label={lang === "fa" ? "منوی سایت" : "Site menu"}
                      variants={modalPanelV}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      style={{
                        transformOrigin: lang === "fa" ? "100% 0" : "0 0",
                      }}
                      className="kz-neo pointer-events-auto relative w-full max-w-[800px] overflow-hidden rounded-[2rem] border border-kz-brand-accent/20 bg-kz-bg-surface/[0.97]"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-kz-brand-accent/70 to-transparent"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute start-3 top-3 h-3 w-3 border-s border-t border-kz-brand-accent/50"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute end-3 top-3 h-3 w-3 border-e border-t border-kz-brand-accent/50"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-3 start-3 h-3 w-3 border-b border-s border-kz-brand-accent/50"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-3 end-3 h-3 w-3 border-b border-e border-kz-brand-accent/50"
                      />

                      <div className="relative grid sm:grid-cols-[1.45fr_1fr]">
                        {/* ═════ main column ═════ */}
                        <div className="flex min-w-0 flex-col p-5 sm:p-7">
                          <motion.div
                            variants={modalItemV}
                            className="flex items-center justify-between"
                          >
                            <Image
                              src={logoSrc}
                              alt={lang === "fa" ? "کیان زیست" : "Kian Zist"}
                              width={240}
                              height={84}
                              className={`w-auto object-contain ${
                                lang === "en"
                                  ? "h-[28px] sm:h-[34px]"
                                  : "h-10 sm:h-11"
                              }`}
                            />
                            <button
                              type="button"
                              aria-label="Close"
                              autoFocus
                              onClick={() => setModalOpen(false)}
                              className="group/x flex h-10 w-10 items-center justify-center rounded-full border border-kz-border-main text-kz-text-muted transition-colors hover:border-kz-brand-accent/50 hover:text-kz-brand-accent"
                            >
                              <X
                                size={18}
                                className="transition-transform duration-300 group-hover/x:rotate-90"
                              />
                            </button>
                          </motion.div>

                          <nav
                            onPointerMove={onNavMove}
                            onMouseLeave={() => setHoverIdx(null)}
                            className="group/mn relative mt-6"
                          >
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/mn:opacity-100"
                              style={{
                                background:
                                  "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgb(var(--kz-c-accent) / 0.10), transparent 70%)",
                              }}
                            />
                            <span
                              aria-hidden
                              className="pointer-events-none absolute bottom-5 start-[1.35rem] top-5 w-px bg-gradient-to-b from-transparent via-kz-brand-accent/30 to-transparent"
                            />
                            {navLinks.map((link, idx) => {
                              const isActive = activeLink === link.key;
                              return (
                                <motion.div
                                  key={link.key}
                                  variants={modalItemV}
                                >
                                  <Link
                                    href={link.href}
                                    onClick={(e) => handleNav(e, link)}
                                    onMouseEnter={() => setHoverIdx(idx)}
                                    onFocus={() => setHoverIdx(idx)}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`group/m relative flex items-center gap-4 overflow-hidden rounded-2xl py-2 pe-3 ps-1.5 transition-colors duration-300 ${
                                      isActive
                                        ? "text-kz-brand-accent"
                                        : "text-kz-text-body hover:text-kz-text-heading"
                                    }`}
                                  >
                                    <span
                                      aria-hidden
                                      className="pointer-events-none absolute inset-0 scale-x-0 rounded-2xl from-kz-brand-accent/12 to-transparent transition-transform duration-500 ease-out group-hover/m:scale-x-100 ltr:origin-left ltr:bg-gradient-to-r rtl:origin-right rtl:bg-gradient-to-l"
                                    />
                                    <span
                                      className={`relative z-10 flex h-[2.35rem] w-[2.35rem] shrink-0 items-center justify-center rounded-full border bg-kz-bg-surface transition-all duration-300 ${
                                        isActive
                                          ? "border-kz-brand-accent/60 shadow-kz-glow"
                                          : "border-kz-border-main group-hover/m:border-kz-brand-accent/50"
                                      }`}
                                    >
                                      <NavIcon
                                        name={link.key}
                                        play
                                        size={18}
                                        delay={0.3 + idx * 0.07}
                                        animateEntrance
                                      />
                                    </span>
                                    <span className="relative z-10 flex flex-1 items-baseline gap-3">
                                      <span className="text-[11px] tabular-nums text-kz-text-muted/60 transition-colors group-hover/m:text-kz-brand-accent">
                                        {fmtNum(idx)}
                                      </span>
                                      <span className="text-[0.9rem] font-normal transition-transform duration-300 group-hover/m:translate-x-1 rtl:group-hover/m:-translate-x-1">
                                        {navLabels[link.key][lang]}
                                      </span>
                                    </span>
                                    <ArrowUpRight
                                      size={16}
                                      className="relative z-10 shrink-0 -translate-y-1 translate-x-1 opacity-0 transition-all duration-300 group-hover/m:translate-x-0 group-hover/m:translate-y-0 group-hover/m:opacity-100 rtl:-translate-x-1 rtl:group-hover/m:translate-x-0"
                                    />
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </nav>

                          <motion.div
                            variants={modalItemV}
                            className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-kz-border-main pt-5"
                          >
                            <div className="kz-neo-sm flex items-center gap-1 rounded-full border border-kz-border-main bg-kz-bg-surface/70 p-1">
                              <Toggle
                                options={[
                                  { label: "EN", value: "en" },
                                  { label: "فا", value: "fa" },
                                ]}
                                value={lang}
                                onChange={(val) => {
                                  run(() => setLang(val as "en" | "fa"));
                                }}
                                className="border-none bg-transparent shadow-none"
                              />
                              <div className="mx-1 h-4 w-[1px] bg-kz-border-main/80" />
                              <IconButton
                                onClick={() => {
                                  run(() =>
                                    setTheme(
                                      theme === "dark" ? "light" : "dark",
                                    ),
                                  );
                                }}
                                className="h-8 w-8 border-none bg-transparent text-kz-text-muted shadow-none hover:bg-transparent hover:text-kz-brand-accent"
                              >
                                {theme === "dark" ? (
                                  <Sun size={18} />
                                ) : (
                                  <Moon size={18} />
                                )}
                              </IconButton>
                            </div>

                            <div onClick={() => replay("login")}>
                              <GradientButton className="h-11 px-6">
                                <span className="flex items-center gap-2">
                                  <NavIcon
                                    name="login"
                                    play
                                    replayKey={drawKeys.login ?? 0}
                                    size={18}
                                    animateEntrance
                                    delay={0.8}
                                    className={`shrink-0 ${lang === "fa" ? "-scale-x-100" : ""}`}
                                  />
                                  <Typography variant="navLink" as="span">{ctaLabel}</Typography>
                                </span>
                              </GradientButton>
                            </div>
                          </motion.div>
                        </div>

                        <motion.aside
                          variants={modalItemV}
                          aria-hidden
                          className="relative hidden flex-col justify-between overflow-hidden border-s border-kz-border-main/70 p-7 sm:flex"
                          style={{
                            backgroundImage:
                              "radial-gradient(rgb(var(--kz-c-accent) / 0.16) 1px, transparent 1px)",
                            backgroundSize: "18px 18px",
                          }}
                        >
                          <span className="pointer-events-none absolute -bottom-24 -end-24 h-64 w-64 rounded-full bg-kz-brand-accent/10 blur-3xl" />
                          <motion.div
                            className="pointer-events-none absolute inset-0 will-change-transform"
                            initial={{ y: "-100%" }}
                            animate={{ y: "100%" }}
                            transition={{
                              duration: 5,
                              ease: "linear",
                              repeat: Infinity,
                            }}
                          >
                            <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-kz-brand-accent/60 to-transparent" />
                          </motion.div>

                          <div className="relative flex items-center gap-2 self-start rounded-full border border-kz-brand-accent/25 bg-kz-brand-accent/5 px-3 py-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kz-brand-accent" />
                            <span className="text-[10px] tracking-[0.22em] text-kz-brand-accent">
                              KZ·NAV · ONLINE
                            </span>
                          </div>

                          <div className="relative my-6 flex flex-col items-center justify-center">
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={shownIdx}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.2, ease: EASE }}
                                className="select-none text-[8rem] font-semibold leading-none text-transparent"
                                style={{
                                  WebkitTextStroke:
                                    "1px rgb(var(--kz-c-accent) / 0.4)",
                                }}
                              >
                                {fmtNum(shownIdx)}
                              </motion.span>
                            </AnimatePresence>
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={`l-${shownIdx}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18 }}
                                className="mt-3 text-sm font-normal text-kz-text-heading"
                              >
                                {navLabels[navLinks[shownIdx].key][lang]}
                              </motion.span>
                            </AnimatePresence>
                          </div>

                          <p className="relative text-[11px] leading-6 text-kz-text-muted">
                            {lang === "fa"
                              ? "ژئومیکس و بیوتکنولوژی ریزوسفر"
                              : "Rhizosphere genomics & biotech"}
                            <span className="mt-1 block tracking-[0.18em] text-kz-brand-accent/70">
                              KZ-8821 · RHIZO-NET
                            </span>
                          </p>
                        </motion.aside>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
};
