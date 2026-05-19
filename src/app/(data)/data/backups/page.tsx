"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Archive,
  Search,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type BackupEntry = {
  backupPath: string;
  backupName: string;
  originalPath: string;
  originalName: string;
  originalRelative: string;
  timestamp: number;
  sizeBytes: number;
  sizeHuman: string;
  age: string;
};

export default function BackupsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState("30");
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await fetch("/api/backups");
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json() as Promise<BackupEntry[]>;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupPath: string) => {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupPath }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to restore");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Backup restored (current file was backed up first)");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setRestoreTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOne = useMutation({
    mutationFn: async (backupPath: string) => {
      const res = await fetch("/api/backups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupPath, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Backup deleted");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBulk = useMutation({
    mutationFn: async (days: number) => {
      const res = await fetch("/api/backups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: days, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deleted} backup(s)`);
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setBulkOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (b) =>
        b.originalRelative.toLowerCase().includes(q) ||
        b.originalName.toLowerCase().includes(q)
    );
  }, [data, query]);

  // Group by original file (most recent backup first per group)
  const grouped = useMemo(() => {
    const groups = new Map<string, BackupEntry[]>();
    for (const b of filtered) {
      const list = groups.get(b.originalRelative) ?? [];
      list.push(b);
      groups.set(b.originalRelative, list);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => (b[1][0]?.timestamp ?? 0) - (a[1][0]?.timestamp ?? 0)
    );
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load backups.</AlertDescription>
      </Alert>
    );
  }

  const total = data?.length ?? 0;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Backups</h1>
            <p className="text-sm text-muted-foreground">
              {total} auto-backups across your config — generated before every save
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            disabled={total === 0}
          >
            <Archive className="h-4 w-4 mr-2" />
            Bulk delete old backups
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by original filename..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {grouped.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {total === 0
                ? "No backups yet. Backups are automatically created before any save."
                : "No backups match your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {grouped.map(([originalRelative, backups]) => (
              <Card key={originalRelative}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono break-all">
                    {originalRelative}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {backups.length} backup{backups.length === 1 ? "" : "s"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-1">
                  {backups.map((b) => (
                    <div
                      key={b.backupPath}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {b.sizeHuman}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {b.age}
                      </span>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {new Date(b.timestamp).toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(b)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete this backup?`)) {
                            deleteOne.mutate(b.backupPath);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              The current <code>{restoreTarget?.originalRelative}</code> will be replaced
              with the backup from{" "}
              <strong>
                {restoreTarget &&
                  new Date(restoreTarget.timestamp).toLocaleString()}
              </strong>
              . A fresh backup of the current file is created first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (restoreTarget) {
                  restoreMutation.mutate(restoreTarget.backupPath);
                }
              }}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk delete old backups</DialogTitle>
            <DialogDescription>
              Permanently remove all backups older than N days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="bulk-days" className="text-sm font-medium">
              Older than (days)
            </label>
            <Input
              id="bulk-days"
              type="number"
              min="1"
              value={bulkDays}
              onChange={(e) => setBulkDays(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteBulk.mutate(parseInt(bulkDays, 10) || 30)}
              disabled={deleteBulk.isPending}
            >
              {deleteBulk.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
