export type ThemeTone = "primary" | "secondary";

export interface AlternateColors {
  isGreen: boolean;
  tone: ThemeTone;
  text: string;
  bg: string;
  border: string;
  shadow: string;
  icon: string;
}

/**
 * Returns a set of consistent theme classes based on whether the index is even or odd.
 * Even index (0, 2, 4...) -> Green (Primary / Accent)
 * Odd index (1, 3, 5...)  -> Blue (Secondary)
 */
export const getAlternateColors = (index: number): AlternateColors => {
  const isGreen = index % 2 === 0;

  if (isGreen) {
    return {
      isGreen: true,
      tone: "primary",
      text: "text-kz-brand-accent",
      bg: "bg-kz-brand-accent/10",
      border: "border-kz-brand-accent/30",
      shadow: "shadow-kz-glow-accent",
      icon: "text-kz-icon-primary",
    };
  }

  return {
    isGreen: false,
    tone: "secondary",
    text: "text-kz-text-secondary",
    bg: "bg-kz-brand-secondary/10",
    border: "border-kz-brand-secondary/30",
    shadow: "shadow-kz-glow-blue",
    icon: "text-kz-icon-secondary",
  };
};
