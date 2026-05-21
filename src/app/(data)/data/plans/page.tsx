"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Trash2, Search, Archive } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PlanListItem = {
  name: string;
  path: string;
  size: string;
  sizeBytes: number;
  lastModified: string;
  preview?: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState("30");

  const { data, isLoading, error } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json() as Promise<PlanListItem[]>;
    },
  });

  const deleteOne = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch("/api/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  const deleteOlder = useMutation({
    mutationFn: async (days: number) => {
      const res = await fetch("/api/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: days, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deleted} plan(s)`);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setBulkOpen(false);
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.preview ?? "").toLowerCase().includes(q)
    );
  }, [data, query]);

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
        <AlertDescription>Failed to load plans.</AlertDescription>
      </Alert>
    );
  }

  const plans = data ?? [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Plans</h1>
            <p className="text-sm text-muted-foreground">
              Session-generated multi-step plans ({plans.length} total)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            disabled={plans.length === 0}
          >
            <Archive className="h-4 w-4 mr-2" />
            Bulk delete old plans
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename or first heading..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {plans.length === 0
                ? "No plans yet. Plans are generated during planning sessions in Claude Code."
                : "No plans match your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((plan) => (
              <Card key={plan.name} className="hover:bg-accent/30 transition-colors">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Link
                      href={`/data/plans/${encodeURIComponent(plan.name)}`}
                      className="flex-1 min-w-0"
                    >
                      <CardTitle className="text-sm font-mono truncate hover:underline">
                        {plan.name.replace(".md", "")}
                      </CardTitle>
                      {plan.preview && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {plan.preview}
                        </p>
                      )}
                    </Link>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {plan.size}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(plan.lastModified)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete plan ${plan.name}?`)) {
                          deleteOne.mutate(plan.name);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk delete old plans</DialogTitle>
            <DialogDescription>
              Permanently remove all plans last modified more than N days ago. This cannot be
              undone.
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
              onClick={() => deleteOlder.mutate(parseInt(bulkDays, 10) || 30)}
              disabled={deleteOlder.isPending}
            >
              {deleteOlder.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
