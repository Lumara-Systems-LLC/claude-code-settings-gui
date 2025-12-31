"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";
import { TourProvider, TourOverlay, WelcomeDialog } from "@/components/onboarding";

// Dynamically import FileWatcher with SSR disabled
const FileWatcher = dynamic(
  () => import("@/components/file-watcher").then((mod) => mod.FileWatcher),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TourProvider>
          {children}
          <FileWatcher />
          <TourOverlay />
          <WelcomeDialog />
          <Toaster richColors position="bottom-right" />
        </TourProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
