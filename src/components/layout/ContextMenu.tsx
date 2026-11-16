"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Mail,
  Monitor,
  Moon,
  Phone,
  RotateCw,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSpinner } from "@/components/ui/Spinner";
import { getHomeSection, scrollHomeTo } from "@/lib/homeScroll";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════
   Text (the menu is always English, whatever the site language is)
   ════════════════════════════════════════════════════════════ */
const t = {
  back: "Back",
  forward: "Forward",
  reload: "Reload",
  copyPage: "Copy page link",
  top: "Back to top",
  openLink: "Open link",
  newTab: "Open in new tab",
  copyLink: "Copy link address",
  sendEmail: "Send email",
  copyEmail: "Copy email address",
  call: "Call number",
  copyPhone: "Copy phone number",
  openImage: "Open image in new tab",
  copyImage: "Copy image address",
  copy: "Copy",
  copied: "Copied",
  theme: "Theme",
  light: "Light",
  dark: "Dark",
  system: "System",
  language: "Language",
  english: "English",
  persian: "فارسی",
  pageLink: "Page link",
  externalLink: "External link",
  emailAddress: "Email address",
  phoneNumber: "Phone number",
  image: "Image",
  shiftHint: "Hold Shift for the browser menu",
} as const;

/* ════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════ */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type LinkKind = "internal" | "external" | "mailto" | "tel";

interface LinkInfo {
  kind: LinkKind;
  href: string; // absolute
  path: string; // internal path (+search +hash) for the router
  copy: string; // what "copy" puts on the clipboard
  label: string; // short text shown in the menu
}

interface Ctx {
  id: number;
  x: number;
  y: number;
  link: LinkInfo | null;
  image: string | null;
  selection: string;
  showTop: boolean;
}

interface Pos {
  x: number;
  y: number;
  ox: "left" | "right";
  oy: "top" | "bottom";
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const EDITABLE =
  "input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-native-context]";

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

const readLink = (el: Element): LinkInfo | null => {
  const a = el.closest<HTMLAnchorElement>("a[href]");
  if (!a) return null;
  const raw = a.getAttribute("href") ?? "";
  if (!raw || /^javascript:/i.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(a.href, window.location.href);
  } catch {
    return null;
  }

  if (url.protocol === "mailto:") {
    const addr = decodeURIComponent(url.pathname);
    return {
      kind: "mailto",
      href: url.href,
      path: "",
      copy: addr,
      label: addr,
    };
  }
  if (url.protocol === "tel:") {
    const num = decodeURIComponent(url.pathname);
    return { kind: "tel", href: url.href, path: "", copy: num, label: num };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const path = url.pathname + url.search + url.hash;
  if (url.origin === window.location.origin) {
    return {
      kind: "internal",
      href: url.href,
      path,
      copy: url.href,
      label: path,
    };
  }
  return {
    kind: "external",
    href: url.href,
    path: "",
    copy: url.href,
    label: url.host + (url.pathname !== "/" ? url.pathname : ""),
  };
};

// next/image serves "/_next/image?url=…": expose the original file instead
const readImage = (el: Element): string | null => {
  const img = el.closest("img");
  if (!img) return null;
  const src = img.currentSrc || img.src;
  if (!src || src.startsWith("data:")) return null;
  try {
    const u = new URL(src, window.location.href);
    if (u.pathname === "/_next/image") {
      const orig = u.searchParams.get("url");
      if (orig) return new URL(orig, window.location.origin).href;
    }
    return u.href;
  } catch {
    return src;
  }
};

// The scrollable ancestor that is actually scrolled (null → the window)
const findScroller = (start: Element | null): HTMLElement | null => {
  let el = start as HTMLElement | null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      el.scrollHeight > el.clientHeight + 1 &&
      el.scrollTop > 0
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
};

/* ════════════════════════════════════════════════════════════
   Small UI pieces
   ════════════════════════════════════════════════════════════ */
const KIND_META: Record<LinkKind, { icon: LucideIcon; label: string }> = {
  internal: { icon: Link2, label: t.pageLink },
  external: { icon: ExternalLink, label: t.externalLink },
  mailto: { icon: Mail, label: t.emailAddress },
  tel: { icon: Phone, label: t.phoneNumber },
};

const fileName = (url: string) => {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
};

/* A menu entry: icon tile · label · optional shortcut.
   `roomy` = few entries on screen → taller rows, bigger tiles. */
const Row = ({
  icon,
  label,
  onClick,
  done,
  roomy,
  kbd,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  done?: boolean;
  roomy: boolean;
  kbd?: string;
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={cn(
      "group flex w-full cursor-default items-center gap-3 rounded-xl px-2 text-start text-kz-text-heading outline-none transition-colors",
      "hover:bg-kz-text-heading/[0.07] focus-visible:bg-kz-text-heading/[0.07] focus-visible:ring-1 focus-visible:ring-kz-brand-accent/40",
      roomy ? "min-h-[46px] text-[14px]" : "min-h-[37px] text-[13px]",
      done && "text-kz-brand-accent",
    )}
  >
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg transition-colors",
        roomy ? "h-8 w-8" : "h-7 w-7",
        done
          ? "bg-kz-brand-accent/15 text-kz-brand-accent"
          : "bg-kz-text-heading/[0.06] text-kz-text-muted group-hover:bg-kz-brand-accent/15 group-hover:text-kz-brand-accent group-focus-visible:bg-kz-brand-accent/15 group-focus-visible:text-kz-brand-accent",
      )}
    >
      {done ? <Check size={roomy ? 16 : 15} /> : icon}
    </span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {kbd && (
      <kbd className="shrink-0 rounded-md border border-kz-border-subtle px-1.5 py-0.5 font-sans text-[10.5px] text-kz-text-muted">
        {kbd}
      </kbd>
    )}
  </button>
);

/* Browser-style toolbar tile (back / forward / reload) */
const ToolBtn = ({
  icon,
  label,
  title,
  onClick,
  disabled,
  roomy,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  roomy: boolean;
}) => (
  <button
    type="button"
    role="menuitem"
    aria-label={label}
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "group flex cursor-default flex-col items-center justify-center gap-1 rounded-xl text-kz-text-muted outline-none transition-colors",
      "hover:bg-kz-text-heading/[0.07] hover:text-kz-brand-accent focus-visible:bg-kz-text-heading/[0.07] focus-visible:text-kz-brand-accent focus-visible:ring-1 focus-visible:ring-kz-brand-accent/40",
      "disabled:pointer-events-none disabled:opacity-35",
      roomy ? "h-[62px]" : "h-[50px]",
    )}
  >
    {icon}
    <span className="text-[11px] leading-none text-kz-text-muted group-hover:text-kz-text-heading">
      {label}
    </span>
  </button>
);

const Divider = () => (
  <div
    role="separator"
    className="mx-2 my-1.5 h-px bg-kz-border-subtle"
    aria-hidden
  />
);

const Label = ({ children }: { children: ReactNode }) => (
  <div className="px-2 pb-1.5 pt-1 text-[11.5px] font-medium text-kz-text-muted">
    {children}
  </div>
);

/* What the cursor is on (link / image): a small summary card on top */
const Subject = ({
  tile,
  kind,
  title,
  full,
}: {
  tile: ReactNode;
  kind: string;
  title: string;
  full?: string;
}) => (
  <div className="mb-1.5 flex items-center gap-3 rounded-xl bg-kz-bg-sunken/60 p-2.5">
    {tile}
    <div className="min-w-0 flex-1 text-start">
      <div className="text-[11.5px] leading-tight text-kz-text-muted">
        {kind}
      </div>
      <div
        dir="ltr"
        title={full ?? title}
        className="mt-0.5 truncate text-[13px] font-medium leading-tight text-kz-text-heading"
      >
        {title}
      </div>
    </div>
  </div>
);

interface SegOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

/* Segmented control with a pill that slides to the chosen option */
const Segmented = ({
  options,
  value,
  onChange,
  label,
  roomy,
}: {
  options: SegOption[];
  value: string | undefined;
  onChange: (v: string) => void;
  label: string;
  roomy: boolean;
}) => {
  const reduce = useReducedMotion();
  return (
    <div
      role="group"
      aria-label={label}
      className="mx-0.5 mb-2 grid gap-0.5 rounded-xl bg-kz-bg-sunken/60 p-0.5"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex cursor-default items-center justify-center gap-1.5 rounded-[10px] px-1.5 text-[12.5px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-kz-brand-accent/50",
              roomy ? "py-2" : "py-1.5",
              active
                ? "font-medium text-kz-brand-accent"
                : "text-kz-text-muted hover:text-kz-text-heading",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                aria-hidden
                className="absolute inset-0 rounded-[10px] bg-kz-bg-surface shadow-sm ring-1 ring-kz-brand-accent/25"
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 38 }
                }
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {o.icon}
              <span className="truncate">{o.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   Context menu
   ════════════════════════════════════════════════════════════ */
export const ContextMenu = () => {
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const flashTimer = useRef(0);
  const idRef = useRef(0);

  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const { run } = useSpinner();
  const reduce = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    setMounted(true);
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform));
    return () => window.clearTimeout(flashTimer.current);
  }, []);

  const close = useCallback((restoreFocus = false) => {
    setCtx(null);
    window.clearTimeout(flashTimer.current);
    setFlash(null);
    const el = lastFocus.current;
    lastFocus.current = null;
    if (restoreFocus && el && document.contains(el)) {
      el.focus({ preventScroll: true });
    }
  }, []);

  /* ── open on right click ── */
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      // Right click on the menu itself: keep it, no browser menu
      if (menuRef.current?.contains(target)) {
        e.preventDefault();
        return;
      }
      // Native menu for text fields, Shift+right-click, or opted-out areas
      if (e.shiftKey || target.closest(EDITABLE)) {
        setCtx(null);
        return;
      }

      e.preventDefault();

      if (!menuRef.current) {
        lastFocus.current = document.activeElement as HTMLElement | null;
      }

      // "Back to top" is only offered when it is actually useful
      let showTop = false;
      scrollerRef.current = null;
      if (pathnameRef.current === "/") {
        showTop = getHomeSection() >= 2; // third section and below
      } else {
        const sc = findScroller(target);
        scrollerRef.current = sc;
        const y = sc
          ? sc.scrollTop
          : window.scrollY || document.documentElement.scrollTop;
        showTop = y > Math.max(400, window.innerHeight * 0.75);
      }

      setCtx({
        id: ++idRef.current,
        x: e.clientX,
        y: e.clientY,
        link: readLink(target),
        image: readImage(target),
        selection: window.getSelection()?.toString().trim() ?? "",
        showTop,
      });
    };

    window.addEventListener("contextmenu", onContext);
    return () => window.removeEventListener("contextmenu", onContext);
  }, []);

  /* ── close on outside interaction (only while open) ── */
  const isOpen = ctx !== null;
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const onAway = () => close();

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onAway);
    window.addEventListener("blur", onAway);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onAway);
      window.removeEventListener("blur", onAway);
    };
  }, [isOpen, close]);

  /* ── measure the real size, flip near the edges, take focus ── */
  useIsoLayoutEffect(() => {
    if (!ctx || !menuRef.current) return;
    const el = menuRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const m = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const flipX = ctx.x + w + m > vw;
    const flipY = ctx.y + h + m > vh;
    const x = clamp(flipX ? ctx.x - w : ctx.x, m, Math.max(m, vw - w - m));
    const y = clamp(flipY ? ctx.y - h : ctx.y, m, Math.max(m, vh - h - m));

    setPos({
      x,
      y,
      ox: flipX ? "right" : "left",
      oy: flipY ? "bottom" : "top",
    });
    el.focus({ preventScroll: true });
  }, [ctx]);

  /* ── keyboard navigation inside the menu ── */
  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      close();
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not([disabled])',
      ) ?? [],
    );
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = i < 0 ? 0 : (i + 1) % items.length;
    else if (e.key === "ArrowUp") next = i <= 0 ? items.length - 1 : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      items[next].focus();
    }
  };

  /* ── actions ── */
  const doCopy = async (id: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return close();
    setFlash(id);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => close(), 700);
  };

  const openInternal = (path: string) => {
    close();
    if (path.split(/[?#]/)[0] === pathnameRef.current) router.push(path);
    else run(() => router.push(path));
  };

  const openNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    close();
  };

  const goTop = () => {
    close();
    if (pathnameRef.current === "/") {
      scrollHomeTo(0);
      return;
    }
    const sc = scrollerRef.current;
    if (sc) sc.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setThemeTo = (v: string) => {
    close();
    if (v !== theme) run(() => setTheme(v));
  };

  const setLangTo = (v: string) => {
    close();
    if (v !== lang) run(() => setLang(v as "en" | "fa"));
  };

  if (!mounted) return null;

  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  // Few entries on screen → give the menu more air
  const roomy = !!ctx && !ctx.link && !ctx.image && !ctx.selection;
  const mod = isMac ? "⌘" : "Ctrl+";

  return createPortal(
    <AnimatePresence>
      {ctx && (
        <motion.div
          key={ctx.id}
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          aria-label="Context menu"
          dir="ltr"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          onKeyDown={onMenuKeyDown}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: pos?.x ?? ctx.x,
            top: pos?.y ?? ctx.y,
            zIndex: 9999999,
            transformOrigin: `${pos?.ox ?? "left"} ${pos?.oy ?? "top"}`,
          }}
          className="hide-scrollbar max-h-[calc(100dvh-16px)] w-[272px] overflow-y-auto rounded-2xl border border-kz-border-subtle bg-kz-bg-surface/95 p-2 shadow-2xl outline-none backdrop-blur-2xl"
        >
          {/* ── Link under the cursor ── */}
          {ctx.link && (
            <>
              <Subject
                tile={
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kz-brand-accent/15 text-kz-brand-accent">
                    {(() => {
                      const KindIcon = KIND_META[ctx.link.kind].icon;
                      return <KindIcon size={17} />;
                    })()}
                  </span>
                }
                kind={KIND_META[ctx.link.kind].label}
                title={ctx.link.label}
                full={ctx.link.href}
              />

              {(ctx.link.kind === "internal" ||
                ctx.link.kind === "external") && (
                <>
                  <Row
                    roomy={roomy}
                    icon={<ArrowUpRight size={16} />}
                    label={t.openLink}
                    onClick={() =>
                      ctx.link!.kind === "internal"
                        ? openInternal(ctx.link!.path)
                        : openNewTab(ctx.link!.href)
                    }
                  />
                  <Row
                    roomy={roomy}
                    icon={<ExternalLink size={16} />}
                    label={t.newTab}
                    onClick={() => openNewTab(ctx.link!.href)}
                  />
                  <Row
                    roomy={roomy}
                    icon={<Copy size={16} />}
                    label={flash === "link" ? t.copied : t.copyLink}
                    done={flash === "link"}
                    onClick={() => doCopy("link", ctx.link!.copy)}
                  />
                </>
              )}

              {ctx.link.kind === "mailto" && (
                <>
                  <Row
                    roomy={roomy}
                    icon={<Mail size={16} />}
                    label={t.sendEmail}
                    onClick={() => {
                      window.location.href = ctx.link!.href;
                      close();
                    }}
                  />
                  <Row
                    roomy={roomy}
                    icon={<Copy size={16} />}
                    label={flash === "link" ? t.copied : t.copyEmail}
                    done={flash === "link"}
                    onClick={() => doCopy("link", ctx.link!.copy)}
                  />
                </>
              )}

              {ctx.link.kind === "tel" && (
                <>
                  <Row
                    roomy={roomy}
                    icon={<Phone size={16} />}
                    label={t.call}
                    onClick={() => {
                      window.location.href = ctx.link!.href;
                      close();
                    }}
                  />
                  <Row
                    roomy={roomy}
                    icon={<Copy size={16} />}
                    label={flash === "link" ? t.copied : t.copyPhone}
                    done={flash === "link"}
                    onClick={() => doCopy("link", ctx.link!.copy)}
                  />
                </>
              )}
              <Divider />
            </>
          )}

          {/* ── Image under the cursor ── */}
          {ctx.image && (
            <>
              <Subject
                tile={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ctx.image}
                    alt=""
                    draggable={false}
                    className="h-9 w-9 shrink-0 rounded-lg bg-kz-bg-sunken object-cover"
                  />
                }
                kind={t.image}
                title={fileName(ctx.image)}
                full={ctx.image}
              />
              <Row
                roomy={roomy}
                icon={<ImageIcon size={16} />}
                label={t.openImage}
                onClick={() => openNewTab(ctx.image!)}
              />
              <Row
                roomy={roomy}
                icon={<Copy size={16} />}
                label={flash === "image" ? t.copied : t.copyImage}
                done={flash === "image"}
                onClick={() => doCopy("image", ctx.image!)}
              />
              <Divider />
            </>
          )}

          {/* ── Selected text ── */}
          {ctx.selection && (
            <>
              <Row
                roomy={roomy}
                icon={<Copy size={16} />}
                label={flash === "sel" ? t.copied : t.copy}
                done={flash === "sel"}
                kbd={`${mod}C`}
                onClick={() => doCopy("sel", ctx.selection)}
              />
              <Divider />
            </>
          )}

          {/* ── Page ── */}
          <div className="mb-1.5 grid grid-cols-3 gap-1">
            <ToolBtn
              roomy={roomy}
              icon={<ArrowLeft size={roomy ? 19 : 17} />}
              label={t.back}
              title={`${t.back} (${isMac ? "⌘[" : "Alt+←"})`}
              disabled={!canGoBack}
              onClick={() => {
                close();
                window.history.back();
              }}
            />
            <ToolBtn
              roomy={roomy}
              icon={<ArrowRight size={roomy ? 19 : 17} />}
              label={t.forward}
              title={`${t.forward} (${isMac ? "⌘]" : "Alt+→"})`}
              onClick={() => {
                close();
                window.history.forward();
              }}
            />
            <ToolBtn
              roomy={roomy}
              icon={<RotateCw size={roomy ? 18 : 16} />}
              label={t.reload}
              title={`${t.reload} (${isMac ? "⌘R" : "F5"})`}
              onClick={() => {
                close();
                window.location.reload();
              }}
            />
          </div>

          <Row
            roomy={roomy}
            icon={<Link2 size={16} />}
            label={flash === "page" ? t.copied : t.copyPage}
            done={flash === "page"}
            onClick={() => doCopy("page", window.location.href)}
          />
          {ctx.showTop && (
            <Row
              roomy={roomy}
              icon={<ArrowUp size={16} />}
              label={t.top}
              onClick={goTop}
            />
          )}

          <Divider />

          {/* ── Preferences ── */}
          <Label>{t.theme}</Label>
          <Segmented
            roomy={roomy}
            label={t.theme}
            value={theme}
            onChange={setThemeTo}
            options={[
              { value: "light", label: t.light, icon: <Sun size={14} /> },
              { value: "dark", label: t.dark, icon: <Moon size={14} /> },
              { value: "system", label: t.system, icon: <Monitor size={14} /> },
            ]}
          />

          <Label>{t.language}</Label>
          <Segmented
            roomy={roomy}
            label={t.language}
            value={lang}
            onChange={setLangTo}
            options={[
              { value: "en", label: t.english },
              { value: "fa", label: t.persian },
            ]}
          />

          {roomy && (
            <div className="px-2 pb-0.5 pt-1 text-start text-[11px] text-kz-text-muted">
              {t.shiftHint}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
