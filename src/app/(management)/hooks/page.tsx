"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Webhook, BarChart } from "lucide-react";
import Link from "next/link";
import type { HookListItem, HookMetricsSummary } from "@/types/hook";
import { CreateHookDialog } from "@/components/create-hook-dialog";

export default function HooksPage() {
  const { data: hooks, isLoading: hooksLoading, error: hooksError } = useQuery({
    queryKey: ["hooks"],
    queryFn: async () => {
      const response = await fetch("/api/hooks");
      if (!response.ok) throw new Error("Failed to load hooks");
      return response.json() as Promise<HookListItem[]>;
    },
  });

  const { data: metricsData } = useQuery({
    queryKey: ["hook-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/hooks/metrics");
      if (!response.ok) throw new Error("Failed to load metrics");
      return response.json() as Promise<{
        metrics: unknown[];
        summaries: HookMetricsSummary[];
      }>;
    },
  });

  const summaries = metricsData?.summaries || [];

  const getHookMetrics = (hookName: string) => {
    return summaries.find((s) => s.hookName.includes(hookName));
  };

  if (hooksLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (hooksError) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load hooks. Make sure the directory exists at ~/.claude/hooks/
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hooks</h1>
            <p className="text-sm text-muted-foreground">
              Shell scripts triggered on specific events
            </p>
          </div>
          <div className="flex gap-2">
            <CreateHookDialog />
            <Button variant="outline" asChild>
              <Link href="/hooks/metrics">
                <BarChart className="mr-2 h-4 w-4" />
                View Metrics
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hook Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Avg Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks?.map((hook) => {
                  const metrics = getHookMetrics(hook.name);
                  const successRate = metrics
                    ? Math.round(
                        (metrics.successCount / metrics.totalExecutions) * 100
                      )
                    : null;

                  return (
                    <TableRow key={hook.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{hook.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{hook.size}</TableCell>
                      <TableCell>
                        {new Date(hook.lastModified).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {metrics?.totalExecutions ?? "-"}
                      </TableCell>
                      <TableCell>
                        {successRate !== null ? (
                          <Badge
                            variant={
                              successRate >= 90
                                ? "default"
                                : successRate >= 70
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {successRate}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {metrics ? `${metrics.avgDurationMs}ms` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
