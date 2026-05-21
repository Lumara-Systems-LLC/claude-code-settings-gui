import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type IndexEntry = {
  name: string;
  command: string;
  description: string;
  output_style: string | null;
  allowed_tools: string;
  path: string;
  type: "skill" | "agent" | "hook" | "command" | "output_style" | "rule";
};

type CommandIndex = {
  generated_at?: string;
  summary?: {
    skills?: number;
    agents?: number;
    hooks?: number;
    output_styles?: number;
    rules?: number;
    mcp_servers?: number;
  };
  skills?: IndexEntry[];
  agents?: IndexEntry[];
  hooks?: IndexEntry[];
  commands?: IndexEntry[];
  output_styles?: IndexEntry[];
  rules?: IndexEntry[];
};

const DEMO: CommandIndex = {
  generated_at: new Date().toISOString(),
  summary: { skills: 23, agents: 4, hooks: 36, output_styles: 5, rules: 10 },
  skills: [
    {
      name: "commit",
      command: "/commit",
      description: "Generate commit messages from staged changes",
      output_style: null,
      allowed_tools: "Bash(git:*)",
      path: "~/.claude/skills/commit/SKILL.md",
      type: "skill",
    },
  ],
};

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO);
  }
  try {
    const content = await fs.readFile(PATHS.COMMAND_INDEX, "utf-8");
    const parsed = JSON.parse(content) as CommandIndex;
    return NextResponse.json(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({
        generated_at: null,
        summary: {},
        _empty: true,
        _message: "command-index.json doesn't exist yet — run the indexer to generate it.",
      });
    }
    console.error("Failed to read command index:", error);
    return NextResponse.json(
      { error: "Failed to read command index" },
      { status: 500 }
    );
  }
}
