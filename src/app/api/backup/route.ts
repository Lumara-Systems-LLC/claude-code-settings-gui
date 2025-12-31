import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, relative } from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const execAsync = promisify(exec);
const CLAUDE_DIR = join(homedir(), ".claude");

// Directories and files to include in backup
const BACKUP_ITEMS = [
  "CLAUDE.md",
  "README.md",
  "settings.json",
  "skills",
  "agents",
  "rules",
  "hooks",
  "prompts",
  "templates",
];

interface BackupInfo {
  created: string;
  version: string;
  items: { path: string; type: "file" | "directory"; size: number }[];
}

// GET - Export backup as tar.gz
export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Backup not available in demo mode" },
      { status: 403 }
    );
  }

  try {
    // Collect items that exist
    const existingItems: string[] = [];
    const itemDetails: BackupInfo["items"] = [];

    for (const item of BACKUP_ITEMS) {
      const itemPath = join(CLAUDE_DIR, item);
      try {
        const stats = await fs.stat(itemPath);
        existingItems.push(item);
        itemDetails.push({
          path: item,
          type: stats.isDirectory() ? "directory" : "file",
          size: stats.isDirectory() ? 0 : stats.size,
        });
      } catch {
        // Item doesn't exist, skip
      }
    }

    if (existingItems.length === 0) {
      return NextResponse.json(
        { error: "No configuration files found to backup" },
        { status: 404 }
      );
    }

    // Create backup info file
    const backupInfo: BackupInfo = {
      created: new Date().toISOString(),
      version: "1.0",
      items: itemDetails,
    };

    const infoPath = join(CLAUDE_DIR, ".backup-info.json");
    await fs.writeFile(infoPath, JSON.stringify(backupInfo, null, 2));
    existingItems.push(".backup-info.json");

    // Create tar.gz using system tar
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `claude-config-backup-${timestamp}.tar.gz`;

    // Create the archive
    const itemsList = existingItems.join(" ");
    const { stdout } = await execAsync(
      `cd "${CLAUDE_DIR}" && tar -czf - ${itemsList}`,
      { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }
    );

    // Cleanup info file
    await fs.unlink(infoPath).catch(() => {});

    return new Response(stdout, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stdout.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to create backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// POST - Restore from backup
export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Restore not available in demo mode" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = formData.get("mode") as string || "merge"; // "merge" or "replace"

    if (!file) {
      return NextResponse.json(
        { error: "No backup file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".tar.gz") && !file.name.endsWith(".tgz")) {
      return NextResponse.json(
        { error: "Invalid file type. Expected .tar.gz file" },
        { status: 400 }
      );
    }

    // Create temp directory for extraction
    const tempDir = join(CLAUDE_DIR, `.restore-temp-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Write uploaded file to temp location
      const tempArchive = join(tempDir, "backup.tar.gz");
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempArchive, buffer);

      // Extract to temp directory
      await execAsync(`cd "${tempDir}" && tar -xzf backup.tar.gz`);

      // Read backup info if exists
      let backupInfo: BackupInfo | null = null;
      try {
        const infoContent = await fs.readFile(join(tempDir, ".backup-info.json"), "utf-8");
        backupInfo = JSON.parse(infoContent);
      } catch {
        // No info file, proceed anyway
      }

      // If replace mode, backup current config first
      if (mode === "replace") {
        const currentBackupDir = join(CLAUDE_DIR, `.pre-restore-backup-${Date.now()}`);
        await fs.mkdir(currentBackupDir, { recursive: true });

        for (const item of BACKUP_ITEMS) {
          const sourcePath = join(CLAUDE_DIR, item);
          const destPath = join(currentBackupDir, item);
          try {
            await fs.cp(sourcePath, destPath, { recursive: true });
          } catch {
            // Item doesn't exist, skip
          }
        }
      }

      // Copy restored files to claude dir
      const restoredItems: string[] = [];
      const entries = await fs.readdir(tempDir);

      for (const entry of entries) {
        if (entry === "backup.tar.gz" || entry === ".backup-info.json") continue;

        const sourcePath = join(tempDir, entry);
        const destPath = join(CLAUDE_DIR, entry);

        // In merge mode, backup existing before overwrite
        if (mode === "merge") {
          try {
            await fs.access(destPath);
            const backupPath = `${destPath}.backup.${Date.now()}`;
            await fs.rename(destPath, backupPath);
          } catch {
            // Doesn't exist, no backup needed
          }
        }

        await fs.cp(sourcePath, destPath, { recursive: true });
        restoredItems.push(entry);
      }

      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      return NextResponse.json({
        success: true,
        restoredItems,
        mode,
        backupInfo,
      });
    } catch (error) {
      // Cleanup on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}

// DELETE - List available backups (pre-restore backups)
export async function DELETE() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Not available in demo mode" },
      { status: 403 }
    );
  }

  try {
    const entries = await fs.readdir(CLAUDE_DIR);
    const backups = entries.filter((e) => e.startsWith(".pre-restore-backup-"));

    // Delete all pre-restore backups
    for (const backup of backups) {
      await fs.rm(join(CLAUDE_DIR, backup), { recursive: true, force: true });
    }

    return NextResponse.json({
      success: true,
      deleted: backups.length,
    });
  } catch (error) {
    console.error("Failed to cleanup backups:", error);
    return NextResponse.json(
      { error: "Failed to cleanup backups" },
      { status: 500 }
    );
  }
}
