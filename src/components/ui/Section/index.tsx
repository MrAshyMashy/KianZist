import { forwardRef, HTMLAttributes, ElementType } from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  containerClassName?: string;
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      as: Component = "section",
      className,
      containerClassName,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "relative flex w-full items-center",
          "py-16 lg:py-0",
          className,
        )}
        {...props}
      >
        <div className={cn("relative z-10 w-full", containerClassName)}>
          {children}
        </div>
      </Component>
    );
  },
);

Section.displayName = "Section";
