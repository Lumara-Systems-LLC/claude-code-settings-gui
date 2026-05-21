"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const ONBOARDING_KEY = "claude-settings-onboarding-v1";

export interface OnboardingState {
  tourCompleted: boolean;
  tourCompletedAt?: string;
  welcomeDismissed: boolean;
}

const defaultState: OnboardingState = {
  tourCompleted: false,
  welcomeDismissed: false,
};

// useSyncExternalStore-friendly subscription. localStorage doesn't natively
// emit events, so we hook into the `storage` event (cross-tab) and a custom
// in-process event that we dispatch on our own writes.
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("onboarding-state-changed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("onboarding-state-changed", callback);
  };
}

function readSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ONBOARDING_KEY) ?? "";
  } catch {
    return "";
  }
}

function readServerSnapshot(): string {
  return "";
}

export function useOnboarding() {
  // Track hydration so the initial "first visit" check doesn't fire on the
  // server (where localStorage isn't available).
  const [isLoaded, setIsLoaded] = useState(false);
  if (typeof window !== "undefined" && !isLoaded) {
    setIsLoaded(true);
  }

  const raw = useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);

  const state: OnboardingState = (() => {
    if (!raw) return defaultState;
    try {
      return { ...defaultState, ...(JSON.parse(raw) as Partial<OnboardingState>) };
    } catch {
      return defaultState;
    }
  })();

  const saveState = useCallback((newState: OnboardingState) => {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
      // Force re-read across hooks in the same tab
      window.dispatchEvent(new Event("onboarding-state-changed"));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const completeTour = useCallback(() => {
    saveState({
      ...state,
      tourCompleted: true,
      tourCompletedAt: new Date().toISOString(),
    });
  }, [state, saveState]);

  const dismissWelcome = useCallback(() => {
    saveState({ ...state, welcomeDismissed: true });
  }, [state, saveState]);

  const resetOnboarding = useCallback(() => {
    saveState(defaultState);
  }, [saveState]);

  const isFirstVisit = isLoaded && !state.tourCompleted && !state.welcomeDismissed;

  return {
    isLoaded,
    state,
    isFirstVisit,
    completeTour,
    dismissWelcome,
    resetOnboarding,
  };
}
