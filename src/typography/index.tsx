import React from "react";
import { getTypography, type TypographyRole } from "./typography";

/* =========================================================
   KianZist — Typography Component
   ---------------------------------------------------------
   Semantic typography primitive for the application.

   Responsibilities:
   - Apply centralized typography roles (sizes, weights, spacing)
   - Preserve semantic HTML (e.g., rendering an h1 for titles)
   - Allow controlled local overrides (e.g., colors, margins)

   Does NOT own:
   - Colors (Handled by Tailwind theme classes)
   - Backgrounds
   - Layout / Spacing (Handled by wrapper divs)
   - Application state
========================================================= */

/* =========================================================
   SUPPORTED HTML ELEMENTS
   ========================================================= */

export type TypographyElement =
  | "span"
  | "p"
  | "div"
  | "label"
  | "strong"
  | "em"
  | "small"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6";

/* =========================================================
   PROPS
   ========================================================= */

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Semantic typography role (e.g., "display", "body", "eyebrow").
   * Determines font size, weight, and spacing.
   */
  variant?: TypographyRole;

  /**
   * Semantic HTML element.
   * Example: `variant="sectionTitle" as="h2"`
   */
  as?: TypographyElement;

  /**
   * Additional classes for color, margin, or specific overrides.
   * Example: `className="text-kz-brand-primary mb-4 font-bold"`
   */
  className?: string;

  /** Content to be rendered */
  children?: React.ReactNode;
}

/* =========================================================
   COMPONENT
   ========================================================= */

const TypographyComponent = ({
  variant = "body",
  as = "span",
  className = "",
  children,
  style,
  ...props
}: TypographyProps) => {
  const Component = as;

  // Fetch the inline styles for the selected typography role
  const typographyStyle = getTypography(variant);

  // Extract fontWeight from typographyStyle to handle Tailwind class overrides
  const { fontWeight, ...restTypographyStyle } = typographyStyle;

  // Check if a font weight utility class is explicitly provided in className
  const hasWeightClass =
    className.includes("font-bold") ||
    className.includes("font-semibold") ||
    className.includes("font-extrabold") ||
    className.includes("font-medium") ||
    className.includes("font-normal") ||
    className.includes("font-light") ||
    className.includes("font-thin");

  return (
    <Component
      className={className}
      style={{
        ...restTypographyStyle,
        // Only apply the inline fontWeight if no Tailwind weight class is provided
        // This prevents inline styles from overriding the developer's font-bold class
        ...(hasWeightClass ? {} : { fontWeight }),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default TypographyComponent;
