import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type DailyActivity = {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
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

type StatsCache = {
  version?: number;
  lastComputedDate?: string;
  dailyActivity?: DailyActivity[];
  tokensByModel?: TokensByModel;
};

type HookMetric = {
  hook: string;
  duration_ms: number;
  exit_code: number;
  result: "success" | "failure";
};

type HookSummary = {
  name: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
};

type UsageStatsResponse = {
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

const DEMO_RESPONSE: UsageStatsResponse = {
  dailyActivity: Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().slice(0, 10),
      messageCount: Math.floor(Math.random() * 3000) + 500,
      sessionCount: Math.floor(Math.random() * 15) + 1,
      toolCallCount: Math.floor(Math.random() * 500) + 50,
    };
  }),
  totalMessages: 45000,
  totalSessions: 380,
  totalToolCalls: 12000,
  tokensByModel: {
    "claude-opus-4-5": { inputTokens: 250000, outputTokens: 75000 },
    "claude-sonnet-4-5": { inputTokens: 1500000, outputTokens: 450000 },
  },
  topHooks: [
    { name: "session-start-parallel.sh", totalExecutions: 412, successCount: 412, failureCount: 0, avgDurationMs: 124 },
    { name: "auto-format.sh", totalExecutions: 2840, successCount: 2832, failureCount: 8, avgDurationMs: 45 },
    { name: "skill-metrics.sh", totalExecutions: 1205, successCount: 1205, failureCount: 0, avgDurationMs: 12 },
  ],
  hookExecutions: 8200,
  lastComputedDate: new Date().toISOString().slice(0, 10),
  hasData: true,
};

async function readStatsCache(): Promise<StatsCache> {
  try {
    const content = await fs.readFile(PATHS.STATS_CACHE, "utf-8");
    return JSON.parse(content) as StatsCache;
  } catch {
    return {};
  }
}

async function aggregateHooks(): Promise<{
  topHooks: HookSummary[];
  totalExecutions: number;
}> {
  const counts = new Map<
    string,
    { count: number; success: number; failure: number; totalDuration: number }
  >();
  let totalExecutions = 0;

  try {
    const stream = createReadStream(PATHS.HOOK_METRICS, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line) as HookMetric;
        totalExecutions++;
        const existing = counts.get(m.hook) ?? {
          count: 0,
          success: 0,
          failure: 0,
          totalDuration: 0,
        };
        existing.count++;
        existing.totalDuration += m.duration_ms || 0;
        if (m.result === "success") existing.success++;
        else existing.failure++;
        counts.set(m.hook, existing);
      } catch {
        // skip malformed line
      }
    }
  } catch {
    // file doesn't exist
  }

  const summaries: HookSummary[] = Array.from(counts.entries()).map(
    ([name, c]) => ({
      name,
      totalExecutions: c.count,
      successCount: c.success,
      failureCount: c.failure,
      avgDurationMs: c.count > 0 ? Math.round(c.totalDuration / c.count) : 0,
    })
  );
  summaries.sort((a, b) => b.totalExecutions - a.totalExecutions);

  return { topHooks: summaries.slice(0, 10), totalExecutions };
}

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_RESPONSE);
  }

  try {
    const [stats, hookData] = await Promise.all([
      readStatsCache(),
      aggregateHooks(),
    ]);

    const daily = (stats.dailyActivity ?? []).slice(-60);
    const totalMessages = daily.reduce((s, d) => s + (d.messageCount || 0), 0);
    const totalSessions = daily.reduce((s, d) => s + (d.sessionCount || 0), 0);
    const totalToolCalls = daily.reduce((s, d) => s + (d.toolCallCount || 0), 0);

    const response: UsageStatsResponse = {
      dailyActivity: daily,
      totalMessages,
      totalSessions,
      totalToolCalls,
      tokensByModel: stats.tokensByModel ?? {},
      topHooks: hookData.topHooks,
      hookExecutions: hookData.totalExecutions,
      lastComputedDate: stats.lastComputedDate,
      hasData: daily.length > 0 || hookData.totalExecutions > 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to compute usage stats:", error);
    return NextResponse.json(
      { error: "Failed to compute usage stats" },
      { status: 500 }
    );
  }
}
