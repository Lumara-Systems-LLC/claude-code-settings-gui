import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { createBackup, formatBytes } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const COMMANDS_DIR = PATHS.COMMANDS_DIR;

type CommandListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
};

type CommandFile = {
  name: string;
  path: string;
  content: string;
};

const DEMO_COMMANDS: CommandListItem[] = [
  {
    name: "benchmark.md",
    path: "~/.claude/commands/benchmark.md",
    size: "1.2 KB",
    lastModified: new Date().toISOString(),
    description: "Quick performance comparison between code snippets",
  },
  {
    name: "explain.md",
    path: "~/.claude/commands/explain.md",
    size: "896 B",
    lastModified: new Date().toISOString(),
    description: "Explain code, architecture, or concepts in detail",
  },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (IS_DEMO_MODE) {
    if (filename) {
      const demo = DEMO_COMMANDS.find((c) => c.name === filename);
      if (!demo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({
        name: filename,
        path: demo.path,
        content: `# ${filename.replace(".md", "")}\n\nDemo command content.`,
      });
    }
    return NextResponse.json(DEMO_COMMANDS);
  }

  try {
    if (filename) {
      const filePath = join(COMMANDS_DIR, basename(filename));
      const content = await fs.readFile(filePath, "utf-8");
      const command: CommandFile = { name: filename, path: filePath, content };
      return NextResponse.json(command);
    }

    const entries = await fs.readdir(COMMANDS_DIR, { withFileTypes: true });
    const commands: CommandListItem[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = join(COMMANDS_DIR, entry.name);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      const firstHeading = content
        .split("\n")
        .find((l) => l.startsWith("#"))
        ?.replace(/^#+\s*/, "");
      commands.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
        description: firstHeading,
      });
    }
    commands.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(commands);
  } catch (error) {
    console.error("Failed to read commands:", error);
    return NextResponse.json({ error: "Failed to read commands" }, { status: 500 });
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
    const filePath = join(COMMANDS_DIR, basename(filename));
    try {
      await fs.access(filePath);
      await createBackup(filePath);
    } catch {
      // File doesn't exist
    }
    await fs.mkdir(COMMANDS_DIR, { recursive: true });
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to update command:", error);
    return NextResponse.json({ error: "Failed to update command" }, { status: 500 });
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
    const filePath = join(COMMANDS_DIR, basename(filename));
    try {
      await fs.access(filePath);
      return NextResponse.json({ error: "Command already exists" }, { status: 409 });
    } catch {
      // doesn't exist
    }
    await fs.mkdir(COMMANDS_DIR, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to create command:", error);
    return NextResponse.json({ error: "Failed to create command" }, { status: 500 });
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
    const filePath = join(COMMANDS_DIR, basename(filename));
    await fs.unlink(filePath);
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to delete command:", error);
    return NextResponse.json({ error: "Failed to delete command" }, { status: 500 });
  }
}
