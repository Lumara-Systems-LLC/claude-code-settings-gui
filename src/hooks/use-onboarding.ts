"use client";

import { useState, useEffect, useCallback } from "react";

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

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      if (stored) {
        setState(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage
  const saveState = useCallback((newState: OnboardingState) => {
    setState(newState);
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
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
    saveState({
      ...state,
      welcomeDismissed: true,
    });
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
