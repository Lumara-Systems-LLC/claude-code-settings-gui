import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { createBackup, formatBytes } from "@/lib/file-utils";

const PROMPTS_DIR = join(homedir(), ".claude", "prompts");

interface PromptListItem {
  name: string;
  path: string;
  size: string;
  lastModified: string;
}

interface Prompt {
  name: string;
  path: string;
  content: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  try {
    if (filename) {
      // Get specific prompt
      const filePath = join(PROMPTS_DIR, filename);
      const content = await fs.readFile(filePath, "utf-8");

      const prompt: Prompt = {
        name: filename,
        path: filePath,
        content,
      };

      return NextResponse.json(prompt);
    }

    // List all prompts
    const entries = await fs.readdir(PROMPTS_DIR, { withFileTypes: true });
    const prompts: PromptListItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const filePath = join(PROMPTS_DIR, entry.name);
      const stats = await fs.stat(filePath);

      prompts.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
      });
    }

    // Sort alphabetically
    prompts.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("Failed to read prompts:", error);
    return NextResponse.json(
      { error: "Failed to read prompts" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }

    const filePath = join(PROMPTS_DIR, basename(filename));

    // Create backup
    try {
      await fs.access(filePath);
      await createBackup(filePath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Write atomically
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, filePath);

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to update prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
