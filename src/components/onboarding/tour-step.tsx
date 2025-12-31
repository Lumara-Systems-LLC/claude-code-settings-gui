"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTour } from "./tour-provider";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Sparkles,
  ScrollText,
  Zap,
  Bot,
  Webhook,
  Rocket,
  HardDrive,
  FileCode,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

type ArrowPosition = "top" | "bottom" | "left" | "right";

// Icon mapping for tour steps
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  ScrollText,
  Zap,
  Bot,
  Webhook,
  Rocket,
  HardDrive,
  FileCode,
};

function getArrowStyles(
  position: ArrowPosition,
  targetPos: Position,
  popoverPos: { top: number; left: number },
  popoverWidth: number
): React.CSSProperties {
  const arrowSize = 8;

  switch (position) {
    case "bottom":
      return {
        position: "absolute",
        top: -arrowSize,
        left: Math.min(
          Math.max(
            targetPos.left + targetPos.width / 2 - popoverPos.left - arrowSize,
            16
          ),
          popoverWidth - 32
        ),
        width: 0,
        height: 0,
        borderLeft: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid hsl(var(--popover))`,
      };
    case "top":
      return {
        position: "absolute",
        bottom: -arrowSize,
        left: Math.min(
          Math.max(
            targetPos.left + targetPos.width / 2 - popoverPos.left - arrowSize,
            16
          ),
          popoverWidth - 32
        ),
        width: 0,
        height: 0,
        borderLeft: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid transparent`,
        borderTop: `${arrowSize}px solid hsl(var(--popover))`,
      };
    case "left":
      return {
        position: "absolute",
        right: -arrowSize,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderLeft: `${arrowSize}px solid hsl(var(--popover))`,
      };
    case "right":
      return {
        position: "absolute",
        left: -arrowSize,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid hsl(var(--popover))`,
      };
  }
}

export function TourOverlay() {
  const {
    isActive,
    currentStep,
    steps,
    currentStepData,
    nextStep,
    prevStep,
    skipTour,
    goToStep,
  } = useTour();
  const [targetPosition, setTargetPosition] = useState<Position | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverWidth, setPopoverWidth] = useState(320);

  // Get icon component
  const IconComponent = useMemo(() => {
    if (!currentStepData?.icon) return null;
    return iconMap[currentStepData.icon] || null;
  }, [currentStepData?.icon]);

  useEffect(() => {
    if (!isActive || !currentStepData) {
      setTargetPosition(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(currentStepData.target);
      if (!target) {
        console.warn(`Tour target not found: ${currentStepData.target}`);
        return;
      }

      const rect = target.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const scrollLeft = window.scrollX;

      setTargetPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
      });

      // Scroll target into view
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStepData]);

  // Update popover width when ref changes
  useEffect(() => {
    if (popoverRef.current) {
      setPopoverWidth(popoverRef.current.offsetWidth);
    }
  }, [popoverPosition]);

  // Calculate popover position based on target and preferred position
  useEffect(() => {
    if (!targetPosition || !currentStepData || !popoverRef.current) return;

    const popoverRect = popoverRef.current.getBoundingClientRect();
    const padding = 16;
    const arrowOffset = 16;

    let top = 0;
    let left = 0;

    const position = currentStepData.position || "bottom";

    switch (position) {
      case "bottom":
        top = targetPosition.top + targetPosition.height + arrowOffset;
        left =
          targetPosition.left + targetPosition.width / 2 - popoverRect.width / 2;
        break;
      case "top":
        top = targetPosition.top - popoverRect.height - arrowOffset;
        left =
          targetPosition.left + targetPosition.width / 2 - popoverRect.width / 2;
        break;
      case "left":
        top =
          targetPosition.top + targetPosition.height / 2 - popoverRect.height / 2;
        left = targetPosition.left - popoverRect.width - arrowOffset;
        break;
      case "right":
        top =
          targetPosition.top + targetPosition.height / 2 - popoverRect.height / 2;
        left = targetPosition.left + targetPosition.width + arrowOffset;
        break;
    }

    // Keep popover in viewport
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - popoverRect.width - padding)
    );
    top = Math.max(
      padding,
      Math.min(top, window.innerHeight + window.scrollY - popoverRect.height - padding)
    );

    setPopoverPosition({ top, left });
  }, [targetPosition, currentStepData]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          skipTour();
          break;
        case "ArrowRight":
        case "Enter":
          handleNext();
          break;
        case "ArrowLeft":
          prevStep();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStep, steps.length, prevStep, skipTour]);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      // Last step - show celebration
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        nextStep();
      }, 1500);
    } else {
      nextStep();
    }
  };

  if (!isActive || !currentStepData) return null;

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const position = currentStepData.position || "bottom";

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/50 transition-opacity" />

      {/* Spotlight cutout with pulse animation */}
      {targetPosition && (
        <>
          {/* Pulse ring animation */}
          <div
            className="fixed z-101 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: targetPosition.top - 8,
              left: targetPosition.left - 8,
              width: targetPosition.width + 16,
              height: targetPosition.height + 16,
              boxShadow: "0 0 0 4px hsl(var(--primary) / 0.3)",
            }}
          />
          {/* Main spotlight */}
          <div
            className="fixed z-101 rounded-lg ring-2 ring-primary shadow-2xl transition-all duration-300"
            style={{
              top: targetPosition.top - 4,
              left: targetPosition.left - 4,
              width: targetPosition.width + 8,
              height: targetPosition.height + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            }}
          />
        </>
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-103 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce flex flex-col items-center gap-3 bg-background/95 backdrop-blur rounded-2xl p-8 shadow-2xl border">
            <PartyPopper className="h-16 w-16 text-primary animate-pulse" />
            <p className="text-xl font-semibold">Tour Complete!</p>
            <p className="text-muted-foreground">You&apos;re ready to go</p>
          </div>
        </div>
      )}

      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          "fixed z-[102] w-80 rounded-xl border bg-popover shadow-2xl overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{
          top: popoverPosition?.top ?? 0,
          left: popoverPosition?.left ?? 0,
          visibility: popoverPosition ? "visible" : "hidden",
        }}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        {/* Arrow pointing to target */}
        {targetPosition && popoverPosition && (
          <div
            style={getArrowStyles(
              position,
              targetPosition,
              popoverPosition,
              popoverWidth
            )}
          />
        )}

        {/* Header with step counter */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={skipTour}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            {IconComponent && (
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <h3
                id="tour-title"
                className="font-semibold leading-none tracking-tight"
              >
                {currentStepData.title}
              </h3>
              <p id="tour-content" className="text-sm text-muted-foreground">
                {currentStepData.content}
              </p>
            </div>
          </div>

          {/* Tip section */}
          {currentStepData.tip && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {currentStepData.tip}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            {/* Clickable progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-200 hover:scale-125",
                    i === currentStep
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLastStep ? (
                  <>
                    Finish
                    <PartyPopper className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
