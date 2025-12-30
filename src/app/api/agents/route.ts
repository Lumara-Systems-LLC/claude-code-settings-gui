import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { parseMarkdown } from "@/lib/frontmatter";
import { createBackup } from "@/lib/file-utils";
import type { AgentFrontmatter, AgentListItem, Agent } from "@/types/agent";
import { IS_DEMO_MODE, DEMO_AGENTS } from "@/lib/demo-data";

const AGENTS_DIR = join(homedir(), ".claude", "agents");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  if (IS_DEMO_MODE) {
    if (name) {
      const agent = DEMO_AGENTS.find((a) => a.name === name);
      if (agent) {
        return NextResponse.json(agent);
      }
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(
      DEMO_AGENTS.map((a) => ({
        name: a.name,
        path: a.path,
        description: a.frontmatter.description,
        model: a.frontmatter.model,
      }))
    );
  }

  try {
    if (name) {
      // Get specific agent
      const agentPath = join(AGENTS_DIR, name, "AGENT.md");
      const content = await fs.readFile(agentPath, "utf-8");
      const { frontmatter, content: body } =
        parseMarkdown<AgentFrontmatter>(content);

      const agent: Agent = {
        name,
        path: agentPath,
        frontmatter,
        content: body,
      };

      return NextResponse.json(agent);
    }

    // List all agents
    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
    const agents: AgentListItem[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const agentPath = join(AGENTS_DIR, entry.name, "AGENT.md");
      try {
        const content = await fs.readFile(agentPath, "utf-8");
        const { frontmatter } = parseMarkdown<AgentFrontmatter>(content);

        agents.push({
          name: entry.name,
          path: agentPath,
          description: frontmatter.description || "",
          model: frontmatter.model,
        });
      } catch {
        // Skip if AGENT.md doesn't exist
      }
    }

    // Sort alphabetically
    agents.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to read agents:", error);
    return NextResponse.json(
      { error: "Failed to read agents" },
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

    const agentPath = join(AGENTS_DIR, name, "AGENT.md");

    // Create backup
    try {
      await fs.access(agentPath);
      await createBackup(agentPath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Ensure directory exists
    await fs.mkdir(join(AGENTS_DIR, name), { recursive: true });

    // Write atomically
    const tempPath = `${agentPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, agentPath);

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}
