import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createBackup, formatBytes } from "@/lib/file-utils";
import type { HookListItem, HookScript } from "@/types/hook";
import { IS_DEMO_MODE, DEMO_HOOKS } from "@/lib/demo-data";

const HOOKS_DIR = join(homedir(), ".claude", "hooks");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  if (IS_DEMO_MODE) {
    if (name) {
      const hook = DEMO_HOOKS.find((h) => h.name + ".sh" === name);
      if (hook) {
        return NextResponse.json({
          name,
          path: hook.path,
          content: `#!/bin/bash\n# ${hook.description}\necho "Demo hook: ${hook.name}"`,
          size: 256,
          lastModified: new Date().toISOString(),
        });
      }
      return NextResponse.json({ error: "Hook not found" }, { status: 404 });
    }
    return NextResponse.json(
      DEMO_HOOKS.map((h) => ({
        name: h.name + ".sh",
        path: h.path,
        size: "256 B",
        lastModified: new Date().toISOString(),
        enabled: true,
      }))
    );
  }

  try {
    if (name) {
      // Get specific hook
      const hookPath = join(HOOKS_DIR, name);
      const [content, stats] = await Promise.all([
        fs.readFile(hookPath, "utf-8"),
        fs.stat(hookPath),
      ]);

      const hook: HookScript = {
        name,
        path: hookPath,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };

      return NextResponse.json(hook);
    }

    // List all hooks
    const entries = await fs.readdir(HOOKS_DIR, { withFileTypes: true });
    const hooks: HookListItem[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".sh")) continue;

      const hookPath = join(HOOKS_DIR, entry.name);
      const stats = await fs.stat(hookPath);

      hooks.push({
        name: entry.name,
        path: hookPath,
        size: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
        enabled: true, // All hooks are enabled by default
      });
    }

    // Sort alphabetically
    hooks.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(hooks);
  } catch (error) {
    console.error("Failed to read hooks:", error);
    return NextResponse.json(
      { error: "Failed to read hooks" },
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
    const { name, content } = body;

    if (!name || content === undefined) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    const hookPath = join(HOOKS_DIR, name);

    // Create backup
    try {
      await fs.access(hookPath);
      await createBackup(hookPath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Write atomically
    const tempPath = `${hookPath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, content, "utf-8");
    await fs.rename(tempPath, hookPath);

    // Ensure executable permissions
    await fs.chmod(hookPath, 0o755);

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to update hook:", error);
    return NextResponse.json(
      { error: "Failed to update hook" },
      { status: 500 }
    );
  }
}
