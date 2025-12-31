import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, deleteFile, validatePath } from "@/lib/file-utils";
import { IS_DEMO_MODE, DEMO_CLAUDE_MD } from "@/lib/demo-data";
import { homedir } from "os";
import { join } from "path";

// Resolve a path - handles both absolute paths and relative paths from ~/.claude
function resolvePath(path: string): string {
  // If path starts with home directory or is absolute, use as-is
  if (path.startsWith("/") || path.startsWith(homedir())) {
    return path;
  }
  // Otherwise, treat as relative to ~/.claude
  return join(homedir(), ".claude", path);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let path = searchParams.get("path");
  const file = searchParams.get("file"); // New: accept file name directly

  // Support both ?path=... and ?file=... (file is relative to ~/.claude)
  if (file) {
    path = join(homedir(), ".claude", file);
  }

  if (!path) {
    return NextResponse.json({ error: "Path or file is required" }, { status: 400 });
  }

  // Resolve path (handles "undefined/..." from client-side process.env.HOME bug)
  if (path.startsWith("undefined/")) {
    path = path.replace("undefined/", homedir() + "/");
  }
  path = resolvePath(path);

  // Demo mode - return demo content for known files
  if (IS_DEMO_MODE) {
    if (path.endsWith("CLAUDE.md")) {
      return NextResponse.json({ content: DEMO_CLAUDE_MD, path });
    }
    if (path.endsWith("README.md")) {
      return NextResponse.json({
        content: "# Claude Code Configuration\n\nThis is a demo README file.",
        path,
      });
    }
    return NextResponse.json({ error: "File not found in demo mode" }, { status: 404 });
  }

  if (!validatePath(path)) {
    return NextResponse.json(
      { error: "Path must be within ~/.claude directory" },
      { status: 403 }
    );
  }

  try {
    const content = await readFile(path);
    return NextResponse.json({ content, path });
  } catch (error) {
    console.error("Failed to read file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
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
    let { path, file, content, createBackup = true } = body;

    // Support both path and file (file is relative to ~/.claude)
    if (file && !path) {
      path = join(homedir(), ".claude", file);
    }

    if (!path || content === undefined) {
      return NextResponse.json(
        { error: "Path and content are required" },
        { status: 400 }
      );
    }

    // Resolve path (handles "undefined/..." from client-side process.env.HOME bug)
    if (path.startsWith("undefined/")) {
      path = path.replace("undefined/", homedir() + "/");
    }
    path = resolvePath(path);

    if (!validatePath(path)) {
      return NextResponse.json(
        { error: "Path must be within ~/.claude directory" },
        { status: 403 }
      );
    }

    await writeFile(path, content, createBackup);
    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Failed to write file:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }

  try {
    const body = await request.json();
    let { path, file, confirmed } = body;

    // Support both path and file (file is relative to ~/.claude)
    if (file && !path) {
      path = join(homedir(), ".claude", file);
    }

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Resolve path (handles "undefined/..." from client-side process.env.HOME bug)
    if (path.startsWith("undefined/")) {
      path = path.replace("undefined/", homedir() + "/");
    }
    path = resolvePath(path);

    if (!confirmed) {
      return NextResponse.json(
        { error: "Deletion must be confirmed" },
        { status: 400 }
      );
    }

    if (!validatePath(path)) {
      return NextResponse.json(
        { error: "Path must be within ~/.claude directory" },
        { status: 403 }
      );
    }

    await deleteFile(path);
    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
