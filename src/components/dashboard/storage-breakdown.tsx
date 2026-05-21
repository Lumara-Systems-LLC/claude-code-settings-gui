"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import type { StorageStats } from "@/types/storage";
import { InfoTip } from "@/components/ui/info-tip";
import { helpContent } from "@/lib/help-content";

export function StorageBreakdown() {
  const { data, isLoading, isError } = useQuery<StorageStats>({
    queryKey: ["storage"],
    queryFn: async () => {
      const res = await fetch("/api/storage");
      if (!res.ok) throw new Error("Failed to fetch storage");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const topDirs = (data?.directories ?? []).slice(0, 5);
  const maxBytes = topDirs[0]?.sizeBytes ?? 0;

  return (
    <Card data-tour-step="storage-overview">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Storage Breakdown
          <InfoTip
            content={helpContent.dashboard.storage.description}
            side="right"
          />
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/data/storage">
            View all
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground">Unavailable</p>
        ) : topDirs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No directories tracked</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Top 5 directories</span>
              <span>Total: {data.totalSize}</span>
            </div>
            {topDirs.map((dir) => {
              const pct = maxBytes > 0 ? (dir.sizeBytes / maxBytes) * 100 : 0;
              return (
                <div key={dir.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium" title={dir.name}>
                      {dir.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {dir.sizeHuman}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
