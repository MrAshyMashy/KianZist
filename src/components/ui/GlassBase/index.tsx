import {
  forwardRef,
  ElementType,
  ComponentPropsWithoutRef,
  ReactElement,
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type GlassBaseProps<C extends ElementType = "div"> = {
  as?: C;
  variant?: "light" | "medium" | "heavy" | "transparent";
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<C>, "as" | "className" | "children">;

type PolymorphicRef<C extends ElementType> = ComponentPropsWithRef<C>["ref"];

type GlassBaseComponent = <C extends ElementType = "div">(
  props: GlassBaseProps<C> & { ref?: PolymorphicRef<C> },
) => ReactElement | null;

const GlassBaseRender = <C extends ElementType = "div">(
  { as, className, children, variant = "medium", ...props }: GlassBaseProps<C>,
  ref: PolymorphicRef<C>,
) => {
  const Component = as || "div";
  return (
    <Component
      ref={ref as any}
      className={cn(
        "relative border-kz-border-main transition-all duration-300",
        variant === "light" &&
          "border bg-kz-bg-surface/60 backdrop-blur-sm shadow-sm",
        variant === "medium" &&
          "border bg-kz-bg-surface/90 backdrop-blur-md shadow-kz-card",
        variant === "heavy" &&
          "border bg-kz-bg-surface/95 backdrop-blur-xl shadow-kz-card",
        variant === "transparent" &&
          "border bg-kz-bg-surface/40 backdrop-blur-md",
        className,
      )}
      {...(props as any)}
    >
      {children}
    </Component>
  );
};

export const GlassBase = forwardRef(
  GlassBaseRender as any,
) as unknown as GlassBaseComponent;
