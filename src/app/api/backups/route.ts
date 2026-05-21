import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, dirname, basename, relative } from "path";
import { validatePath, formatBytes } from "@/lib/file-utils";
import { CLAUDE_DIR } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

export type BackupEntry = {
  backupPath: string;
  backupName: string;
  originalPath: string;
  originalName: string;
  originalRelative: string;
  timestamp: number;
  sizeBytes: number;
  sizeHuman: string;
  age: string;
};

function timestampFromName(name: string): number | null {
  // Pattern: {filename}.backup.{ms}
  const match = name.match(/\.backup\.(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function originalNameFromBackup(name: string): string {
  // Strip `.backup.{ms}` from end
  return name.replace(/\.backup\.\d+$/, "");
}

function ageString(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours === 0) {
      const mins = Math.floor(diff / 60_000);
      return `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Recursively scan for .backup.{ts} files, ignoring noisy dirs
const SCAN_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "projects",
  "file-history",
  "session-env",
  "shell-snapshots",
  "cache",
  "plugins",
  "statsig",
  "todos",
  "debug",
  "downloads",
  "paste-cache",
]);

async function findBackups(dir: string): Promise<BackupEntry[]> {
  const out: BackupEntry[] = [];
  async function walk(d: string) {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        if (SCAN_IGNORE_DIRS.has(entry.name)) continue;
        await walk(p);
      } else if (entry.isFile() && /\.backup\.\d+$/.test(entry.name)) {
        const ts = timestampFromName(entry.name);
        if (ts === null) continue;
        try {
          const stat = await fs.stat(p);
          const originalName = originalNameFromBackup(entry.name);
          const originalPath = join(dirname(p), originalName);
          out.push({
            backupPath: p,
            backupName: entry.name,
            originalPath,
            originalName,
            originalRelative: relative(CLAUDE_DIR, originalPath),
            timestamp: ts,
            sizeBytes: stat.size,
            sizeHuman: formatBytes(stat.size),
            age: ageString(ts),
          });
        } catch {
          // skip
        }
      }
    }
  }
  await walk(dir);
  out.sort((a, b) => b.timestamp - a.timestamp);
  return out;
}

const DEMO_BACKUPS: BackupEntry[] = [
  {
    backupPath: `${CLAUDE_DIR}/settings.json.backup.1779038029654`,
    backupName: "settings.json.backup.1779038029654",
    originalPath: `${CLAUDE_DIR}/settings.json`,
    originalName: "settings.json",
    originalRelative: "settings.json",
    timestamp: 1779038029654,
    sizeBytes: 3200,
    sizeHuman: "3.2 KB",
    age: "today",
  },
];

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_BACKUPS);
  }
  try {
    const backups = await findBackups(CLAUDE_DIR);
    return NextResponse.json(backups);
  } catch (error) {
    console.error("Failed to list backups:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot restore in demo mode" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { backupPath } = body;
    if (!backupPath) {
      return NextResponse.json({ error: "backupPath required" }, { status: 400 });
    }
    if (!validatePath(backupPath)) {
      return NextResponse.json(
        { error: `Path must be within ${CLAUDE_DIR}` },
        { status: 403 }
      );
    }
    const name = basename(backupPath);
    if (!/\.backup\.\d+$/.test(name)) {
      return NextResponse.json(
        { error: "Path is not a recognized backup file" },
        { status: 400 }
      );
    }
    const originalName = originalNameFromBackup(name);
    const originalPath = join(dirname(backupPath), originalName);

    // Before overwriting current file, back it up
    try {
      await fs.access(originalPath);
      const safetyBackup = `${originalPath}.backup.${Date.now()}`;
      await fs.copyFile(originalPath, safetyBackup);
    } catch {
      // original doesn't exist, no safety backup needed
    }

    // Copy backup over original
    await fs.copyFile(backupPath, originalPath);
    return NextResponse.json({ success: true, restored: originalPath });
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { backupPath, olderThanDays, confirmed } = body;
    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    if (typeof olderThanDays === "number" && olderThanDays > 0) {
      const cutoff = Date.now() - olderThanDays * 86_400_000;
      const backups = await findBackups(CLAUDE_DIR);
      let deleted = 0;
      for (const b of backups) {
        if (b.timestamp < cutoff) {
          try {
            await fs.unlink(b.backupPath);
            deleted++;
          } catch {
            // skip
          }
        }
      }
      return NextResponse.json({ success: true, deleted });
    }

    if (!backupPath) {
      return NextResponse.json(
        { error: "backupPath or olderThanDays required" },
        { status: 400 }
      );
    }
    if (!validatePath(backupPath)) {
      return NextResponse.json(
        { error: `Path must be within ${CLAUDE_DIR}` },
        { status: 403 }
      );
    }
    await fs.unlink(backupPath);
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("Failed to delete backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}
