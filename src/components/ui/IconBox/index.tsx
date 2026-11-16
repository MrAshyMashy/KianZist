import { HTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";

export type IconBoxTone = "primary" | "secondary" | "neutral" | "glass";
export type IconBoxSize = "sm" | "md" | "lg";

export interface IconBoxProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  children?: ReactNode;
  tone?: IconBoxTone;
  size?: IconBoxSize;
  shape?: "square" | "circle";
}

export const IconBox = forwardRef<HTMLDivElement, IconBoxProps>(
  (
    {
      icon,
      children,
      tone = "primary",
      size = "md",
      shape = "square",
      className,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = cn(
      size === "sm" && "h-10 w-10",
      size === "md" && "h-12 w-12",
      size === "lg" && "h-14 w-14 md:h-16 md:w-16",
    );

    const shapeClasses = cn(
      shape === "circle" && "rounded-full",
      shape === "square" && size === "sm" && "rounded-xl",
      shape === "square" && size === "md" && "rounded-2xl",
      shape === "square" && size === "lg" && "rounded-[1.2rem]",
    );

    const toneClasses = cn(
      tone === "primary" &&
        "bg-kz-brand-accent/10 border-kz-brand-accent/30 text-kz-icon-primary shadow-kz-glow-accent",
      tone === "secondary" &&
        "bg-kz-brand-secondary/10 border-kz-brand-secondary/30 text-kz-icon-secondary shadow-kz-glow-blue",
      tone === "neutral" &&
        "bg-kz-bg-surface border-kz-border-subtle text-kz-text-heading shadow-kz-inner",
    );

    if (tone === "glass") {
      return (
        <GlassBase
          ref={ref}
          variant="light"
          className={cn(
            "flex shrink-0 items-center justify-center text-kz-text-heading",
            sizeClasses,
            shapeClasses,
            className,
          )}
          {...props}
        >
          {icon || children}
        </GlassBase>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center border transition-all duration-300",
          sizeClasses,
          shapeClasses,
          toneClasses,
          className,
        )}
        {...props}
      >
        {icon || children}
      </div>
    );
  },
);

IconBox.displayName = "IconBox";
