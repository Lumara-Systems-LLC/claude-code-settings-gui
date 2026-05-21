import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { createBackup, formatBytes } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const OUTPUT_STYLES_DIR = PATHS.OUTPUT_STYLES_DIR;

type StyleListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
};

type StyleFile = {
  name: string;
  path: string;
  content: string;
};

const DEMO_STYLES: StyleListItem[] = [
  {
    name: "teaching.md",
    path: "~/.claude/output-styles/teaching.md",
    size: "1.3 KB",
    lastModified: new Date().toISOString(),
    description: "Teaching mode",
  },
  {
    name: "executive.md",
    path: "~/.claude/output-styles/executive.md",
    size: "916 B",
    lastModified: new Date().toISOString(),
    description: "Executive summary mode",
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (IS_DEMO_MODE) {
    if (filename) {
      const demo = DEMO_STYLES.find((s) => s.name === filename);
      if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        name: filename,
        path: demo.path,
        content: `# ${filename.replace(".md", "")}\n\nDemo output style.`,
      });
    }
    return NextResponse.json(DEMO_STYLES);
  }

  try {
    if (filename) {
      const filePath = join(OUTPUT_STYLES_DIR, basename(filename));
      const content = await fs.readFile(filePath, "utf-8");
      const style: StyleFile = { name: filename, path: filePath, content };
      return NextResponse.json(style);
    }

    const entries = await fs.readdir(OUTPUT_STYLES_DIR, { withFileTypes: true });
    const styles: StyleListItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = join(OUTPUT_STYLES_DIR, entry.name);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      const firstHeading = content
        .split("\n")
        .find((l) => l.startsWith("#"))
        ?.replace(/^#+\s*/, "");
      styles.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
        description: firstHeading,
      });
    }
    styles.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(styles);
  } catch (error) {
    console.error("Failed to read output styles:", error);
    return NextResponse.json(
      { error: "Failed to read output styles" },
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
    const filePath = join(OUTPUT_STYLES_DIR, basename(filename));
    try {
      await fs.access(filePath);
      await createBackup(filePath);
    } catch {
      // File doesn't exist
    }
    await fs.mkdir(OUTPUT_STYLES_DIR, { recursive: true });
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to update output style:", error);
    return NextResponse.json(
      { error: "Failed to update output style" },
      { status: 500 }
    );
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
    const filePath = join(OUTPUT_STYLES_DIR, basename(filename));
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: "Output style already exists" },
        { status: 409 }
      );
    } catch {
      // doesn't exist
    }
    await fs.mkdir(OUTPUT_STYLES_DIR, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to create output style:", error);
    return NextResponse.json(
      { error: "Failed to create output style" },
      { status: 500 }
    );
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
    const filePath = join(OUTPUT_STYLES_DIR, basename(filename));
    await fs.unlink(filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to delete output style:", error);
    return NextResponse.json(
      { error: "Failed to delete output style" },
      { status: 500 }
    );
  }
}
