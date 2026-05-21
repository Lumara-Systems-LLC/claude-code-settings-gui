"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "@/components/search/command-palette";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { G_JUMP_SHORTCUTS } from "@/lib/keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const G_TIMEOUT_MS = 1500;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const gPendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gActiveRef = useRef(false);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    const down = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }

      // Don't intercept keypresses inside text inputs
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? → shortcuts help (shift+/ on most keyboards)
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Escape clears any pending g-prefix
      if (e.key === "Escape") {
        if (gPendingRef.current) {
          clearTimeout(gPendingRef.current);
          gPendingRef.current = null;
        }
        gActiveRef.current = false;
        return;
      }

      // First press: g → start a g-jump sequence
      if (e.key === "g" && !gActiveRef.current) {
        e.preventDefault();
        gActiveRef.current = true;
        if (gPendingRef.current) clearTimeout(gPendingRef.current);
        gPendingRef.current = setTimeout(() => {
          gActiveRef.current = false;
          gPendingRef.current = null;
        }, G_TIMEOUT_MS);
        return;
      }

      // Second press inside g-jump window
      if (gActiveRef.current) {
        const target = G_JUMP_SHORTCUTS[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target.route);
        }
        gActiveRef.current = false;
        if (gPendingRef.current) {
          clearTimeout(gPendingRef.current);
          gPendingRef.current = null;
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
      if (gPendingRef.current) clearTimeout(gPendingRef.current);
    };
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onSearchOpen={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
