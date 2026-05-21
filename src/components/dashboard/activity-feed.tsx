"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, FilePlus, ChevronRight } from "lucide-react";

type AuditEntry = {
  timestamp: number;
  action: "write" | "delete" | "create";
  path: string;
  size?: number;
};

type AuditResponse = {
  entries: AuditEntry[];
  total: number;
};

const actionIcon: Record<AuditEntry["action"], React.ReactNode> = {
  write: <Pencil className="h-3.5 w-3.5 text-blue-500" />,
  delete: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  create: <FilePlus className="h-3.5 w-3.5 text-emerald-500" />,
};

function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const { data, isLoading, isError } = useQuery<AuditResponse>({
    queryKey: ["audit-recent"],
    queryFn: async () => {
      const res = await fetch("/api/audit?limit=8");
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/insights/history">
            View all
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Unavailable</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent changes</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry, i) => (
              <li
                key={`${entry.timestamp}-${i}`}
                className="flex items-center gap-2 text-sm"
              >
                {actionIcon[entry.action]}
                <span className="flex-1 truncate font-mono text-xs" title={entry.path}>
                  {entry.path}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(entry.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
