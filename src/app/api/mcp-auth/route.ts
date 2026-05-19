import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type AuthEntry = {
  server: string;
  id: string;
  timestamp: number;
  isoTimestamp: string;
  ageDays: number;
};

type CacheFile = Record<string, { timestamp: number; id: string }>;

const DEMO_ENTRIES: AuthEntry[] = [
  {
    server: "claude.ai Google Calendar",
    id: "mcpsrv_demo_calendar",
    timestamp: Date.now(),
    isoTimestamp: new Date().toISOString(),
    ageDays: 0,
  },
  {
    server: "claude.ai Gmail",
    id: "mcpsrv_demo_gmail",
    timestamp: Date.now() - 86_400_000 * 14,
    isoTimestamp: new Date(Date.now() - 86_400_000 * 14).toISOString(),
    ageDays: 14,
  },
];

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_ENTRIES);
  }
  try {
    const content = await fs.readFile(PATHS.MCP_NEEDS_AUTH, "utf-8");
    const parsed = JSON.parse(content) as CacheFile;
    const now = Date.now();
    const entries: AuthEntry[] = Object.entries(parsed).map(([server, info]) => ({
      server,
      id: info.id,
      timestamp: info.timestamp,
      isoTimestamp: new Date(info.timestamp).toISOString(),
      ageDays: Math.floor((now - info.timestamp) / 86_400_000),
    }));
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return NextResponse.json(entries);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json([]);
    }
    console.error("Failed to read MCP auth cache:", error);
    return NextResponse.json(
      { error: "Failed to read MCP auth cache" },
      { status: 500 }
    );
  }
}
