import { GlassBase, GlassBaseProps } from "@/components/ui/GlassBase";
import { ElementType } from "react";

export type GlassSurfaceProps<C extends ElementType = "div"> =
  GlassBaseProps<C>;

export const GlassSurface = GlassBase;
