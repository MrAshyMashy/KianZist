import type { Config } from "tailwindcss";

/**
 * Every themed color reads an RGB *channel* variable (see globals.css),
 * so opacity modifiers like `bg-kz-brand-accent/10` or
 * `border-kz-brand-secondary/40` WORK in both light and dark.
 */
const c = (name: string) => `rgb(var(--kz-c-${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      colors: {
        /* ---------- Backgrounds (kz-bg-* is the canonical name) ---------- */
        "kz-bg": {
          body: c("bg-body"),
          surface: c("bg-surface"),
          elevated: c("bg-elevated"),
          sunken: c("bg-sunken"),
          glass: "var(--kz-bg-glass)",
        },
        /* legacy alias so old `kz-background-*` classes keep working */
        "kz-background": {
          body: c("bg-body"),
          surface: c("bg-surface"),
          elevated: c("bg-elevated"),
          sunken: c("bg-sunken"),
          glass: "var(--kz-bg-glass)",
        },

        /* ---------- Brand: GREEN family + BLUE family ---------- */
        "kz-brand": {
          primary: c("primary"), // deep green (solid buttons)
          hover: c("primary-hover"),
          "primary-hover": c("primary-hover"),
          text: c("on-primary"),
          "primary-text": c("on-primary"),

          accent: c("accent"), // emerald / mint (text, icons, charts)
          accentHover: c("accent-hover"),
          "accent-hover": c("accent-hover"),

          pistachio: c("pistachio"), // soft pistachio fills
          "pistachio-text": c("pistachio-text"),

          secondary: c("secondary"), // azure
          secondaryHover: c("secondary-hover"),
          "secondary-hover": c("secondary-hover"),
          deep: c("blue-deep"), // deep blue (solid)
          soft: c("blue-soft"), // light blue (soft)

          faint: "var(--kz-brand-faint)",
        },

        /* ---------- Text ---------- */
        "kz-text": {
          heading: c("heading"),
          body: c("body"),
          muted: c("muted"),
          subtle: c("subtle"),
          inverted: c("inverted"),
          brand: c("accent"),
          secondary: c("secondary"),
          pistachio: c("pistachio-text"),
        },

        /* ---------- Icons (dedicated color field) ---------- */
        "kz-icon": {
          primary: c("icon-primary"),
          secondary: c("icon-secondary"),
          pistachio: c("icon-pistachio"),
          muted: c("muted"),
          subtle: c("subtle"),
          inverted: c("inverted"),
          onPrimary: c("on-primary"),
          onMedia: c("media-text"),
        },

        /* ---------- Colors that sit on top of photos (theme-independent) ---------- */
        "kz-media": {
          text: c("media-text"),
          accent: c("media-accent"),
          blue: c("media-blue"),
        },

        /* ---------- Borders ---------- */
        "kz-border": {
          main: c("border-main"),
          subtle: c("border-subtle"),
          strong: c("border-strong"),
          brand: "var(--kz-border-brand)",
          secondary: "var(--kz-border-secondary)",
        },

        /* ---------- Buttons ---------- */
        "kz-button": {
          primaryBg: c("primary"),
          primaryHover: c("primary-hover"),
          primaryText: c("on-primary"),
          secondaryBg: "var(--kz-button-secondary-bg)",
          secondaryText: c("secondary"),
          secondaryBorder: "var(--kz-button-secondary-border)",
          ghostHover: "var(--kz-button-ghost-hover)",
        },

        /* ---------- Inputs / cards ---------- */
        "kz-input": {
          bg: c("bg-surface"),
          border: c("border-main"),
          focusRing: c("accent"),
          placeholder: c("subtle"),
        },
        "kz-card": {
          bg: c("bg-surface"),
          border: c("border-main"),
          hoverBorder: c("border-strong"),
        },

        /* ---------- Status ---------- */
        "kz-status": {
          success: c("success"),
          successBg: "var(--kz-status-success-bg)",
          warning: c("warning"),
          warningBg: "var(--kz-status-warning-bg)",
          danger: c("danger"),
          dangerBg: "var(--kz-status-danger-bg)",
          info: c("info"),
          infoBg: "var(--kz-status-info-bg)",
        },

        /* ---------- Effects (kept for Aurora / Molecular backgrounds) ---------- */
        "kz-effects": {
          glowPrimary: "var(--kz-effects-glow-primary)",
          glowSecondary: "var(--kz-effects-glow-secondary)",
          overlay: "var(--kz-effects-overlay)",
          gridLine: "var(--kz-effects-grid-line)",
          auroraPrimary: "var(--kz-effects-aurora-primary)",
          auroraSecondary: "var(--kz-effects-aurora-secondary)",
          moleculeBond: "var(--kz-effects-molecule-bond)",
        },
      },

      borderRadius: {
        "kz-sm": "var(--kz-radius-sm)",
        "kz-md": "var(--kz-radius-md)",
        "kz-lg": "var(--kz-radius-lg)",
        "kz-xl": "var(--kz-radius-xl)",
      },

      /* Default border/ring color = themed (kills the stray white/gray borders) */
      borderColor: {
        DEFAULT: c("border-main"),
      },
      ringColor: {
        DEFAULT: "rgb(var(--kz-c-accent) / 0.5)",
      },

      boxShadow: {
        "kz-card": "var(--kz-card-shadow)",
        "kz-glow": "var(--kz-effects-glow-primary)",
        "kz-glow-secondary": "var(--kz-effects-glow-secondary)",
        "kz-glow-accent": "var(--kz-shadow-accent)",
        "kz-glow-blue": "var(--kz-shadow-blue)",
        "kz-glow-pistachio": "var(--kz-shadow-pistachio)",
        "kz-inner": "var(--kz-shadow-inner)",
      },
      dropShadow: {
        "kz-accent": "var(--kz-drop-accent)",
        "kz-blue": "var(--kz-drop-blue)",
        "kz-pistachio": "var(--kz-drop-pistachio)",
        "kz-media": "0 0 10px rgb(var(--kz-c-media-accent) / 0.55)",
      },
      backgroundImage: {
        "kz-brand-gradient":
          "linear-gradient(135deg, rgb(var(--kz-c-accent)), rgb(var(--kz-c-secondary)))",
        "kz-soft-gradient":
          "linear-gradient(135deg, rgb(var(--kz-c-pistachio) / 0.18), rgb(var(--kz-c-secondary) / 0.12))",
      },
    },
  },
  plugins: [],
} satisfies Config;
