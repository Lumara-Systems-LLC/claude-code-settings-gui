import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { parseMarkdown } from "@/lib/frontmatter";
import { createBackup } from "@/lib/file-utils";
import type { RuleFrontmatter, RuleListItem, Rule } from "@/types/rule";
import { IS_DEMO_MODE, DEMO_RULES } from "@/lib/demo-data";

const RULES_DIR = join(homedir(), ".claude", "rules");

// Path-specific rules that are triggered by file extensions
const PATH_SPECIFIC_RULES = ["typescript.md", "go.md", "python.md", "react.md"];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");

  if (IS_DEMO_MODE) {
    if (filename) {
      const rule = DEMO_RULES.find((r) => r.name + ".md" === filename);
      if (rule) {
        return NextResponse.json({
          filename,
          path: rule.path,
          frontmatter: rule.frontmatter,
          content: rule.content,
          isPathSpecific: rule.type === "path-specific",
        });
      }
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json(
      DEMO_RULES.map((r) => ({
        filename: r.name + ".md",
        path: r.path,
        isPathSpecific: r.type === "path-specific",
        description: r.content.split("\n").find((l) => l.startsWith("#"))?.replace(/^#+\s*/, ""),
      }))
    );
  }

  try {
    if (filename) {
      // Get specific rule
      const filePath = join(RULES_DIR, filename);
      const content = await fs.readFile(filePath, "utf-8");
      const { frontmatter, content: body } = parseMarkdown<RuleFrontmatter>(content);

      const rule: Rule = {
        filename,
        path: filePath,
        frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
        content: body,
        isPathSpecific: PATH_SPECIFIC_RULES.includes(filename),
      };

      return NextResponse.json(rule);
    }

    // List all rules
    const files = await fs.readdir(RULES_DIR);
    const rules: RuleListItem[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = join(RULES_DIR, file);
      const content = await fs.readFile(filePath, "utf-8");

      // Extract first line as description
      const firstLine = content.split("\n").find((line) => line.startsWith("#"));
      const description = firstLine?.replace(/^#+\s*/, "").trim();

      rules.push({
        filename: file,
        path: filePath,
        isPathSpecific: PATH_SPECIFIC_RULES.includes(file),
        description,
      });
    }

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to read rules:", error);
    return NextResponse.json(
      { error: "Failed to read rules" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot save in demo mode" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || content === undefined) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }

    const filePath = join(RULES_DIR, basename(filename));

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
    console.error("Failed to update rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot create in demo mode" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || !content) {
      return NextResponse.json(
        { error: "Filename and content are required" },
        { status: 400 }
      );
    }

    const filePath = join(RULES_DIR, basename(filename));

    // Check if file already exists
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: "Rule already exists" },
        { status: 409 }
      );
    } catch {
      // File doesn't exist, proceed
    }

    await fs.writeFile(filePath, content, "utf-8");
    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { filename, confirmed } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    const filePath = join(RULES_DIR, basename(filename));
    await fs.unlink(filePath);

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error("Failed to delete rule:", error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
