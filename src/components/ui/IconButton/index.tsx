import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/ui/GlassSurface";

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => {
  return (
    <GlassSurface
      as="button"
      ref={ref} // 'as any' removed
      type={type}
      variant="transparent"
      className={cn(
        "p-2 rounded-full text-kz-icon-muted",
        "hover:text-kz-icon-primary hover:border-kz-brand-accent/40 hover:bg-kz-brand-faint",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kz-brand-accent/60",
        className,
      )}
      {...props}
    />
  );
});
IconButton.displayName = "IconButton";
