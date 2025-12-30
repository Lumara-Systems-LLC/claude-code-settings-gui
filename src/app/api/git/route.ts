import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import type { GitStatus } from "@/types/storage";
import { IS_DEMO_MODE, DEMO_GIT_STATUS } from "@/lib/demo-data";

const execAsync = promisify(exec);
const CLAUDE_DIR = join(homedir(), ".claude");

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_GIT_STATUS);
  }

  try {
    // Get current branch
    const { stdout: branchOutput } = await execAsync(
      "git rev-parse --abbrev-ref HEAD",
      { cwd: CLAUDE_DIR }
    );
    const branch = branchOutput.trim();

    // Get status
    const { stdout: statusOutput } = await execAsync(
      "git status --porcelain",
      { cwd: CLAUDE_DIR }
    );

    const lines = statusOutput.trim().split("\n").filter(Boolean);
    const modified: string[] = [];
    const staged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (status === "??") {
        untracked.push(file);
      } else if (status[0] !== " ") {
        staged.push(file);
      } else if (status[1] !== " ") {
        modified.push(file);
      }
    }

    const gitStatus: GitStatus = {
      branch,
      isClean: lines.length === 0,
      modified,
      staged,
      untracked,
    };

    return NextResponse.json(gitStatus);
  } catch (error) {
    console.error("Failed to get git status:", error);
    return NextResponse.json(
      { error: "Failed to get git status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot perform git actions in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, files, message } = body;

    switch (action) {
      case "stage": {
        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: "Files are required" },
            { status: 400 }
          );
        }
        const fileList = files.join(" ");
        await execAsync(`git add ${fileList}`, { cwd: CLAUDE_DIR });
        return NextResponse.json({ success: true });
      }

      case "unstage": {
        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: "Files are required" },
            { status: 400 }
          );
        }
        const fileList = files.join(" ");
        await execAsync(`git reset HEAD ${fileList}`, { cwd: CLAUDE_DIR });
        return NextResponse.json({ success: true });
      }

      case "commit": {
        if (!message) {
          return NextResponse.json(
            { error: "Commit message is required" },
            { status: 400 }
          );
        }
        // Escape message for shell
        const escapedMessage = message.replace(/'/g, "'\\''");
        await execAsync(`git commit -m '${escapedMessage}'`, {
          cwd: CLAUDE_DIR,
        });
        return NextResponse.json({ success: true });
      }

      case "discard": {
        if (!files || files.length === 0) {
          return NextResponse.json(
            { error: "Files are required" },
            { status: 400 }
          );
        }
        const fileList = files.join(" ");
        await execAsync(`git checkout -- ${fileList}`, { cwd: CLAUDE_DIR });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Failed to perform git action:", error);
    return NextResponse.json(
      {
        error: "Failed to perform git action",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
