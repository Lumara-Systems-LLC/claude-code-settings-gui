"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FolderOpen,
  Search,
  Trash2,
  Archive,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

type ProjectListItem = {
  id: string;
  path: string;
  memorySize: number;
  memorySizeHuman: string;
  lastModified: string;
  ageDays: number;
};

type ProjectDetail = ProjectListItem & {
  memory: string;
};

function ageString(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState("30");

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json() as Promise<ProjectListItem[]>;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["project", viewing],
    queryFn: async () => {
      if (!viewing) return null;
      const res = await fetch(`/api/projects?id=${encodeURIComponent(viewing)}`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json() as Promise<ProjectDetail>;
    },
    enabled: !!viewing,
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBulk = useMutation({
    mutationFn: async (days: number) => {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: days, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (r) => {
      toast.success(`Deleted ${r.deleted} project(s)`);
      queryClient.invalidateQueries({ queryKey: ["projects-list"] });
      setBulkOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter((p) => p.id.toLowerCase().includes(q));
  }, [data, query]);

  const totalBytes = data?.reduce((s, p) => s + p.memorySize, 0) ?? 0;
  const totalHuman =
    totalBytes > 1_000_000
      ? `${(totalBytes / 1_000_000).toFixed(1)} MB`
      : `${Math.round(totalBytes / 1024)} KB`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load projects</AlertDescription>
      </Alert>
    );
  }

  const projects = data ?? [];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} project context directories · {totalHuman} total memory
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            disabled={projects.length === 0}
          >
            <Archive className="h-4 w-4 mr-2" />
            Bulk delete old projects
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Each project here is a session-context cache keyed by working directory.
            Deleting one removes Claude&apos;s memory of that project; the next session in
            that directory starts fresh.
          </AlertDescription>
        </Alert>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {projects.length === 0
                ? "No projects tracked yet."
                : "No projects match your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {filtered.map((p) => (
              <Card key={p.id} className="hover:bg-accent/30 transition-colors">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-mono truncate">
                        {p.id}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {p.memorySizeHuman}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {ageString(p.ageDays)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewing(p.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete project ${p.id}?`)) {
                          deleteOne.mutate(p.id);
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

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono break-all">{viewing}</DialogTitle>
            <DialogDescription>
              Raw <code>memory.json</code> — read-only
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {detailQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : detailQuery.data ? (
              <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto">
                {detailQuery.data.memory || "(empty)"}
              </pre>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk delete old projects</DialogTitle>
            <DialogDescription>
              Permanently delete project context directories last modified more than N days
              ago.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="bulk-days-projects" className="text-sm font-medium">
              Older than (days)
            </label>
            <Input
              id="bulk-days-projects"
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
