import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import type { GitDiff } from "@/types/storage";

const execAsync = promisify(exec);
const CLAUDE_DIR = join(homedir(), ".claude");

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const file = searchParams.get("file");

  try {
    if (file) {
      // Get diff for specific file
      const { stdout } = await execAsync(`git diff -- "${file}"`, {
        cwd: CLAUDE_DIR,
      });

      const diff: GitDiff = {
        file,
        diff: stdout,
      };

      return NextResponse.json(diff);
    }

    // Get all diffs
    const { stdout } = await execAsync("git diff", { cwd: CLAUDE_DIR });
    return NextResponse.json({ diff: stdout });
  } catch (error) {
    console.error("Failed to get git diff:", error);
    return NextResponse.json(
      { error: "Failed to get git diff" },
      { status: 500 }
    );
  }
}
