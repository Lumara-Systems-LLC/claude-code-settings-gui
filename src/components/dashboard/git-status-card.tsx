"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch } from "lucide-react";
import type { GitStatus } from "@/types/storage";

export function GitStatusCard() {
  const { data, isLoading, isError } = useQuery<GitStatus>({
    queryKey: ["git-status"],
    queryFn: async () => {
      const res = await fetch("/api/git");
      if (!res.ok) throw new Error("Failed to fetch git status");
      return res.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  return (
    <Link href="/integrations/git">
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Git Status</CardTitle>
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">Unavailable</p>
          ) : (
            <div className="space-y-2">
              <p className="truncate text-sm font-medium" title={data.branch}>
                {data.branch || "(detached)"}
              </p>
              {data.isClean ? (
                <p className="text-xs text-muted-foreground">Clean</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {data.staged.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.staged.length} staged
                    </Badge>
                  )}
                  {data.modified.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.modified.length} modified
                    </Badge>
                  )}
                  {data.untracked.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {data.untracked.length} untracked
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
