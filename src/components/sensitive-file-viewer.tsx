"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const REVEAL_DURATION_MS = 60_000;

type Props = {
  path: string;
  filename: string;
  open: boolean;
  onClose: () => void;
};

export function SensitiveFileViewer({ path, filename, open, onClose }: Props) {
  const [phase, setPhase] = useState<"warn" | "revealed">("warn");
  const [content, setContent] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(REVEAL_DURATION_MS / 1000);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rehide = useCallback(() => {
    setContent("");
    setPhase("warn");
    setSecondsLeft(REVEAL_DURATION_MS / 1000);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      rehide();
    }
  }, [open, rehide]);

  // Auto-rehide on visibility change (switching tabs hides secrets)
  useEffect(() => {
    if (phase !== "revealed") return;
    const onVis = () => {
      if (document.hidden) rehide();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, rehide]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "revealed") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          rehide();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, rehide]);

  async function handleReveal() {
    setLoading(true);
    try {
      const tokenRes = await fetch("/api/files/reveal-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, acknowledged: true }),
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to obtain reveal token");
      }
      const { token } = await tokenRes.json();

      const fileRes = await fetch(
        `/api/files?path=${encodeURIComponent(path)}&reveal=${encodeURIComponent(token)}`
      );
      if (!fileRes.ok) {
        const body = await fileRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch file");
      }
      const data = await fileRes.json();
      if (data.masked) {
        throw new Error("Reveal token was rejected — token may have expired");
      }
      setContent(data.content);
      setPhase("revealed");
      setSecondsLeft(REVEAL_DURATION_MS / 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            {phase === "warn" ? "Reveal sensitive file?" : "Sensitive file revealed"}
          </DialogTitle>
          <DialogDescription>
            <code className="text-xs">{filename}</code>
          </DialogDescription>
        </DialogHeader>

        {phase === "warn" ? (
          <div className="space-y-3 py-2">
            <Alert variant="default" className="border-orange-500/50 bg-orange-500/5">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              <AlertDescription>
                This file contains credentials or secrets. Anyone looking at your screen,
                a screen-share, or a screenshot will see them. Re-hide closes after{" "}
                <strong>{REVEAL_DURATION_MS / 1000} seconds</strong> or when you switch tabs.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Continue only if you&apos;re alone and know what you&apos;re doing.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-2 py-2 min-h-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orange-500 font-medium">
                REVEALED — auto-hides in {secondsLeft}s
              </span>
              <Button size="sm" variant="ghost" onClick={rehide}>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                Hide now
              </Button>
            </div>
            <pre className="text-xs bg-muted/50 border rounded p-3 overflow-auto whitespace-pre-wrap break-all font-mono">
              {content}
            </pre>
          </div>
        )}

        <DialogFooter>
          {phase === "warn" ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleReveal} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "Reveal contents"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
