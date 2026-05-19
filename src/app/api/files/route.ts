import { NextRequest, NextResponse } from "next/server";
import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, deleteFile, validatePath, isSensitive } from "@/lib/file-utils";
import { CLAUDE_DIR } from "@/lib/constants";
import { IS_DEMO_MODE, DEMO_CLAUDE_MD } from "@/lib/demo-data";
import { consumeRevealToken } from "@/lib/reveal-tokens";

// Resolve a path - handles both absolute paths and relative paths from CLAUDE_DIR
function resolvePath(path: string): string {
  if (path.startsWith("undefined/")) {
    path = path.replace("undefined/", homedir() + "/");
  }
  if (path.startsWith("/") || path.startsWith(homedir()) || path.startsWith(CLAUDE_DIR)) {
    return path;
  }
  return join(CLAUDE_DIR, path);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const file = searchParams.get("file");
  const revealToken = searchParams.get("reveal");
  let path = searchParams.get("path");

  if (file) {
    path = join(CLAUDE_DIR, file);
  }

  if (!path) {
    return NextResponse.json({ error: "Path or file is required" }, { status: 400 });
  }

  path = resolvePath(path);

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
      { error: `Path must be within ${CLAUDE_DIR} directory` },
      { status: 403 }
    );
  }

  const sensitive = isSensitive(path);
  if (sensitive) {
    const tokenValid = revealToken ? consumeRevealToken(revealToken, path) : false;
    if (!tokenValid) {
      return NextResponse.json({
        path,
        sensitive: true,
        masked: true,
        content: "",
        message:
          "This file is masked because its name matches a sensitive pattern (env, credentials, secret, token, key, etc.). Request a reveal token to view it.",
      });
    }
  }

  try {
    const content = await readFile(path);
    return NextResponse.json({ content, path, sensitive, masked: false });
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
    const { content } = body;
    let { path } = body;
    const { file, createBackup = true } = body;

    if (file && !path) {
      path = join(CLAUDE_DIR, file);
    }

    if (!path || content === undefined) {
      return NextResponse.json(
        { error: "Path and content are required" },
        { status: 400 }
      );
    }

    path = resolvePath(path);

    if (!validatePath(path)) {
      return NextResponse.json(
        { error: `Path must be within ${CLAUDE_DIR} directory` },
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
    let { path } = body;
    const { file, confirmed } = body;

    if (file && !path) {
      path = join(CLAUDE_DIR, file);
    }

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
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
        { error: `Path must be within ${CLAUDE_DIR} directory` },
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
