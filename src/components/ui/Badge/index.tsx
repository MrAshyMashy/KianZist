import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "outline" | "glass" | "solid" | "secondary" | "pistachio";
}

export const Badge = ({
  className,
  variant = "outline",
  children,
  ...props
}: BadgeProps) => {
  const baseClasses =
    "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider transition-colors";

  if (variant === "glass") {
    return (
      <GlassBase
        variant="medium"
        className={cn(baseClasses, "text-kz-text-heading", className)}
        {...props}
      >
        {children}
      </GlassBase>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        "border",
        variant === "outline" &&
          "border-kz-brand-accent/35 bg-kz-brand-accent/10 text-kz-brand-accent",
        variant === "secondary" &&
          "border-kz-brand-secondary/35 bg-kz-brand-secondary/10 text-kz-text-secondary",
        variant === "pistachio" &&
          "border-kz-brand-pistachio/45 bg-kz-brand-pistachio/15 text-kz-text-pistachio",
        variant === "solid" &&
          "border-transparent bg-kz-brand-primary text-kz-brand-text",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
