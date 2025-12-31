"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { dashboardTourSteps, TourStep } from "@/lib/tour-steps";
import { useOnboarding } from "@/hooks/use-onboarding";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  currentStepData: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { completeTour } = useOnboarding();

  const steps = dashboardTourSteps;
  const currentStepData = isActive ? steps[currentStep] ?? null : null;

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Tour complete
      setIsActive(false);
      completeTour();
    }
  }, [currentStep, steps.length, completeTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    completeTour();
  }, [completeTour]);

  const endTour = useCallback(() => {
    setIsActive(false);
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index);
    }
  }, [steps.length]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        currentStepData,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        endTour,
        goToStep,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
