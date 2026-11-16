import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-xl border border-kz-border-main bg-kz-bg-surface/90 px-4 py-3 text-sm text-kz-text-heading outline-none transition-all duration-300 backdrop-blur-md shadow-kz-card",
          "placeholder:text-kz-text-muted focus:border-kz-brand-accent/50 focus:bg-kz-bg-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
