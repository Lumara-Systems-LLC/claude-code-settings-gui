import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { validatePath, formatBytes } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type ProjectListItem = {
  id: string;
  path: string;
  memorySize: number;
  memorySizeHuman: string;
  lastModified: string;
  ageDays: number;
};

const DEMO_PROJECTS: ProjectListItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `demo${i.toString().padStart(2, "0")}b594e857043d3`,
  path: `~/.claude/projects/demo${i}`,
  memorySize: 1024 * (i + 1) * 8,
  memorySizeHuman: `${(i + 1) * 8} KB`,
  lastModified: new Date(Date.now() - i * 86_400_000 * 3).toISOString(),
  ageDays: i * 3,
}));

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id");

  if (IS_DEMO_MODE) {
    if (id) {
      const demo = DEMO_PROJECTS.find((p) => p.id === id);
      if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        ...demo,
        memory: JSON.stringify(
          { _demo: true, recentFiles: [], notes: [] },
          null,
          2
        ),
      });
    }
    return NextResponse.json(DEMO_PROJECTS);
  }

  try {
    if (id) {
      const dirPath = join(PATHS.PROJECTS_DIR, basename(id));
      if (!validatePath(dirPath)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const memoryPath = join(dirPath, "memory.json");
      let memory = "";
      let stat: import("fs").Stats | null = null;
      try {
        memory = await fs.readFile(memoryPath, "utf-8");
        stat = await fs.stat(memoryPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
      return NextResponse.json({
        id,
        path: dirPath,
        memorySize: stat?.size ?? 0,
        memorySizeHuman: formatBytes(stat?.size ?? 0),
        lastModified: stat?.mtime.toISOString() ?? "",
        ageDays: stat ? Math.floor((Date.now() - stat.mtime.getTime()) / 86_400_000) : 0,
        memory,
      });
    }

    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(PATHS.PROJECTS_DIR, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json([]);
      }
      throw err;
    }
    const projects: ProjectListItem[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = join(PATHS.PROJECTS_DIR, entry.name);
      const memoryPath = join(dirPath, "memory.json");
      try {
        const stat = await fs.stat(memoryPath);
        projects.push({
          id: entry.name,
          path: dirPath,
          memorySize: stat.size,
          memorySizeHuman: formatBytes(stat.size),
          lastModified: stat.mtime.toISOString(),
          ageDays: Math.floor((Date.now() - stat.mtime.getTime()) / 86_400_000),
        });
      } catch {
        // memory.json missing; still include dir
        try {
          const dStat = await fs.stat(dirPath);
          projects.push({
            id: entry.name,
            path: dirPath,
            memorySize: 0,
            memorySizeHuman: formatBytes(0),
            lastModified: dStat.mtime.toISOString(),
            ageDays: Math.floor((Date.now() - dStat.mtime.getTime()) / 86_400_000),
          });
        } catch {
          // skip
        }
      }
    }
    projects.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { id, olderThanDays, confirmed } = body;
    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    if (typeof olderThanDays === "number" && olderThanDays > 0) {
      const cutoff = Date.now() - olderThanDays * 86_400_000;
      const entries = await fs.readdir(PATHS.PROJECTS_DIR, { withFileTypes: true });
      let deleted = 0;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dirPath = join(PATHS.PROJECTS_DIR, entry.name);
        try {
          const stat = await fs.stat(dirPath);
          if (stat.mtime.getTime() < cutoff) {
            await fs.rm(dirPath, { recursive: true, force: true });
            deleted++;
          }
        } catch {
          // skip
        }
      }
      return NextResponse.json({ success: true, deleted });
    }

    if (!id) {
      return NextResponse.json(
        { error: "id or olderThanDays required" },
        { status: 400 }
      );
    }
    const dirPath = join(PATHS.PROJECTS_DIR, basename(id));
    if (!validatePath(dirPath)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await fs.rm(dirPath, { recursive: true, force: true });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
