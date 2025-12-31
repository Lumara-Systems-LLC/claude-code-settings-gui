import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { STARTER_PACKS, getStarterPack } from "@/lib/starter-packs";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const CLAUDE_DIR = join(homedir(), ".claude");

// GET - List available starter packs
export async function GET() {
  // Check if .claude directory exists and has content
  let hasExistingConfig = false;
  try {
    const entries = await fs.readdir(CLAUDE_DIR);
    // Check if there's meaningful content (not just empty directories)
    hasExistingConfig = entries.some((e) =>
      ["CLAUDE.md", "settings.json", "rules", "skills", "agents"].includes(e)
    );

    // If directories exist, check if they have content
    if (hasExistingConfig) {
      const rulesDir = join(CLAUDE_DIR, "rules");
      const skillsDir = join(CLAUDE_DIR, "skills");
      try {
        const rules = await fs.readdir(rulesDir);
        const skills = await fs.readdir(skillsDir);
        hasExistingConfig = rules.length > 0 || skills.length > 0;
      } catch {
        // Directories don't exist or are empty
        try {
          await fs.access(join(CLAUDE_DIR, "CLAUDE.md"));
          hasExistingConfig = true;
        } catch {
          hasExistingConfig = false;
        }
      }
    }
  } catch {
    // .claude directory doesn't exist
    hasExistingConfig = false;
  }

  return NextResponse.json({
    packs: STARTER_PACKS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      tags: p.tags,
      fileCount: p.files.length,
      hasSettings: !!p.settingsJson,
    })),
    hasExistingConfig,
    isDemo: IS_DEMO_MODE,
  });
}

// POST - Apply a starter pack
export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot apply starter packs in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { packId, mode = "merge" } = body; // mode: "merge" or "replace"

    if (!packId) {
      return NextResponse.json(
        { error: "Pack ID is required" },
        { status: 400 }
      );
    }

    const pack = getStarterPack(packId);
    if (!pack) {
      return NextResponse.json(
        { error: "Starter pack not found" },
        { status: 404 }
      );
    }

    // Create .claude directory if it doesn't exist
    await fs.mkdir(CLAUDE_DIR, { recursive: true });

    // If replace mode, backup existing config
    if (mode === "replace") {
      const backupDir = join(CLAUDE_DIR, `.pre-starter-backup-${Date.now()}`);
      const existingItems = ["CLAUDE.md", "settings.json", "rules", "skills", "agents", "hooks"];

      for (const item of existingItems) {
        const sourcePath = join(CLAUDE_DIR, item);
        const destPath = join(backupDir, item);
        try {
          await fs.access(sourcePath);
          await fs.mkdir(backupDir, { recursive: true });
          await fs.cp(sourcePath, destPath, { recursive: true });
        } catch {
          // Item doesn't exist, skip
        }
      }
    }

    const createdFiles: string[] = [];
    const skippedFiles: string[] = [];

    // Create all files from the starter pack
    for (const file of pack.files) {
      const filePath = join(CLAUDE_DIR, file.path);
      const fileDir = dirname(filePath);

      // In merge mode, skip existing files
      if (mode === "merge") {
        try {
          await fs.access(filePath);
          skippedFiles.push(file.path);
          continue;
        } catch {
          // File doesn't exist, proceed
        }
      }

      // Create directory if needed
      await fs.mkdir(fileDir, { recursive: true });

      // Write file
      if (file.executable) {
        await fs.writeFile(filePath, file.content, { mode: 0o755 });
      } else {
        await fs.writeFile(filePath, file.content, "utf-8");
      }
      createdFiles.push(file.path);
    }

    // Handle settings.json
    let settingsResult: "created" | "merged" | "skipped" = "skipped";
    if (pack.settingsJson) {
      const settingsPath = join(CLAUDE_DIR, "settings.json");

      if (mode === "replace") {
        // Replace settings entirely
        await fs.writeFile(
          settingsPath,
          JSON.stringify(pack.settingsJson, null, 2),
          "utf-8"
        );
        settingsResult = "created";
      } else {
        // Merge with existing settings
        let existingSettings = {};
        try {
          const existing = await fs.readFile(settingsPath, "utf-8");
          existingSettings = JSON.parse(existing);
        } catch {
          // No existing settings
        }

        // Deep merge permissions
        const merged = deepMergeSettings(existingSettings, pack.settingsJson as Record<string, unknown>);
        await fs.writeFile(
          settingsPath,
          JSON.stringify(merged, null, 2),
          "utf-8"
        );
        settingsResult = Object.keys(existingSettings).length > 0 ? "merged" : "created";
      }
    }

    return NextResponse.json({
      success: true,
      pack: {
        id: pack.id,
        name: pack.name,
      },
      mode,
      createdFiles,
      skippedFiles,
      settingsResult,
    });
  } catch (error) {
    console.error("Failed to apply starter pack:", error);
    return NextResponse.json(
      { error: "Failed to apply starter pack" },
      { status: 500 }
    );
  }
}

// Deep merge settings, combining arrays instead of replacing
function deepMergeSettings(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (key === "permissions" && typeof sourceValue === "object" && typeof targetValue === "object") {
      // Special handling for permissions - merge allow/deny arrays
      const targetPerms = targetValue as Record<string, string[]>;
      const sourcePerms = sourceValue as Record<string, string[]>;

      result[key] = {
        allow: [...new Set([...(targetPerms.allow || []), ...(sourcePerms.allow || [])])],
        deny: [...new Set([...(targetPerms.deny || []), ...(sourcePerms.deny || [])])],
      };
    } else if (key === "mcpServers" && typeof sourceValue === "object" && typeof targetValue === "object") {
      // Merge MCP servers
      result[key] = { ...targetValue as object, ...sourceValue as object };
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Merge arrays, removing duplicates
      result[key] = [...new Set([...targetValue, ...sourceValue])];
    } else if (typeof sourceValue === "object" && sourceValue !== null && !Array.isArray(sourceValue)) {
      // Recursively merge objects
      result[key] = deepMergeSettings(
        (targetValue as Record<string, unknown>) || {},
        sourceValue as Record<string, unknown>
      );
    } else {
      // Primitive values - source wins
      result[key] = sourceValue;
    }
  }

  return result;
}
