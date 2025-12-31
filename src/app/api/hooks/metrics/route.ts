import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { HookMetric, HookMetricsSummary } from "@/types/hook";

const METRICS_PATH = join(homedir(), ".claude", "hook-metrics.jsonl");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hookFilter = searchParams.get("hook");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  try {
    let content: string;
    try {
      content = await fs.readFile(METRICS_PATH, "utf-8");
    } catch {
      // File doesn't exist
      return NextResponse.json({ metrics: [], summaries: [] });
    }

    const lines = content.trim().split("\n").filter(Boolean);
    let metrics: HookMetric[] = [];

    for (const line of lines) {
      try {
        const metric = JSON.parse(line) as HookMetric;
        if (!hookFilter || metric.hook === hookFilter) {
          metrics.push(metric);
        }
      } catch {
        // Skip invalid lines
      }
    }

    // Sort by timestamp descending
    metrics.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit
    if (limit > 0) {
      metrics = metrics.slice(0, limit);
    }

    // Calculate summaries
    const summaryMap = new Map<string, HookMetric[]>();
    for (const metric of metrics) {
      const existing = summaryMap.get(metric.hook) || [];
      existing.push(metric);
      summaryMap.set(metric.hook, existing);
    }

    const summaries: HookMetricsSummary[] = [];
    for (const [hookName, hookMetrics] of summaryMap) {
      const successCount = hookMetrics.filter((m) => m.result === "success").length;
      const failureCount = hookMetrics.filter((m) => m.result === "failure").length;
      const durations = hookMetrics.map((m) => m.duration_ms);

      summaries.push({
        hookName,
        totalExecutions: hookMetrics.length,
        successCount,
        failureCount,
        avgDurationMs: Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        ),
        maxDurationMs: Math.max(...durations),
        minDurationMs: Math.min(...durations),
        lastExecution: hookMetrics[0]?.timestamp || "",
      });
    }

    // Sort summaries by total executions
    summaries.sort((a, b) => b.totalExecutions - a.totalExecutions);

    return NextResponse.json({ metrics, summaries });
  } catch (error) {
    console.error("Failed to read hook metrics:", error);
    return NextResponse.json(
      { error: "Failed to read hook metrics" },
      { status: 500 }
    );
  }
}
