"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";
import { darkTheme, lightTheme, ThemeColors } from "./colors";

export * from "./colors";

export const useThemeColors = (): ThemeColors => {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return darkTheme;

  return resolvedTheme === "light" ? lightTheme : darkTheme;
};
