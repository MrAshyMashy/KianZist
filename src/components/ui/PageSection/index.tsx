import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PageSectionProps extends HTMLAttributes<HTMLElement> {
  /** Set to true for the very first section on a page to give it more top clearance. */
  isFirst?: boolean;
  /** Set to true to remove standard padding if you need a custom layout. */
  noPadding?: boolean;
}

export const PageSection = forwardRef<HTMLElement, PageSectionProps>(
  ({ className, isFirst, noPadding, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "relative w-full",
          isFirst ? "kz-spacing-first" : "kz-spacing-section",
          noPadding && "!py-0",
          className,
        )}
        {...props}
      >
        {children}
      </section>
    );
  },
);

PageSection.displayName = "PageSection";
