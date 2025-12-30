import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import { promises as fs } from "fs";

const execAsync = promisify(exec);
const CLEANUP_SCRIPT = join(homedir(), ".claude", "scripts", "cleanup.sh");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = false, aggressive = false } = body;

    // Check if cleanup script exists
    try {
      await fs.access(CLEANUP_SCRIPT);
    } catch {
      return NextResponse.json(
        { error: "Cleanup script not found" },
        { status: 404 }
      );
    }

    // Build command with options
    let command = CLEANUP_SCRIPT;
    if (dryRun) command += " --dry-run";
    if (aggressive) command += " --aggressive";

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 1 minute timeout
    });

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr,
      dryRun,
      aggressive,
    });
  } catch (error) {
    console.error("Failed to run cleanup:", error);
    return NextResponse.json(
      {
        error: "Failed to run cleanup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
