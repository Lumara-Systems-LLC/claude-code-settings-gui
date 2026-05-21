"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GLOBAL_SHORTCUTS } from "@/lib/keyboard-shortcuts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutsHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {GLOBAL_SHORTCUTS.map((s) => (
            <div
              key={s.combo}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">
                {s.combo}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
