import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { validatePath, getDirectorySize, formatBytes } from "@/lib/file-utils";
import { CLAUDE_DIR } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

// Only these subdirectories are clearable from this endpoint.
// All entries inside are safe to delete (cache/state, not user content).
const CLEARABLE_DIRS = [
  "cache",
  "paste-cache",
  "statsig",
  "session-env",
  "shell-snapshots",
  "debug",
] as const;

export type CleanableDir = {
  name: string;
  path: string;
  sizeBytes: number;
  sizeHuman: string;
  itemCount: number;
  exists: boolean;
};

export async function GET() {
  const result: CleanableDir[] = [];
  for (const name of CLEARABLE_DIRS) {
    const path = join(CLAUDE_DIR, name);
    try {
      const info = await getDirectorySize(path);
      result.push({
        name,
        path,
        sizeBytes: info.sizeBytes,
        sizeHuman: info.sizeHuman,
        itemCount: info.itemCount,
        exists: true,
      });
    } catch {
      result.push({
        name,
        path,
        sizeBytes: 0,
        sizeHuman: formatBytes(0),
        itemCount: 0,
        exists: false,
      });
    }
  }
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot clear caches in demo mode" },
      { status: 403 }
    );
  }
  try {
    const body = await request.json();
    const { dirName, confirmed } = body;

    if (!confirmed) {
      return NextResponse.json(
        { error: "Clear must be confirmed" },
        { status: 400 }
      );
    }
    if (!dirName) {
      return NextResponse.json({ error: "dirName required" }, { status: 400 });
    }

    // Resolve and double-check it's an allowed cache dir
    const requested = basename(dirName);
    if (!CLEARABLE_DIRS.includes(requested as (typeof CLEARABLE_DIRS)[number])) {
      return NextResponse.json(
        {
          error: `Directory ${requested} is not in the clearable set. Allowed: ${CLEARABLE_DIRS.join(", ")}`,
        },
        { status: 403 }
      );
    }

    const target = join(CLAUDE_DIR, requested);
    if (!validatePath(target)) {
      return NextResponse.json(
        { error: `Path must be within ${CLAUDE_DIR}` },
        { status: 403 }
      );
    }

    // Get size before clearing for reporting
    let cleared = { sizeBytes: 0, itemCount: 0 };
    try {
      cleared = await getDirectorySize(target);
    } catch {
      // dir doesn't exist
    }

    // Clear contents but keep the directory itself
    try {
      const entries = await fs.readdir(target, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = join(target, entry.name);
        await fs.rm(entryPath, { recursive: true, force: true });
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      cleared: {
        sizeBytes: cleared.sizeBytes,
        sizeHuman: formatBytes(cleared.sizeBytes),
        itemCount: cleared.itemCount,
      },
    });
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 });
  }
}
