import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { createBackup, formatBytes } from "@/lib/file-utils";
import { BUILT_IN_TEMPLATES, TEMPLATE_CATEGORIES, searchTemplates, getTemplatesByCategory } from "@/lib/templates";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const TEMPLATES_DIR = join(homedir(), ".claude", "templates");

interface TemplateListItem {
  name: string;
  path: string;
  size: string;
  lastModified: string;
}

interface Template {
  name: string;
  path: string;
  content: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");
  const mode = searchParams.get("mode");
  const category = searchParams.get("category");
  const query = searchParams.get("q");

  // Gallery mode - return built-in templates
  if (mode === "gallery" || IS_DEMO_MODE) {
    let templates = BUILT_IN_TEMPLATES;

    if (query) {
      templates = searchTemplates(query);
    } else if (category) {
      templates = getTemplatesByCategory(category);
    }

    return NextResponse.json({
      templates,
      categories: TEMPLATE_CATEGORIES,
      total: templates.length,
    });
  }

  try {
    if (filename) {
      // Get specific template
      const filePath = join(TEMPLATES_DIR, filename);
      const content = await fs.readFile(filePath, "utf-8");

      const template: Template = {
        name: filename,
        path: filePath,
        content,
      };

      return NextResponse.json(template);
    }

    // List all templates
    const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
    const templates: TemplateListItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const filePath = join(TEMPLATES_DIR, entry.name);
      const stats = await fs.stat(filePath);

      templates.push({
        name: entry.name,
        path: filePath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
      });
    }

    // Sort alphabetically
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to read templates:", error);
    return NextResponse.json(
      { error: "Failed to read templates" },
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

    const filePath = join(TEMPLATES_DIR, basename(filename));

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
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
