"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type CleanableDir = {
  name: string;
  path: string;
  sizeBytes: number;
  sizeHuman: string;
  itemCount: number;
  exists: boolean;
};

const DESCRIPTIONS: Record<string, string> = {
  cache: "Multi-layer cache (repo scans, context injections, agent DAGs)",
  "paste-cache": "Cached clipboard content for paste recovery",
  statsig: "Feature flag SDK state — regenerated on next session",
  "session-env": "Per-session env-var snapshots — old ones unused",
  "shell-snapshots": "Shell environment snapshots for debugging",
  debug: "Diagnostic logs from tool failures and hook errors",
};

export function CacheCleaner() {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<CleanableDir | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["clearable-caches"],
    queryFn: async () => {
      const res = await fetch("/api/storage/clear-cache");
      if (!res.ok) throw new Error("Failed to load cache info");
      return res.json() as Promise<CleanableDir[]>;
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (dirName: string) => {
      const res = await fetch("/api/storage/clear-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dirName, confirmed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to clear");
      }
      return res.json() as Promise<{
        cleared: { sizeHuman: string; itemCount: number };
      }>;
    },
    onSuccess: (result, dirName) => {
      toast.success(
        `Cleared ${dirName}: freed ${result.cleared.sizeHuman} (${result.cleared.itemCount} items)`
      );
      queryClient.invalidateQueries({ queryKey: ["clearable-caches"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      setConfirmTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache cleaner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const dirs = data ?? [];
  const totalClearable = dirs.reduce((s, d) => s + d.sizeBytes, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cache cleaner</span>
            {totalClearable > 0 && (
              <Badge variant="secondary">
                {dirs[0] &&
                  `${(totalClearable / 1024 / 1024).toFixed(1)} MB clearable`}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dirs.map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-medium">{d.name}/</code>
                  {!d.exists && (
                    <Badge variant="outline" className="text-xs">
                      empty
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {DESCRIPTIONS[d.name] ?? "Cache directory"}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                <div className="font-medium">{d.sizeHuman}</div>
                <div>{d.itemCount} items</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!d.exists || d.itemCount === 0 || clearMutation.isPending}
                onClick={() => setConfirmTarget(d)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmTarget}
        onOpenChange={(o) => !o && setConfirmTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear {confirmTarget?.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the contents of{" "}
              <code>~/.claude/{confirmTarget?.name}/</code> (
              {confirmTarget?.sizeHuman}, {confirmTarget?.itemCount} items). Claude will
              rebuild what it needs on the next session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmTarget) clearMutation.mutate(confirmTarget.name);
              }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? "Clearing..." : "Clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
