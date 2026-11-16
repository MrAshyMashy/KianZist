import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Typography from "@/typography";
import { GlassBase } from "@/components/ui/GlassBase";

export interface LiveBadgeProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "glass" | "neutral" | "secondary";
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}

export const LiveBadge = ({
  children,
  icon,
  variant = "primary",
  className,
  textClassName,
  iconClassName,
}: LiveBadgeProps) => {
  const baseClasses =
    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors";

  const variants = {
    primary:
      "border-kz-brand-accent/30 bg-kz-brand-accent/10 text-kz-brand-accent shadow-kz-glow-accent",
    secondary:
      "border-kz-brand-secondary/30 bg-kz-brand-secondary/10 text-kz-text-secondary shadow-kz-glow-blue",
    glass: "border-kz-brand-accent/30 text-kz-text-heading",
    neutral: "border-kz-border-strong text-kz-text-heading",
  };

  const renderedIcon = icon ? (
    <span
      className={cn("flex shrink-0 items-center justify-center", iconClassName)}
    >
      {icon}
    </span>
  ) : (
    <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );

  const content = (
    <>
      {renderedIcon}
      <Typography
        variant="tiny"
        className={cn("font-mono uppercase tracking-widest", textClassName)}
      >
        {children}
      </Typography>
    </>
  );

  if (variant === "glass" || variant === "neutral") {
    return (
      <GlassBase
        variant={variant === "glass" ? "light" : "medium"}
        className={cn(baseClasses, "border", variants[variant], className)}
      >
        {content}
      </GlassBase>
    );
  }

  return (
    <div className={cn(baseClasses, "border", variants[variant], className)}>
      {content}
    </div>
  );
};
