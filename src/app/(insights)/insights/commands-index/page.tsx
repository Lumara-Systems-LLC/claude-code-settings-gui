"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

type IndexEntry = {
  name: string;
  command: string;
  description: string;
  output_style: string | null;
  allowed_tools: string;
  path: string;
  type: "skill" | "agent" | "hook" | "command" | "output_style" | "rule";
};

type CommandIndex = {
  generated_at?: string | null;
  summary?: Record<string, number>;
  skills?: IndexEntry[];
  agents?: IndexEntry[];
  hooks?: IndexEntry[];
  commands?: IndexEntry[];
  output_styles?: IndexEntry[];
  rules?: IndexEntry[];
  _empty?: boolean;
  _message?: string;
};

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "skill", label: "Skills" },
  { key: "agent", label: "Agents" },
  { key: "command", label: "Commands" },
  { key: "output_style", label: "Output styles" },
  { key: "hook", label: "Hooks" },
  { key: "rule", label: "Rules" },
] as const;

const ROUTE_FOR_TYPE: Record<IndexEntry["type"], string> = {
  skill: "/artifacts/skills",
  agent: "/artifacts/agents",
  hook: "/artifacts/hooks",
  command: "/artifacts/commands",
  output_style: "/artifacts/output-styles",
  rule: "/artifacts/rules",
};

export default function CommandsIndexPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTERS)[number]["key"]>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["command-index"],
    queryFn: async () => {
      const res = await fetch("/api/command-index");
      if (!res.ok) throw new Error("Failed to load index");
      return res.json() as Promise<CommandIndex>;
    },
  });

  const allEntries = useMemo<IndexEntry[]>(() => {
    if (!data) return [];
    return [
      ...(data.skills ?? []),
      ...(data.agents ?? []),
      ...(data.hooks ?? []),
      ...(data.commands ?? []),
      ...(data.output_styles ?? []),
      ...(data.rules ?? []),
    ];
  }, [data]);

  const filtered = useMemo(() => {
    let entries = allEntries;
    if (typeFilter !== "all") {
      entries = entries.filter((e) => e.type === typeFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.command.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q)
      );
    }
    return entries;
  }, [allEntries, typeFilter, query]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load command index.</AlertDescription>
      </Alert>
    );
  }

  if (data?._empty) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Slash Commands Index</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No index yet</AlertTitle>
          <AlertDescription>
            {data._message ?? "command-index.json doesn't exist yet."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slash Commands Index</h1>
        <p className="text-sm text-muted-foreground">
          Read-only catalog of every slash command available to Claude Code
          {data?.generated_at && ` · generated ${new Date(data.generated_at).toLocaleString()}`}
        </p>
      </div>

      {data?.summary && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(data.summary).map(([k, v]) => (
            <Card key={k} className="py-3">
              <CardContent className="py-1 px-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {k.replace(/_/g, " ")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, command, or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={typeFilter === f.key ? "default" : "outline"}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No entries match.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((entry) => {
            const route = ROUTE_FOR_TYPE[entry.type];
            return (
              <Card key={`${entry.type}-${entry.path}`} className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-mono truncate">
                      {entry.command}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">
                      {entry.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {entry.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  )}
                  {route && (
                    <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                      <Link
                        href={`${route}/${encodeURIComponent(entry.name)}`}
                        className="gap-1 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open in editor
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
