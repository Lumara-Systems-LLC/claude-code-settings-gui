"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Edit,
  Trash2,
  Filter,
  Info,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";

type AuditEntry = {
  timestamp: number;
  action: "write" | "delete" | "create";
  path: string;
  size?: number;
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function AuditPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "write" | "delete">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", filter],
    queryFn: async () => {
      const url =
        filter === "all"
          ? "/api/audit"
          : `/api/audit?action=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json() as Promise<{ entries: AuditEntry[]; total: number }>;
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/audit", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Audit log cleared");
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const entries = useMemo(() => data?.entries ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Every file change made through this GUI ({data?.total ?? 0} entries)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Clear entire audit log?")) clearMutation.mutate();
          }}
          disabled={!entries.length || clearMutation.isPending}
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear log
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Audit entries are appended to <code>~/.claude/.gui-audit.jsonl</code>. Backups
          of each overwritten file are kept alongside it — use the{" "}
          <a href="/data/backups" className="underline">Backups</a> page to restore.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Filter className="h-4 w-4 mt-2 text-muted-foreground" />
        {(["all", "write", "delete"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load audit log.</AlertDescription>
        </Alert>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audit entries yet. Make any change in the GUI and it&apos;ll show up here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {entries.map((e, i) => (
              <div
                key={`${e.timestamp}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
              >
                {e.action === "write" ? (
                  <Edit className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                <Badge
                  variant={e.action === "delete" ? "destructive" : "secondary"}
                  className="text-xs uppercase"
                >
                  {e.action}
                </Badge>
                <code className="text-xs flex-1 truncate">{e.path}</code>
                {e.size !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {(e.size / 1024).toFixed(1)}KB
                  </span>
                )}
                <span
                  className="text-xs text-muted-foreground whitespace-nowrap"
                  title={new Date(e.timestamp).toLocaleString()}
                >
                  {relativeTime(e.timestamp)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
