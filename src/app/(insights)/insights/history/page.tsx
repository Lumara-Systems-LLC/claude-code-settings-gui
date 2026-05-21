"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Search, Clock } from "lucide-react";

type HistoryEntry = {
  display: string;
  timestamp: number;
  project?: string;
  sessionId?: string;
};

type HistoryResponse = {
  entries: HistoryEntry[];
  total: number;
  totalScanned?: number;
  projects: string[];
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistoryPage() {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<string>("all");

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (project !== "all") params.set("project", project);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["history", query, project],
    queryFn: async () => {
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load history");
      return res.json() as Promise<HistoryResponse>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12" />
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
        <AlertDescription>Failed to load history.</AlertDescription>
      </Alert>
    );
  }

  const entries = data?.entries ?? [];
  const projects = data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">
          Search past prompts across {data?.totalScanned ?? "all"} session entries
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>
                <code className="text-xs">{p}</code>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground">
        {isFetching ? "Searching..." : `${data?.total ?? 0} matches`}
        {data && entries.length < data.total && ` (showing first ${entries.length})`}
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {query
              ? "No matches for your search."
              : "No history entries found. They build up as you use Claude Code."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e, idx) => (
            <Card key={`${e.timestamp}-${idx}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal">
                  {e.display.length > 200
                    ? `${e.display.slice(0, 200)}...`
                    : e.display}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-3 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span title={new Date(e.timestamp).toLocaleString()}>
                  {relativeTime(e.timestamp)}
                </span>
                {e.project && (
                  <Badge variant="outline" className="text-xs font-mono max-w-md truncate">
                    {e.project}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
