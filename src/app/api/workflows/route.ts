import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { createBackup, formatBytes } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const WORKFLOWS_DIR = PATHS.WORKFLOWS_DIR;

type WorkflowListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
  stepCount?: number;
};

type WorkflowFile = {
  name: string;
  path: string;
  content: string;
};

const DEMO_WORKFLOWS: WorkflowListItem[] = [
  {
    name: "feature.md",
    path: "~/.claude/workflows/feature.md",
    size: "1.1 KB",
    lastModified: new Date().toISOString(),
    description: "Feature development workflow",
    stepCount: 5,
  },
  {
    name: "bugfix.md",
    path: "~/.claude/workflows/bugfix.md",
    size: "1.3 KB",
    lastModified: new Date().toISOString(),
    description: "Bug fix workflow",
    stepCount: 4,
  },
];

function countSteps(markdown: string): number {
  // Steps are typically ### N. or ## N. headings
  const matches = markdown.match(/^#{2,3}\s+\d+\./gm);
  return matches?.length ?? 0;
}

function firstHeading(markdown: string): string | undefined {
  return markdown
    .split("\n")
    .find((l) => l.startsWith("#"))
    ?.replace(/^#+\s*/, "");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (IS_DEMO_MODE) {
    if (filename) {
      const demo = DEMO_WORKFLOWS.find((w) => w.name === filename);
      if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        name: filename,
        path: demo.path,
        content: `# ${filename.replace(".md", "")}\n\nDemo workflow.\n\n## 1. First step\n\n## 2. Second step\n`,
      });
    }
    return NextResponse.json(DEMO_WORKFLOWS);
  }

  try {
    if (filename) {
      const filePath = join(WORKFLOWS_DIR, basename(filename));
      const content = await fs.readFile(filePath, "utf-8");
      const wf: WorkflowFile = { name: filename, path: filePath, content };
      return NextResponse.json(wf);
    }

    const entries = await fs.readdir(WORKFLOWS_DIR, { withFileTypes: true });
    const workflows: WorkflowListItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (entry.name.toLowerCase() === "readme.md") continue;
      const filePath = join(WORKFLOWS_DIR, entry.name);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      workflows.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
        description: firstHeading(content),
        stepCount: countSteps(content),
      });
    }
    workflows.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Failed to read workflows:", error);
    return NextResponse.json(
      { error: "Failed to read workflows" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot save in demo mode" }, { status: 403 });
  }
  try {
    const { filename, content } = await request.json();
    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }
    const filePath = join(WORKFLOWS_DIR, basename(filename));
    try {
      await fs.access(filePath);
      await createBackup(filePath);
    } catch {
      // doesn't exist
    }
    await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot create in demo mode" }, { status: 403 });
  }
  try {
    const { filename, content } = await request.json();
    if (!filename || !content) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }
    const filePath = join(WORKFLOWS_DIR, basename(filename));
    try {
      await fs.access(filePath);
      return NextResponse.json({ error: "Workflow already exists" }, { status: 409 });
    } catch {
      // doesn't exist
    }
    await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }
  try {
    const { filename, confirmed } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }
    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }
    const filePath = join(WORKFLOWS_DIR, basename(filename));
    await fs.unlink(filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
