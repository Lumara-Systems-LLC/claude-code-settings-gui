"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, Info } from "lucide-react";

type AuthEntry = {
  server: string;
  id: string;
  timestamp: number;
  isoTimestamp: string;
  ageDays: number;
};

const STALE_AFTER_DAYS = 30;

export function MCPAuthStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mcp-auth"],
    queryFn: async () => {
      const res = await fetch("/api/mcp-auth");
      if (!res.ok) throw new Error("Failed to load MCP auth state");
      return res.json() as Promise<AuthEntry[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load MCP auth status.</AlertDescription>
      </Alert>
    );
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No OAuth-authenticated MCP servers</AlertTitle>
        <AlertDescription>
          When you connect MCP servers that use OAuth (Google, Atlassian, etc), their auth
          state is cached at <code>~/.claude/mcp-needs-auth-cache.json</code> and shown here.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Entries older than {STALE_AFTER_DAYS} days are flagged as stale. Re-authenticate via
          Claude Code itself (<code>/mcp</code>) — the GUI can&apos;t initiate OAuth flows.
        </AlertDescription>
      </Alert>

      {entries.map((e) => {
        const isStale = e.ageDays >= STALE_AFTER_DAYS;
        return (
          <Card
            key={e.id}
            className={isStale ? "border-orange-500/50 bg-orange-500/5" : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  {e.server}
                </span>
                {isStale ? (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    re-auth recommended
                  </Badge>
                ) : (
                  <Badge variant="secondary">authenticated</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <div>
                Server ID: <code className="font-mono">{e.id}</code>
              </div>
              <div>
                Last auth: {new Date(e.timestamp).toLocaleString()} ({e.ageDays}d ago)
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
