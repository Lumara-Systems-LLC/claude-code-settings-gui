import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { formatBytes } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const PLANS_DIR = PATHS.PLANS_DIR;

type PlanListItem = {
  name: string;
  path: string;
  size: string;
  sizeBytes: number;
  lastModified: string;
  preview?: string;
};

type PlanFile = {
  name: string;
  path: string;
  content: string;
  size: number;
  lastModified: string;
};

const DEMO_PLANS: PlanListItem[] = [
  {
    name: "feature-add-onboarding.md",
    path: "~/.claude/plans/feature-add-onboarding.md",
    size: "3.2 KB",
    sizeBytes: 3200,
    lastModified: new Date(Date.now() - 86400_000).toISOString(),
    preview: "Plan: implement first-run onboarding flow",
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (IS_DEMO_MODE) {
    if (filename) {
      const demo = DEMO_PLANS.find((p) => p.name === filename);
      if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        name: filename,
        path: demo.path,
        content: `# Demo Plan\n\nThis is a sample plan body.`,
        size: 200,
        lastModified: demo.lastModified,
      });
    }
    return NextResponse.json(DEMO_PLANS);
  }

  try {
    if (filename) {
      const filePath = join(PLANS_DIR, basename(filename));
      const [content, stats] = await Promise.all([
        fs.readFile(filePath, "utf-8"),
        fs.stat(filePath),
      ]);
      const plan: PlanFile = {
        name: filename,
        path: filePath,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };
      return NextResponse.json(plan);
    }

    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(PLANS_DIR, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json([]);
      }
      throw err;
    }

    const items: PlanListItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = join(PLANS_DIR, entry.name);
      const stats = await fs.stat(filePath);
      // Read just the first line for preview (skip very large files)
      let preview: string | undefined;
      try {
        const handle = await fs.open(filePath, "r");
        const buf = Buffer.alloc(512);
        await handle.read(buf, 0, 512, 0);
        await handle.close();
        const head = buf.toString("utf-8");
        const firstHeading = head
          .split("\n")
          .find((l) => l.startsWith("#"))
          ?.replace(/^#+\s*/, "");
        preview = firstHeading;
      } catch {
        // ignore
      }
      items.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        sizeBytes: stats.size,
        lastModified: stats.mtime.toISOString(),
        preview,
      });
    }
    // Most recent first
    items.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to read plans:", error);
    return NextResponse.json({ error: "Failed to read plans" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { filename, olderThanDays, confirmed } = body;
    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    if (typeof olderThanDays === "number" && olderThanDays > 0) {
      // Bulk delete: anything older than N days
      const cutoff = Date.now() - olderThanDays * 86_400_000;
      const entries = await fs.readdir(PLANS_DIR, { withFileTypes: true });
      let deleted = 0;
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const filePath = join(PLANS_DIR, entry.name);
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          deleted++;
        }
      }
      return NextResponse.json({ success: true, deleted });
    }

    if (!filename) {
      return NextResponse.json(
        { error: "Filename or olderThanDays is required" },
        { status: 400 }
      );
    }
    const filePath = join(PLANS_DIR, basename(filename));
    await fs.unlink(filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
