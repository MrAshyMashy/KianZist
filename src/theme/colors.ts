/* =========================================================
   KianZist — Master Color Palette v3 (Emerald · Pistachio · Azure)
   ---------------------------------------------------------
   TS mirror of globals.css. Hex values here MUST match the
   RGB channels in globals.css (use for canvas / charts / JS).
========================================================= */

export interface ThemeColors {
  background: {
    body: string;
    surface: string;
    elevated: string;
    sunken: string;
    glass: string;
  };
  brand: {
    primary: string;
    primaryHover: string;
    primaryText: string;
    secondary: string;
    secondaryHover: string;
    secondaryDeep: string;
    secondarySoft: string;
    accent: string;
    accentHover: string;
    pistachio: string;
    pistachioText: string;
    faint: string;
  };
  text: {
    heading: string;
    body: string;
    muted: string;
    subtle: string;
    inverted: string;
    brand: string;
    secondary: string;
    pistachio: string;
  };
  border: {
    main: string;
    subtle: string;
    strong: string;
    brand: string;
    secondary: string;
  };
  icon: {
    primary: string;
    secondary: string;
    pistachio: string;
    muted: string;
    subtle: string;
    onPrimary: string;
    onMedia: string;
  };
  button: {
    primaryBg: string;
    primaryHover: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
    secondaryBorder: string;
    ghostHover: string;
  };
  input: { bg: string; border: string; focusRing: string; placeholder: string };
  card: { bg: string; border: string; shadow: string; hoverBorder: string };
  effects: {
    glowPrimary: string;
    glowSecondary: string;
    overlay: string;
    gridLine: string;
    selection: string;
    auroraPrimary: string;
    auroraSecondary: string;
    moleculeBond: string;
  };
  status: {
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
  };
}

/** "#2dd4a8" + 0.3 -> "rgba(45, 212, 168, 0.3)" (handy for canvas) */
export const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/* =========================================================
   DARK THEME — deep teal-slate, lifted well above black
========================================================= */
export const darkTheme: ThemeColors = {
  background: {
    body: "#0b161c",
    surface: "#101f27",
    elevated: "#162933",
    sunken: "#081116",
    glass: "rgba(11, 22, 28, 0.72)",
  },
  brand: {
    primary: "#2dd4a8",
    primaryHover: "#5eeac6",
    primaryText: "#08181c",
    secondary: "#38a8ff",
    secondaryHover: "#6ec0ff",
    secondaryDeep: "#1664c4",
    secondarySoft: "#8ccaff",
    accent: "#2dd4a8",
    accentHover: "#5eeac6",
    pistachio: "#b0de8c",
    pistachioText: "#b0de8c",
    faint: "rgba(45, 212, 168, 0.1)",
  },
  text: {
    heading: "#eef7f4",
    body: "#b6cdc7",
    muted: "#92aca5",
    subtle: "#708b84",
    inverted: "#0b161c",
    brand: "#2dd4a8",
    secondary: "#38a8ff",
    pistachio: "#b0de8c",
  },
  border: {
    main: "#26404b",
    subtle: "#1a2f39",
    strong: "#3c6270",
    brand: "rgba(45, 212, 168, 0.32)",
    secondary: "rgba(56, 168, 255, 0.32)",
  },
  icon: {
    primary: "#2dd4a8",
    secondary: "#38a8ff",
    pistachio: "#b0de8c",
    muted: "#92aca5",
    subtle: "#708b84",
    onPrimary: "#08181c",
    onMedia: "#ffffff",
  },
  button: {
    primaryBg: "#2dd4a8",
    primaryHover: "#5eeac6",
    primaryText: "#08181c",
    secondaryBg: "rgba(56, 168, 255, 0.12)",
    secondaryText: "#38a8ff",
    secondaryBorder: "rgba(56, 168, 255, 0.45)",
    ghostHover: "rgba(255, 255, 255, 0.06)",
  },
  input: {
    bg: "#101f27",
    border: "#26404b",
    focusRing: "#2dd4a8",
    placeholder: "#708b84",
  },
  card: {
    bg: "#101f27",
    border: "#26404b",
    shadow:
      "0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 10px 30px -14px rgba(0, 0, 0, 0.55)",
    hoverBorder: "#3c6270",
  },
  effects: {
    glowPrimary: "0 0 24px rgba(45, 212, 168, 0.2)",
    glowSecondary: "0 0 24px rgba(56, 168, 255, 0.24)",
    overlay: "rgba(4, 10, 14, 0.7)",
    gridLine: "rgba(45, 212, 168, 0.05)",
    selection: "rgba(45, 212, 168, 0.3)",
    auroraPrimary: "rgba(45, 212, 168, 0.1)",
    auroraSecondary: "rgba(56, 168, 255, 0.1)",
    moleculeBond: "rgba(56, 168, 255, 0.2)",
  },
  status: {
    success: "#34d399",
    successBg: "rgba(52, 211, 153, 0.15)",
    warning: "#fbbf24",
    warningBg: "rgba(251, 191, 36, 0.15)",
    danger: "#f87171",
    dangerBg: "rgba(248, 113, 113, 0.15)",
    info: "#38a8ff",
    infoBg: "rgba(56, 168, 255, 0.15)",
  },
};

/* =========================================================
   LIGHT THEME — neutral mint canvas, white cards, soft shadows
========================================================= */
export const lightTheme: ThemeColors = {
  background: {
    body: "#f3f9f7",
    surface: "#ffffff",
    elevated: "#ffffff",
    sunken: "#e9f2ef",
    glass: "rgba(243, 249, 247, 0.8)",
  },
  brand: {
    primary: "#0d6555",
    primaryHover: "#094c40",
    primaryText: "#ffffff",
    secondary: "#0066cc",
    secondaryHover: "#004c99",
    secondaryDeep: "#0b4aa0",
    secondarySoft: "#60a5f0",
    accent: "#0a7f6a",
    accentHover: "#086855",
    pistachio: "#7cb050",
    pistachioText: "#4a6e24",
    faint: "rgba(10, 127, 106, 0.07)",
  },
  text: {
    heading: "#08281f",
    body: "#314a43",
    muted: "#526c64",
    subtle: "#708881",
    inverted: "#ffffff",
    brand: "#0a7f6a",
    secondary: "#0066cc",
    pistachio: "#4a6e24",
  },
  border: {
    main: "#d9e6e2",
    subtle: "#ebf3f0",
    strong: "#a8c3bb",
    brand: "rgba(10, 127, 106, 0.28)",
    secondary: "rgba(0, 102, 204, 0.28)",
  },
  icon: {
    primary: "#0a7f6a",
    secondary: "#0066cc",
    pistachio: "#5f9139",
    muted: "#526c64",
    subtle: "#708881",
    onPrimary: "#ffffff",
    onMedia: "#ffffff",
  },
  button: {
    primaryBg: "#0d6555",
    primaryHover: "#094c40",
    primaryText: "#ffffff",
    secondaryBg: "rgba(0, 102, 204, 0.07)",
    secondaryText: "#0066cc",
    secondaryBorder: "rgba(0, 102, 204, 0.32)",
    ghostHover: "rgba(10, 127, 106, 0.06)",
  },
  input: {
    bg: "#ffffff",
    border: "#d9e6e2",
    focusRing: "#0a7f6a",
    placeholder: "#708881",
  },
  card: {
    bg: "#ffffff",
    border: "#d9e6e2",
    shadow:
      "0 1px 2px rgba(8, 40, 31, 0.04), 0 8px 24px -12px rgba(8, 40, 31, 0.12)",
    hoverBorder: "#a8c3bb",
  },
  effects: {
    glowPrimary: "0 8px 24px -8px rgba(10, 127, 106, 0.3)",
    glowSecondary: "0 8px 24px -8px rgba(0, 102, 204, 0.28)",
    overlay: "rgba(8, 40, 31, 0.4)",
    gridLine: "rgba(10, 127, 106, 0.04)",
    selection: "rgba(10, 127, 106, 0.18)",
    auroraPrimary: "rgba(10, 127, 106, 0.08)",
    auroraSecondary: "rgba(0, 102, 204, 0.08)",
    moleculeBond: "rgba(10, 127, 106, 0.2)",
  },
  status: {
    success: "#059669",
    successBg: "rgba(5, 150, 105, 0.1)",
    warning: "#d97706",
    warningBg: "rgba(217, 119, 6, 0.1)",
    danger: "#dc2626",
    dangerBg: "rgba(220, 38, 38, 0.1)",
    info: "#2563eb",
    infoBg: "rgba(37, 99, 235, 0.1)",
  },
};