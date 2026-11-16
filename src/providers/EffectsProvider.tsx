"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface EffectsContextType {
  effectsEnabled: boolean;
  toggleEffects: () => void;
}

const EffectsContext = createContext<EffectsContextType | undefined>(undefined);

export const EffectsProvider = ({ children }: { children: ReactNode }) => {
  // Default to true for SSR to match server render
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  useEffect(() => {
    // Check saved preference on mount
    const isDisabled =
      localStorage.getItem("kz_disable_heavy_effects") === "true";
    setEffectsEnabled(!isDisabled);
  }, []);

  const toggleEffects = () => {
    setEffectsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("kz_disable_heavy_effects", (!next).toString());
      return next;
    });
  };

  // ALWAYS wrap children in the Provider to prevent context errors during initial hydration
  return (
    <EffectsContext.Provider value={{ effectsEnabled, toggleEffects }}>
      {children}
    </EffectsContext.Provider>
  );
};

export const useEffects = () => {
  const context = useContext(EffectsContext);
  if (!context) {
    throw new Error("useEffects must be used within EffectsProvider");
  }
  return context;
};
