/* =========================================================
   KianZist — Typography System
   ---------------------------------------------------------
   Single source of truth for the application's typography.

   Scale (v4): FLUID — sizes are CSS vars (see globals.css) that follow viewport height.

   BALANCE RULES (v2)
   ------------------
   • Weight is used to show hierarchy, not to shout.
       700  → page-level headings only (display, hero, sectionTitle)
       600  → almost never used directly
       500  → everything the eye lands on inside a card/UI
              (metric, cardTitle, label, button, tiny)
       400  → reading text (body, caption, navLink)
   • Big numbers get SIZE + COLOR, not heavy weight.
   • Large text → tighter line-height, small text → looser.
   • Persian note: letter-spacing is neutralised for RTL in
     globals.css, so negative tracking here is safe.
========================================================= */

export const typography = {
  fontFamily: {
    // Using the CSS variable ensures we always get Space Grotesk & Yekan Bakh
    sans: "var(--font-sans)",
    // Kept for technical values, IDs, or specific data points
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },

  /* =======================================================
     FONT SIZES (Min: 11px, Max: 26px)
     ======================================================= */
  size: {
    display: "var(--kz-fs-display)", // Maximum size: Main Hero title
    hero: "var(--kz-fs-hero)", // Secondary large headings
    metric: "var(--kz-fs-metric)", // Big numbers in data cards
    sectionTitle: "var(--kz-fs-section)", // Section headings
    stat: "var(--kz-fs-stat)", // Compact numbers (over photos, badges)
    cardTitle: "var(--kz-fs-card)", // Card headers
    bodyLarge: "var(--kz-fs-lead)", // Lead paragraphs under main headings
    body: "var(--kz-fs-body)", // Standard readable paragraph text
    bodyMedium: "var(--kz-fs-body-md)", // Slightly emphasized body text
    navLink: "13px", // Top navigation links
    label: "var(--kz-fs-label)", // Form labels, small headings
    button: "var(--kz-fs-button)", // Button text
    caption: "var(--kz-fs-caption)", // Secondary text, descriptions
    tiny: "var(--kz-fs-tiny)", // Smallest standard text, footnotes
    eyebrow: "var(--kz-fs-tiny)", // Minimum size: labels above titles
  },

  /* =======================================================
     FONT WEIGHTS
     ======================================================= */
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  /* =======================================================
     LINE HEIGHTS
     ======================================================= */
  lineHeight: {
    display: 1.2, // Persian ascenders/descenders need a touch more air
    hero: 1.25,
    sectionTitle: 1.3,
    cardTitle: 1.4,
    metric: 1.15,

    bodyLarge: 1.7,
    body: 1.7, // Relaxed for readability (esp. Persian)
    caption: 1.6,
    label: 1.3,

    stat: 1.15,
    tiny: 1.5,
    eyebrow: 1.3,
  },

  /* =======================================================
     LETTER SPACING
     ======================================================= */
  letterSpacing: {
    display: "-0.015em",
    hero: "-0.015em",
    sectionTitle: "-0.01em",
    cardTitle: "0",
    metric: "-0.01em",

    body: "0",
    caption: "0",

    eyebrow: "0.08em", // Latin only — neutralised for Persian in globals.css
    navLink: "0.005em",
    stat: "0",
  },
} as const;

/* =========================================================
   SEMANTIC TYPOGRAPHY ROLES
   ========================================================= */

export const typographyRoles = {
  /* --- HEADINGS --- */
  display: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.display,
    // Uses Bold (700) for Yekan Bakh Bold / Space Grotesk Bold
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.display,
    letterSpacing: typography.letterSpacing.display,
  },

  hero: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.hero,
    // Uses Bold (700)
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.hero,
    letterSpacing: typography.letterSpacing.hero,
  },

  sectionTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.sectionTitle,
    // Fixed: Now correctly uses Bold (700) instead of semibold
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.sectionTitle,
    letterSpacing: typography.letterSpacing.sectionTitle,
  },

  cardTitle: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.cardTitle,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.cardTitle,
    letterSpacing: typography.letterSpacing.cardTitle,
  },

  /* --- BODY TEXT --- */
  bodyLarge: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.bodyLarge,
    fontWeight: typography.weight.regular,
    lineHeight: typography.lineHeight.bodyLarge,
    letterSpacing: typography.letterSpacing.body,
  },

  body: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.body,
    fontWeight: typography.weight.regular,
    lineHeight: typography.lineHeight.body,
    letterSpacing: typography.letterSpacing.body,
  },

  bodyMedium: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.bodyMedium,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.body,
    letterSpacing: typography.letterSpacing.body,
  },

  /* --- UI ELEMENTS --- */
  label: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.label,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.label,
    letterSpacing: typography.letterSpacing.body,
  },

  navLink: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.navLink,
    fontWeight: typography.weight.regular,
    lineHeight: typography.lineHeight.label,
    letterSpacing: typography.letterSpacing.navLink,
  },

  button: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.button,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.label,
    letterSpacing: typography.letterSpacing.body,
  },

  /* --- DATA & METRICS --- */
  // Big card numbers: large but LIGHT — size and colour carry the emphasis
  metric: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.metric,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.metric,
    letterSpacing: typography.letterSpacing.metric,
    fontVariantNumeric: "tabular-nums",
  },

  // Compact numbers (over photos, in badges)
  stat: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.stat,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.stat,
    letterSpacing: typography.letterSpacing.stat,
    fontVariantNumeric: "tabular-nums", // Prevents numbers from jittering
  },

  /* --- SUPPORTING TEXT --- */
  caption: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.regular,
    lineHeight: typography.lineHeight.caption,
    letterSpacing: typography.letterSpacing.caption,
  },

  tiny: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.tiny,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.tiny,
    letterSpacing: typography.letterSpacing.body,
  },

  /* --- SPECIAL LABELS --- */
  eyebrow: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.size.eyebrow,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.eyebrow,
    letterSpacing: typography.letterSpacing.eyebrow,
    textTransform: "uppercase" as const,
  },
} as const;

/* =========================================================
   TYPES & HELPERS
   ========================================================= */

export type TypographyRole = keyof typeof typographyRoles;

export type TypographyStyle = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  textTransform?: "uppercase";
  fontVariantNumeric?: string;
};

export const getTypography = (role: TypographyRole): TypographyStyle => {
  return typographyRoles[role];
};

export const DEFAULT_TYPOGRAPHY_ROLE: TypographyRole = "body";
