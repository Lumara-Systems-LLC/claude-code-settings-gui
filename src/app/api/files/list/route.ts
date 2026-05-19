import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { validatePath, isSensitive, formatBytes } from "@/lib/file-utils";
import { CLAUDE_DIR } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

export type FileListEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  sizeHuman: string;
  lastModified: string;
  sensitive: boolean;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pathParam = searchParams.get("path") || CLAUDE_DIR;
  const includeHidden = searchParams.get("includeHidden") === "true";

  const resolved = pathParam.startsWith("/") ? pathParam : join(CLAUDE_DIR, pathParam);

  if (IS_DEMO_MODE) {
    return NextResponse.json({
      path: CLAUDE_DIR,
      entries: [
        {
          name: "CLAUDE.md",
          path: join(CLAUDE_DIR, "CLAUDE.md"),
          isDirectory: false,
          size: 2048,
          sizeHuman: "2.0 KB",
          lastModified: new Date().toISOString(),
          sensitive: false,
        },
        {
          name: "settings.json",
          path: join(CLAUDE_DIR, "settings.json"),
          isDirectory: false,
          size: 4096,
          sizeHuman: "4.0 KB",
          lastModified: new Date().toISOString(),
          sensitive: false,
        },
        {
          name: ".credentials.json",
          path: join(CLAUDE_DIR, ".credentials.json"),
          isDirectory: false,
          size: 512,
          sizeHuman: "512 B",
          lastModified: new Date().toISOString(),
          sensitive: true,
        },
      ],
    });
  }

  if (!validatePath(resolved)) {
    return NextResponse.json(
      { error: `Path must be within ${CLAUDE_DIR} directory` },
      { status: 403 }
    );
  }

  try {
    const dirEntries = await fs.readdir(resolved, { withFileTypes: true });
    const entries: FileListEntry[] = [];

    for (const entry of dirEntries) {
      if (!includeHidden && entry.name.startsWith(".") && !isSensitive(entry.name)) {
        // Hide dotfiles by default UNLESS they're sensitive (we want to surface those)
        continue;
      }
      const entryPath = join(resolved, entry.name);
      try {
        const stats = await fs.stat(entryPath);
        entries.push({
          name: entry.name,
          path: entryPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          sizeHuman: formatBytes(stats.size),
          lastModified: stats.mtime.toISOString(),
          sensitive: !entry.isDirectory() && isSensitive(entry.name),
        });
      } catch {
        // Skip entries we can't stat
      }
    }

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ path: resolved, entries });
  } catch (error) {
    console.error("Failed to list directory:", error);
    return NextResponse.json(
      { error: "Failed to list directory" },
      { status: 500 }
    );
  }
}
