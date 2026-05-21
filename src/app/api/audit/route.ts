import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { AUDIT_LOG_FILE } from "@/lib/audit-log";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type AuditEntry = {
  timestamp: number;
  action: "write" | "delete" | "create";
  path: string;
  size?: number;
};

const DEMO_ENTRIES: AuditEntry[] = [
  { timestamp: Date.now() - 60_000, action: "write", path: "~/.claude/settings.json", size: 4200 },
  { timestamp: Date.now() - 300_000, action: "write", path: "~/.claude/skills/commit/SKILL.md", size: 1800 },
  { timestamp: Date.now() - 1_800_000, action: "delete", path: "~/.claude/rules/old-rule.md" },
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "200", 10), 1), 1000);
  const action = params.get("action");

  if (IS_DEMO_MODE) {
    return NextResponse.json({ entries: DEMO_ENTRIES, total: DEMO_ENTRIES.length });
  }

  try {
    const entries: AuditEntry[] = [];
    try {
      const stream = createReadStream(AUDIT_LOG_FILE, { encoding: "utf-8" });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line) as AuditEntry;
          if (action && e.action !== action) continue;
          entries.push(e);
        } catch {
          // skip malformed
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);
    return NextResponse.json({
      entries: entries.slice(0, limit),
      total: entries.length,
    });
  } catch (error) {
    console.error("Failed to read audit log:", error);
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 });
  }
}

export async function DELETE() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot clear in demo mode" }, { status: 403 });
  }
  try {
    await fs.unlink(AUDIT_LOG_FILE);
    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: true });
    }
    console.error("Failed to clear audit log:", err);
    return NextResponse.json({ error: "Failed to clear audit log" }, { status: 500 });
  }
}
