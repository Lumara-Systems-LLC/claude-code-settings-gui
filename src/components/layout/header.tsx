"use client";

import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Search, Menu, HelpCircle, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { MobileSidebar } from "./mobile-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTour } from "@/components/onboarding";
import { useOnboarding } from "@/hooks/use-onboarding";

interface HeaderProps {
  onSearchOpen?: () => void;
}

export function Header({ onSearchOpen }: HeaderProps) {
  const { startTour } = useTour();
  const { resetOnboarding } = useOnboarding();

  const handleRestartTour = () => {
    resetOnboarding();
    startTour();
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 md:flex"
        onClick={onSearchOpen}
      >
        <Search className="h-4 w-4" />
        <span className="text-muted-foreground">Search...</span>
        <kbd className="pointer-events-none ml-4 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onSearchOpen}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRestartTour}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Tour
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </header>
  );
}
