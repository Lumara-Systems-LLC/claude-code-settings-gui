import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import Fuse from "fuse.js";

const CLAUDE_DIR = join(homedir(), ".claude");

interface SearchableItem {
  type: "rule" | "skill" | "agent" | "template" | "prompt" | "hook";
  name: string;
  path: string;
  content: string;
  description?: string;
}

async function gatherSearchableItems(): Promise<SearchableItem[]> {
  const items: SearchableItem[] = [];

  // Gather rules
  try {
    const rulesDir = join(CLAUDE_DIR, "rules");
    const ruleFiles = await fs.readdir(rulesDir);
    for (const file of ruleFiles) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(join(rulesDir, file), "utf-8");
      items.push({
        type: "rule",
        name: file,
        path: join(rulesDir, file),
        content,
      });
    }
  } catch {
    // Directory doesn't exist
  }

  // Gather skills
  try {
    const skillsDir = join(CLAUDE_DIR, "skills");
    const skillDirs = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const dir of skillDirs) {
      if (!dir.isDirectory()) continue;
      try {
        const content = await fs.readFile(
          join(skillsDir, dir.name, "SKILL.md"),
          "utf-8"
        );
        items.push({
          type: "skill",
          name: dir.name,
          path: join(skillsDir, dir.name, "SKILL.md"),
          content,
        });
      } catch {
        // SKILL.md doesn't exist
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Gather agents
  try {
    const agentsDir = join(CLAUDE_DIR, "agents");
    const agentDirs = await fs.readdir(agentsDir, { withFileTypes: true });
    for (const dir of agentDirs) {
      if (!dir.isDirectory()) continue;
      try {
        const content = await fs.readFile(
          join(agentsDir, dir.name, "AGENT.md"),
          "utf-8"
        );
        items.push({
          type: "agent",
          name: dir.name,
          path: join(agentsDir, dir.name, "AGENT.md"),
          content,
        });
      } catch {
        // AGENT.md doesn't exist
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Gather templates
  try {
    const templatesDir = join(CLAUDE_DIR, "templates");
    const templateFiles = await fs.readdir(templatesDir);
    for (const file of templateFiles) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(join(templatesDir, file), "utf-8");
      items.push({
        type: "template",
        name: file,
        path: join(templatesDir, file),
        content,
      });
    }
  } catch {
    // Directory doesn't exist
  }

  // Gather prompts
  try {
    const promptsDir = join(CLAUDE_DIR, "prompts");
    const promptFiles = await fs.readdir(promptsDir);
    for (const file of promptFiles) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(join(promptsDir, file), "utf-8");
      items.push({
        type: "prompt",
        name: file,
        path: join(promptsDir, file),
        content,
      });
    }
  } catch {
    // Directory doesn't exist
  }

  // Gather hooks
  try {
    const hooksDir = join(CLAUDE_DIR, "hooks");
    const hookFiles = await fs.readdir(hooksDir);
    for (const file of hookFiles) {
      if (!file.endsWith(".sh")) continue;
      const content = await fs.readFile(join(hooksDir, file), "utf-8");
      items.push({
        type: "hook",
        name: file,
        path: join(hooksDir, file),
        content,
      });
    }
  } catch {
    // Directory doesn't exist
  }

  return items;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const typeFilter = searchParams.get("type");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    let items = await gatherSearchableItems();

    // Apply type filter
    if (typeFilter) {
      items = items.filter((item) => item.type === typeFilter);
    }

    // Configure Fuse.js for fuzzy search
    const fuse = new Fuse(items, {
      keys: [
        { name: "name", weight: 2 },
        { name: "content", weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
    });

    const results = fuse.search(query, { limit });

    return NextResponse.json({
      query,
      results: results.map((result) => ({
        ...result.item,
        score: result.score,
        matches: result.matches,
      })),
    });
  } catch (error) {
    console.error("Failed to search:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
