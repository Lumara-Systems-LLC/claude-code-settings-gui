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

// Import a built-in template to the appropriate location
export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot import in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { templateId, customName } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find the template
    const template = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const CLAUDE_DIR = join(homedir(), ".claude");
    let targetPath: string;
    let targetDir: string;
    const name = customName || template.filename || template.id;

    // Determine target location based on category
    switch (template.category) {
      case "skill":
        targetDir = join(CLAUDE_DIR, "skills", name);
        targetPath = join(targetDir, "SKILL.md");
        break;
      case "rule":
        targetDir = join(CLAUDE_DIR, "rules");
        targetPath = join(targetDir, name.endsWith(".md") ? name : `${name}.md`);
        break;
      case "agent":
        targetDir = join(CLAUDE_DIR, "agents", name);
        targetPath = join(targetDir, "AGENT.md");
        break;
      case "hook":
        targetDir = join(CLAUDE_DIR, "hooks");
        targetPath = join(targetDir, name.endsWith(".sh") ? name : `${name}.sh`);
        break;
      case "mcp-server":
      case "permission":
        // These go into settings.json, return the content for manual merge
        return NextResponse.json({
          success: true,
          type: "settings-merge",
          content: template.content,
          message: `Copy this ${template.category} configuration to your settings.json`,
        });
      default:
        return NextResponse.json(
          { error: "Unknown template category" },
          { status: 400 }
        );
    }

    // Check if target already exists
    try {
      await fs.access(targetPath);
      return NextResponse.json(
        { error: `${template.category} "${name}" already exists` },
        { status: 409 }
      );
    } catch {
      // Doesn't exist, proceed
    }

    // Create directory and file
    await fs.mkdir(targetDir, { recursive: true });

    // For hooks, make executable
    if (template.category === "hook") {
      await fs.writeFile(targetPath, template.content, { mode: 0o755 });
    } else {
      await fs.writeFile(targetPath, template.content, "utf-8");
    }

    return NextResponse.json({
      success: true,
      type: "file-created",
      path: targetPath,
      name,
      category: template.category,
    });
  } catch (error) {
    console.error("Failed to import template:", error);
    return NextResponse.json(
      { error: "Failed to import template" },
      { status: 500 }
    );
  }
}
