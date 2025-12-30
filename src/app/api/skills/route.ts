import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parseMarkdown } from "@/lib/frontmatter";
import { createBackup } from "@/lib/file-utils";
import type { SkillFrontmatter, SkillListItem, Skill } from "@/types/skill";
import { IS_DEMO_MODE, DEMO_SKILLS } from "@/lib/demo-data";

const SKILLS_DIR = join(homedir(), ".claude", "skills");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  // Return demo data in demo mode
  if (IS_DEMO_MODE) {
    if (name) {
      const skill = DEMO_SKILLS.find((s) => s.name === name);
      if (skill) {
        return NextResponse.json(skill);
      }
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }
    return NextResponse.json(
      DEMO_SKILLS.map((s) => ({
        name: s.name,
        path: s.path,
        description: s.frontmatter.description,
      }))
    );
  }

  try {
    if (name) {
      // Get specific skill
      const skillPath = join(SKILLS_DIR, name, "SKILL.md");
      const content = await fs.readFile(skillPath, "utf-8");
      const { frontmatter, content: body } =
        parseMarkdown<SkillFrontmatter>(content);

      const skill: Skill = {
        name,
        path: skillPath,
        frontmatter,
        content: body,
      };

      return NextResponse.json(skill);
    }

    // List all skills
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const skills: SkillListItem[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = join(SKILLS_DIR, entry.name, "SKILL.md");
      try {
        const content = await fs.readFile(skillPath, "utf-8");
        const { frontmatter } = parseMarkdown<SkillFrontmatter>(content);

        skills.push({
          name: entry.name,
          path: skillPath,
          description: frontmatter.description || "",
        });
      } catch {
        // Skip if SKILL.md doesn't exist
      }
    }

    // Sort alphabetically
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(skills);
  } catch (error) {
    console.error("Failed to read skills:", error);
    return NextResponse.json(
      { error: "Failed to read skills" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot save in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, content } = body;

    if (!name || content === undefined) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    const skillPath = join(SKILLS_DIR, name, "SKILL.md");

    // Create backup
    try {
      await fs.access(skillPath);
      await createBackup(skillPath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Ensure directory exists
    await fs.mkdir(join(SKILLS_DIR, name), { recursive: true });

    // Write atomically
    const tempPath = `${skillPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, skillPath);

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to update skill:", error);
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot create in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate name format (lowercase, hyphens only)
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { error: "Name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const skillDir = join(SKILLS_DIR, name);
    const skillPath = join(skillDir, "SKILL.md");

    // Check if skill already exists
    try {
      await fs.access(skillPath);
      return NextResponse.json(
        { error: "Skill already exists" },
        { status: 409 }
      );
    } catch {
      // Skill doesn't exist, proceed
    }

    // Create initial content
    const content = `---
name: ${name}
description: ${description || ""}
---

# ${name.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Skill

${description || "Add your skill description here."}

## Usage

Run \`/${name}\` to invoke this skill.

## Instructions

Add your skill instructions here.
`;

    // Create directory and file
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(skillPath, content, "utf-8");

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to create skill:", error);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot delete in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, confirmed } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    const skillDir = join(SKILLS_DIR, name);

    // Delete entire skill directory
    await fs.rm(skillDir, { recursive: true, force: true });

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to delete skill:", error);
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    );
  }
}
