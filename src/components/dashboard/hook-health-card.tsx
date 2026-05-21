"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HookMetricsSummary } from "@/types/hook";

type MetricsResponse = {
  metrics: unknown[];
  summaries: HookMetricsSummary[];
};

export function HookHealthCard() {
  const { data, isLoading, isError } = useQuery<MetricsResponse>({
    queryKey: ["hook-metrics", 50],
    queryFn: async () => {
      const res = await fetch("/api/hooks/metrics?limit=50");
      if (!res.ok) throw new Error("Failed to fetch hook metrics");
      return res.json();
    },
    staleTime: 60_000,
  });

  const summaries = data?.summaries ?? [];
  const totalFailures = summaries.reduce((acc, s) => acc + s.failureCount, 0);
  const slowest = summaries.reduce<HookMetricsSummary | null>(
    (worst, s) => (worst === null || s.avgDurationMs > worst.avgDurationMs ? s : worst),
    null
  );
  const hasData = summaries.length > 0;
  const health = totalFailures === 0 ? "green" : totalFailures < 5 ? "yellow" : "red";

  return (
    <Link href="/insights/hooks">
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hook Health</CardTitle>
          <Webhook className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Unavailable</p>
          ) : !hasData ? (
            <p className="text-sm text-muted-foreground">No recent executions</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    health === "green" && "bg-emerald-500",
                    health === "yellow" && "bg-amber-500",
                    health === "red" && "bg-red-500"
                  )}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">
                  {totalFailures === 0
                    ? "All hooks succeeding"
                    : `${totalFailures} failure${totalFailures === 1 ? "" : "s"}`}
                </span>
              </div>
              {slowest && (
                <p className="truncate text-xs text-muted-foreground" title={slowest.hookName}>
                  Slowest: {slowest.hookName} ({slowest.avgDurationMs}ms avg)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
