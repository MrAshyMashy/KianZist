import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "blue" | "soft" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) => {
    const baseClasses =
      "flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-kz-bg-body disabled:opacity-50 disabled:pointer-events-none";

    const sizeClasses = cn(
      size === "sm" && "px-4 py-2 text-sm",
      size === "md" && "px-6 py-3 text-base",
      size === "lg" && "px-8 py-4 text-lg",
    );

    if (variant === "secondary") {
      return (
        <GlassBase
          as="button"
          ref={ref}
          type={type}
          variant="medium"
          className={cn(
            baseClasses,
            sizeClasses,
            "border-kz-brand-secondary/35 bg-kz-brand-secondary/10 text-kz-text-secondary hover:bg-kz-brand-secondary/15 hover:border-kz-brand-secondary/70",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseClasses,
          "border",
          sizeClasses,
          variant === "primary" &&
            "border-kz-brand-accent/25 bg-kz-button-primaryBg text-kz-button-primaryText hover:bg-kz-button-primaryHover shadow-kz-glow",
          variant === "blue" &&
            "border-kz-brand-secondary/30 bg-kz-brand-deep text-white hover:bg-kz-brand-secondary shadow-kz-glow-blue",
          variant === "soft" &&
            "border-kz-brand-pistachio/40 bg-kz-brand-pistachio/15 text-kz-text-pistachio hover:bg-kz-brand-pistachio/25",
          variant === "ghost" &&
            "border-transparent bg-transparent text-kz-text-muted hover:text-kz-text-heading hover:bg-kz-button-ghostHover",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
