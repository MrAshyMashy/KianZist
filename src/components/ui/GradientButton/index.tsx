import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import Typography from "@/typography";

export interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  textClassName?: string;
}

export const GradientButton = forwardRef<
  HTMLButtonElement,
  GradientButtonProps
>(
  (
    {
      className,
      children,
      icon,
      iconPosition = "right",
      textClassName,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "kz-shimmer group flex items-center justify-center gap-2 rounded-full bg-kz-brand-gradient px-6 py-3 text-white shadow-[0_0_20px_rgba(39,215,166,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(39,215,166,0.55)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/60",
          className,
        )}
        {...props}
      >
        {icon && iconPosition === "left" && (
          <span className="flex shrink-0 items-center justify-center transition-transform duration-300">
            {icon}
          </span>
        )}

        <Typography
          variant="button"
          as="span"
          className={cn(
            "whitespace-nowrap font-semibold text-white",
            textClassName,
          )}
        >
          {children}
        </Typography>

        {icon && iconPosition === "right" && (
          <span className="flex shrink-0 items-center justify-center transition-transform duration-300">
            {icon}
          </span>
        )}
      </button>
    );
  },
);

GradientButton.displayName = "GradientButton";
