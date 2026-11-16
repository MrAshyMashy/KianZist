"use client";

import { ReactNode, useState, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { EffectsProvider } from "@/providers/EffectsProvider";
import { SpinnerProvider } from "@/components/ui/Spinner";
import { isFirstLoad, markAppLoaded } from "@/lib/appState";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { setSiteStatus, useSiteStatus, useIntroReady } from "@/lib/siteStatus";
import { AuroraBackground } from "@/components/ui/Motion/AuroraBackground";
import { ContextMenu } from "@/components/layout/ContextMenu";
import { applyPerfTier, probePerf } from "@/lib/perf";

interface AppShellProps {
  children: ReactNode;
}

// Inner component to handle provider context
const AppShellContent = ({
  children,
  queryClient,
  isLoading,
  setIsLoading,
  introReady,
  reduceMotion,
  showCover,
}: any) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SpinnerProvider size="xl" blur>
        {/* 
          AuroraBackground now runs independently of the effectsEnabled toggle.
          It will only be disabled if the user has system-level 'prefers-reduced-motion' enabled.
        */}
        {!reduceMotion && introReady && <AuroraBackground />}

        {showCover && (
          <div
            aria-hidden
            className="fixed inset-0 bg-kz-bg-body"
            style={{ zIndex: 9999998 }}
          />
        )}
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

        <ContextMenu />

        {children}
      </SpinnerProvider>
    </QueryClientProvider>
  );
};

const AppShell = ({ children }: AppShellProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [isLoading, setIsLoading] = useState(isFirstLoad());
  const status = useSiteStatus();

  const introReady = useIntroReady();

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Pick a performance tier once (drives --kz-blur-scale), then re-check it
  // against real frame times a few seconds after the intro has finished.
  useEffect(() => {
    applyPerfTier();
  }, []);

  useEffect(() => {
    if (!introReady) return;
    return probePerf();
  }, [introReady]);

  const showCover = isLoading && status !== "ready";

  useEffect(() => {
    if (isLoading) {
      setSiteStatus("loading");
    } else {
      markAppLoaded();
      setSiteStatus("ready");
    }
  }, [isLoading]);

  return (
    <LanguageProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
        <EffectsProvider>
          <AppShellContent
            queryClient={queryClient}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            introReady={introReady}
            reduceMotion={reduceMotion}
            showCover={showCover}
          >
            {children}
          </AppShellContent>
        </EffectsProvider>
      </NextThemesProvider>
    </LanguageProvider>
  );
};

export default AppShell;
