"use client";

import { AlertCircle, X } from "lucide-react";
import { useState } from "react";

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!IS_DEMO_MODE || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Demo Mode:</strong> You&apos;re viewing sample data. Changes won&apos;t be saved.{" "}
            <a
              href="https://github.com/DailyDisco/claude-code-settings-gui"
              className="underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install locally
            </a>{" "}
            to manage your own config.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
