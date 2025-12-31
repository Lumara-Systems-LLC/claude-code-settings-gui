"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, HardDrive, Trash2, RefreshCw, Folder, Download, Upload, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "@/components/ui/info-tip";
import { helpContent } from "@/lib/help-content";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { StorageStats } from "@/types/storage";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
];

export default function StoragePage() {
  const queryClient = useQueryClient();
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<"normal" | "aggressive">(
    "normal"
  );
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["storage"],
    queryFn: async () => {
      const response = await fetch("/api/storage");
      if (!response.ok) throw new Error("Failed to load storage stats");
      return response.json() as Promise<StorageStats>;
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async ({
      dryRun,
      aggressive,
    }: {
      dryRun: boolean;
      aggressive: boolean;
    }) => {
      const response = await fetch("/api/storage/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, aggressive }),
      });
      if (!response.ok) throw new Error("Failed to run cleanup");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.info("Dry run completed", {
          description: "Preview what would be deleted",
        });
      } else {
        toast.success("Cleanup completed successfully");
        queryClient.invalidateQueries({ queryKey: ["storage"] });
      }
      setCleanupDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Cleanup failed: " + error.message);
    },
  });

  const handleBackup = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Backup failed");
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || "claude-backup.tar.gz";

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded successfully");
    } catch (error) {
      toast.error(`Backup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", restoreMode);

      const response = await fetch("/api/backup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Restore failed");
      }

      const result = await response.json();
      toast.success(`Restored ${result.restoredItems.length} items`);
      setRestoreDialogOpen(false);

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(`Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !stats) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load storage statistics</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const ephemeralTotal = stats.ephemeralDirectories.reduce(
    (acc, d) => acc + d.sizeBytes,
    0
  );
  const permanentTotal = stats.directories.reduce(
    (acc, d) => acc + d.sizeBytes,
    0
  );
  const ephemeralPercent = Math.round((ephemeralTotal / stats.totalBytes) * 100);

  const pieData = [
    ...stats.ephemeralDirectories.map((d) => ({
      name: d.name,
      value: d.sizeBytes,
      size: d.sizeHuman,
    })),
    ...stats.directories.map((d) => ({
      name: d.name,
      value: d.sizeBytes,
      size: d.sizeHuman,
    })),
  ].filter((d) => d.value > 0);

  const barData = stats.ephemeralDirectories
    .filter((d) => d.sizeBytes > 0)
    .map((d) => ({
      name: d.name,
      size: Math.round(d.sizeBytes / 1024 / 1024),
    }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Storage</h1>
            <p className="text-sm text-muted-foreground">
              Manage ~/.claude directory storage
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBackup}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Backup
            </Button>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Restore
            </Button>
            <Button
              variant="destructive"
              onClick={() => setCleanupDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Run Cleanup
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.totalSize}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Ephemeral Data
                <InfoTip
                  content={helpContent.storage.ephemeralData.description}
                  side="bottom"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {ephemeralPercent}%
              </div>
              <Progress value={ephemeralPercent} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Directories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.directories.length + stats.ephemeralDirectories.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Cleanable Space
                <InfoTip
                  content={helpContent.storage.cleanableSpace.description}
                  side="bottom"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.ephemeralDirectories
                  .reduce((acc, d) => acc + d.sizeBytes, 0) > 0
                  ? `${Math.round(ephemeralTotal / 1024 / 1024)} MB`
                  : "0 MB"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Storage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, payload }) => `${name} (${payload?.size || ""})`}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        `${Math.round(Number(value) / 1024 / 1024)} MB`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ephemeral Data (MB)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="size" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Permanent Directories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.directories.map((dir) => (
                  <div
                    key={dir.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dir.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {dir.itemCount} items
                      </span>
                      <Badge variant="secondary">{dir.sizeHuman}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Ephemeral Directories
                <Badge variant="outline" className="text-orange-500">
                  Auto-cleaned
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.ephemeralDirectories.map((dir) => (
                  <div
                    key={dir.name}
                    className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/5 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">{dir.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {dir.itemCount} items
                      </span>
                      <Badge variant="secondary">{dir.sizeHuman}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Cleanup</DialogTitle>
            <DialogDescription>
              This will delete ephemeral data older than the retention period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Button
                  variant={cleanupMode === "normal" ? "default" : "outline"}
                  onClick={() => setCleanupMode("normal")}
                  className="w-full"
                >
                  Normal (30 days)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {helpContent.storage.cleanupModes.normal.description}
                </p>
              </div>
              <div className="flex-1 space-y-1">
                <Button
                  variant={cleanupMode === "aggressive" ? "default" : "outline"}
                  onClick={() => setCleanupMode("aggressive")}
                  className="w-full"
                >
                  Aggressive (7 days)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {helpContent.storage.cleanupModes.aggressive.description}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                onClick={() =>
                  cleanupMutation.mutate({
                    dryRun: true,
                    aggressive: cleanupMode === "aggressive",
                  })
                }
                disabled={cleanupMutation.isPending}
              >
                {cleanupMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Dry Run
              </Button>
              <InfoTip
                content={helpContent.storage.dryRun.description}
                side="top"
              />
            </div>
            <Button
              variant="destructive"
              onClick={() =>
                cleanupMutation.mutate({
                  dryRun: false,
                  aggressive: cleanupMode === "aggressive",
                })
              }
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Run Cleanup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Restore Configuration
            </DialogTitle>
            <DialogDescription>
              Restore your Claude configuration from a backup file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Button
                  variant={restoreMode === "merge" ? "default" : "outline"}
                  onClick={() => setRestoreMode("merge")}
                  className="w-full"
                >
                  Merge
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Add new items, backup existing before overwrite
                </p>
              </div>
              <div className="flex-1 space-y-1">
                <Button
                  variant={restoreMode === "replace" ? "default" : "outline"}
                  onClick={() => setRestoreMode("replace")}
                  className="w-full"
                >
                  Replace
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Full restore, backs up current config first
                </p>
              </div>
            </div>

            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <input
                type="file"
                id="backup-file"
                accept=".tar.gz,.tgz"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRestore(file);
                }}
              />
              <label
                htmlFor="backup-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Restoring...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to select backup file (.tar.gz)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
