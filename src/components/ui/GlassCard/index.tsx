import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { GlassBase } from "@/components/ui/GlassBase";

export const GlassCard = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <GlassBase
      ref={ref}
      variant="medium"
      className={cn("rounded-2xl", className)}
      {...props}
    >
      {children}
    </GlassBase>
  );
});
GlassCard.displayName = "GlassCard";
