import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-xl border border-kz-border-main bg-kz-bg-surface/90 px-4 py-3 text-sm text-kz-text-heading outline-none transition-all duration-300 backdrop-blur-md shadow-kz-card",
          "placeholder:text-kz-text-muted focus:border-kz-brand-accent/50 focus:bg-kz-bg-surface",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
