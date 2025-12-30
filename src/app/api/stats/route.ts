import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getDirectorySize } from "@/lib/file-utils";
import { IS_DEMO_MODE, DEMO_STATS } from "@/lib/demo-data";

const CLAUDE_DIR = join(homedir(), ".claude");

async function countItemsInDir(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() || e.name.endsWith(".md")).length;
  } catch {
    return 0;
  }
}

async function countFiles(dirPath: string, extension?: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    if (extension) {
      return entries.filter((e) => e.isFile() && e.name.endsWith(extension)).length;
    }
    return entries.filter((e) => e.isFile()).length;
  } catch {
    return 0;
  }
}

async function countHooks(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".sh")).length;
  } catch {
    return 0;
  }
}

async function countProjects(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

export async function GET() {
  // Return demo data in demo mode
  if (IS_DEMO_MODE) {
    return NextResponse.json({
      rules: DEMO_STATS.rules,
      skills: DEMO_STATS.skills,
      agents: DEMO_STATS.agents,
      hooks: DEMO_STATS.hooks,
      projects: 3,
      storageSize: DEMO_STATS.storage.total,
      storageSizeBytes: 130023424,
    });
  }

  try {
    const [rules, skills, agents, hooks, projects, storageInfo] = await Promise.all([
      countFiles(join(CLAUDE_DIR, "rules"), ".md"),
      countItemsInDir(join(CLAUDE_DIR, "skills")),
      countItemsInDir(join(CLAUDE_DIR, "agents")),
      countHooks(join(CLAUDE_DIR, "hooks")),
      countProjects(join(CLAUDE_DIR, "projects")),
      getDirectorySize(CLAUDE_DIR),
    ]);

    return NextResponse.json({
      rules,
      skills,
      agents,
      hooks,
      projects,
      storageSize: storageInfo.sizeHuman,
      storageSizeBytes: storageInfo.sizeBytes,
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
