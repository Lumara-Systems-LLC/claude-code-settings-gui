"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MessageSquare, Webhook, BarChart3, Cpu } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type DailyActivity = {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
};

type HookSummary = {
  name: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
};

type TokensByModel = Record<
  string,
  {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  }
>;

type UsageStats = {
  dailyActivity: DailyActivity[];
  totalMessages: number;
  totalSessions: number;
  totalToolCalls: number;
  tokensByModel: TokensByModel;
  topHooks: HookSummary[];
  hookExecutions: number;
  lastComputedDate?: string;
  hasData: boolean;
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function UsageStatsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usage-stats"],
    queryFn: async () => {
      const res = await fetch("/api/usage-stats");
      if (!res.ok) throw new Error("Failed to load usage stats");
      return res.json() as Promise<UsageStats>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load usage stats.</AlertDescription>
      </Alert>
    );
  }

  if (!data.hasData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Usage Stats</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No usage data yet</AlertTitle>
          <AlertDescription>
            Stats build up as you use Claude Code. They live in{" "}
            <code>~/.claude/stats-cache.json</code> and{" "}
            <code>~/.claude/hook-metrics.jsonl</code>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const recentDaily = data.dailyActivity.slice(-30);
  const tokenRows = Object.entries(data.tokensByModel)
    .map(([model, t]) => ({
      model,
      input: t.inputTokens ?? 0,
      output: t.outputTokens ?? 0,
      cacheRead: t.cacheReadTokens ?? 0,
      cacheCreate: t.cacheCreationTokens ?? 0,
      total:
        (t.inputTokens ?? 0) +
        (t.outputTokens ?? 0) +
        (t.cacheReadTokens ?? 0) +
        (t.cacheCreationTokens ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage Stats</h1>
        <p className="text-sm text-muted-foreground">
          Daily activity, token usage by model, and top hooks
          {data.lastComputedDate && ` · last computed ${data.lastComputedDate}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Messages"
          value={fmtNum(data.totalMessages)}
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Sessions"
          value={fmtNum(data.totalSessions)}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Tool calls"
          value={fmtNum(data.totalToolCalls)}
          icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Hook runs"
          value={fmtNum(data.hookExecutions)}
          icon={<Webhook className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily activity — last {recentDaily.length} days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="messageCount"
                  name="Messages"
                  stroke="#6366f1"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="toolCallCount"
                  name="Tool calls"
                  stroke="#f59e0b"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sessionCount"
                  name="Sessions"
                  stroke="#10b981"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tokens by model</CardTitle>
          </CardHeader>
          <CardContent>
            {tokenRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No token usage recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {tokenRows.map((r) => (
                  <div key={r.model} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <code className="text-xs">{r.model}</code>
                      <Badge variant="secondary">{fmtNum(r.total)}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <span>in {fmtNum(r.input)}</span>
                      <span>out {fmtNum(r.output)}</span>
                      <span>cache rd {fmtNum(r.cacheRead)}</span>
                      <span>cache wr {fmtNum(r.cacheCreate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top hooks by executions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topHooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hook executions logged yet.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topHooks.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={140}
                      tickFormatter={(s) => (s.length > 18 ? `${s.slice(0, 17)}…` : s)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="totalExecutions" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.topHooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hook performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topHooks.map((h) => {
                const successRate =
                  h.totalExecutions > 0
                    ? Math.round((h.successCount / h.totalExecutions) * 100)
                    : 0;
                return (
                  <div
                    key={h.name}
                    className="flex items-center gap-3 rounded-md border p-2"
                  >
                    <code className="text-xs flex-1 truncate">{h.name}</code>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {fmtNum(h.totalExecutions)} runs
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      avg {h.avgDurationMs}ms
                    </span>
                    <Badge
                      variant={
                        successRate >= 99
                          ? "secondary"
                          : successRate >= 90
                            ? "outline"
                            : "destructive"
                      }
                      className="tabular-nums"
                    >
                      {successRate}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
