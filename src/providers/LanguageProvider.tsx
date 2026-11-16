"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Language = "fa" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => any; // Can return string or object depending on the depth
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Default language is now English
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Load saved language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("kianzist-lang") as Language;
    if (savedLang) {
      setLangState(savedLang);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("kianzist-lang", newLang);
  };

  // Apply direction and lang attribute to the <html> tag
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, mounted]);

  // Translation function
  // Note: In the future, this will fetch from the API or load JSON files dynamically.
  const t = (path: string) => {
    try {
      // Dynamic import placeholder. We will use static imports for now.
      // This is where you connect to your data files or backend.
      return path;
    } catch (e) {
      return path;
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t, isRTL: lang === "fa" }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
