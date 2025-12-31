"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useTour } from "./tour-provider";
import { StarterPackDialog } from "./starter-pack-dialog";
import { Sparkles, SkipForward, Rocket } from "lucide-react";

export function WelcomeDialog() {
  const { isLoaded, isFirstVisit, dismissWelcome } = useOnboarding();
  const { startTour } = useTour();
  const [open, setOpen] = useState(false);
  const [starterPackOpen, setStarterPackOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && isFirstVisit) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isFirstVisit]);

  const handleTakeTour = () => {
    setOpen(false);
    dismissWelcome();
    // Small delay to let dialog close animation complete
    setTimeout(() => {
      startTour();
    }, 200);
  };

  const handleSkip = () => {
    setOpen(false);
    dismissWelcome();
  };

  const handleQuickStart = () => {
    setOpen(false);
    setStarterPackOpen(true);
  };

  const handleStarterPackComplete = () => {
    dismissWelcome();
  };

  if (!isLoaded) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome to Claude Code Settings
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            This dashboard helps you manage your Claude Code configuration -
            rules, skills, agents, hooks, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-lg">📏</span>
            </div>
            <div>
              <p className="font-medium text-sm">Rules & Skills</p>
              <p className="text-xs text-muted-foreground">
                Define development guidelines and reusable workflows
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="font-medium text-sm">Agents & Hooks</p>
              <p className="text-xs text-muted-foreground">
                Create specialized AI roles and automate events
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="text-lg">⚙️</span>
            </div>
            <div>
              <p className="font-medium text-sm">Configuration</p>
              <p className="text-xs text-muted-foreground">
                Manage permissions, MCP servers, and settings
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
            <SkipForward className="h-4 w-4 mr-2" />
            Skip for now
          </Button>
          <Button variant="secondary" onClick={handleQuickStart} className="w-full sm:w-auto">
            <Rocket className="h-4 w-4 mr-2" />
            Quick Start
          </Button>
          <Button onClick={handleTakeTour} className="w-full sm:w-auto">
            <Sparkles className="h-4 w-4 mr-2" />
            Take the Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <StarterPackDialog
      open={starterPackOpen}
      onOpenChange={setStarterPackOpen}
      onComplete={handleStarterPackComplete}
    />
    </>
  );
}
