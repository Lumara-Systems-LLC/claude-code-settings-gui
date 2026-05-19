import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type HistoryEntry = {
  display: string;
  timestamp: number;
  project?: string;
  sessionId?: string;
  pastedContents?: Record<string, unknown>;
};

const DEMO_HISTORY: HistoryEntry[] = [
  {
    display: "how do i add a new skill?",
    timestamp: Date.now() - 86_400_000,
    project: "/home/demo/my-project",
    sessionId: "demo-session-1",
  },
  {
    display: "explain the auth flow",
    timestamp: Date.now() - 172_800_000,
    project: "/home/demo/api-server",
    sessionId: "demo-session-2",
  },
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").toLowerCase();
  const project = params.get("project");
  const limitParam = parseInt(params.get("limit") ?? "100", 10);
  const limit = Math.min(Math.max(limitParam, 1), 500);

  if (IS_DEMO_MODE) {
    let entries = DEMO_HISTORY;
    if (query) entries = entries.filter((e) => e.display.toLowerCase().includes(query));
    return NextResponse.json({ entries, total: entries.length, projects: ["/home/demo/my-project", "/home/demo/api-server"] });
  }

  try {
    const matched: HistoryEntry[] = [];
    const projects = new Set<string>();
    let totalScanned = 0;

    const stream = createReadStream(PATHS.HISTORY_JSONL, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as HistoryEntry;
        totalScanned++;
        if (entry.project) projects.add(entry.project);
        if (project && entry.project !== project) continue;
        if (query && !entry.display.toLowerCase().includes(query)) continue;
        matched.push({
          display: entry.display,
          timestamp: entry.timestamp,
          project: entry.project,
          sessionId: entry.sessionId,
        });
      } catch {
        // skip malformed
      }
    }

    // Newest first, cap at limit
    matched.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      entries: matched.slice(0, limit),
      total: matched.length,
      totalScanned,
      projects: Array.from(projects).sort(),
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ entries: [], total: 0, totalScanned: 0, projects: [] });
    }
    console.error("Failed to read history:", error);
    return NextResponse.json({ error: "Failed to read history" }, { status: 500 });
  }
}
