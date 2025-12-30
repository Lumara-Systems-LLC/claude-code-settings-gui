import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getDirectorySize, formatBytes } from "@/lib/file-utils";
import type { DirectorySize, StorageStats } from "@/types/storage";
import { IS_DEMO_MODE, DEMO_STORAGE } from "@/lib/demo-data";

const CLAUDE_DIR = join(homedir(), ".claude");

// Directories that contain ephemeral data
const EPHEMERAL_DIRS = [
  "projects",
  "shell-snapshots",
  "file-history",
  "todos",
  "session-env",
  "debug",
  "cache",
  "downloads",
  "statsig",
  "ide",
];

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_STORAGE);
  }

  try {
    const entries = await fs.readdir(CLAUDE_DIR, { withFileTypes: true });
    const directories: DirectorySize[] = [];
    const ephemeralDirectories: DirectorySize[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue; // Skip hidden dirs

      const dirPath = join(CLAUDE_DIR, entry.name);
      const sizeInfo = await getDirectorySize(dirPath);

      const dirInfo: DirectorySize = {
        name: entry.name,
        path: dirPath,
        sizeBytes: sizeInfo.sizeBytes,
        sizeHuman: sizeInfo.sizeHuman,
        itemCount: sizeInfo.itemCount,
      };

      if (EPHEMERAL_DIRS.includes(entry.name)) {
        ephemeralDirectories.push(dirInfo);
      } else {
        directories.push(dirInfo);
      }
    }

    // Sort by size descending
    directories.sort((a, b) => b.sizeBytes - a.sizeBytes);
    ephemeralDirectories.sort((a, b) => b.sizeBytes - a.sizeBytes);

    // Calculate total size
    const totalBytes =
      directories.reduce((acc, d) => acc + d.sizeBytes, 0) +
      ephemeralDirectories.reduce((acc, d) => acc + d.sizeBytes, 0);

    const stats: StorageStats = {
      totalSize: formatBytes(totalBytes),
      totalBytes,
      directories,
      ephemeralDirectories,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to get storage stats:", error);
    return NextResponse.json(
      { error: "Failed to get storage stats" },
      { status: 500 }
    );
  }
}
