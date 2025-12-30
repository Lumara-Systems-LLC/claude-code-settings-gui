"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { HookMetricsSummary } from "@/types/hook";

const COLORS = ["#10b981", "#ef4444"];

export default function HookMetricsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["hook-metrics-full"],
    queryFn: async () => {
      const response = await fetch("/api/hooks/metrics?limit=500");
      if (!response.ok) throw new Error("Failed to load metrics");
      return response.json() as Promise<{
        metrics: unknown[];
        summaries: HookMetricsSummary[];
      }>;
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load hook metrics
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const summaries = data?.summaries || [];

  // Calculate totals for pie chart
  const totalSuccess = summaries.reduce((acc, s) => acc + s.successCount, 0);
  const totalFailure = summaries.reduce((acc, s) => acc + s.failureCount, 0);
  const pieData = [
    { name: "Success", value: totalSuccess },
    { name: "Failure", value: totalFailure },
  ];

  // Top hooks by execution count
  const topHooks = [...summaries]
    .sort((a, b) => b.totalExecutions - a.totalExecutions)
    .slice(0, 10)
    .map((s) => ({
      name: s.hookName.replace(".sh", "").slice(0, 20),
      executions: s.totalExecutions,
      avgDuration: s.avgDurationMs,
    }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Hook Metrics</h1>
            <p className="text-sm text-muted-foreground">
              Performance and execution statistics for hooks
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSuccess + totalFailure}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {totalSuccess}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {totalFailure}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalSuccess + totalFailure > 0
                  ? Math.round(
                      (totalSuccess / (totalSuccess + totalFailure)) * 100
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Success vs Failure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Hooks by Execution Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topHooks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar dataKey="executions" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hook Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summaries.map((summary) => (
                <div
                  key={summary.hookName}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">{summary.hookName}</div>
                    <div className="text-sm text-muted-foreground">
                      {summary.totalExecutions} executions
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Success: </span>
                      <span className="text-green-500">
                        {summary.successCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed: </span>
                      <span className="text-red-500">
                        {summary.failureCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg: </span>
                      {summary.avgDurationMs}ms
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max: </span>
                      {summary.maxDurationMs}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
