import { NextRequest, NextResponse } from "next/server";
import { homedir } from "os";
import { join } from "path";
import { validatePath, isSensitive } from "@/lib/file-utils";
import { CLAUDE_DIR } from "@/lib/constants";
import { issueRevealToken } from "@/lib/reveal-tokens";
import { IS_DEMO_MODE } from "@/lib/demo-data";

function resolvePath(path: string): string {
  if (path.startsWith("undefined/")) {
    path = path.replace("undefined/", homedir() + "/");
  }
  if (path.startsWith("/") || path.startsWith(homedir()) || path.startsWith(CLAUDE_DIR)) {
    return path;
  }
  return join(CLAUDE_DIR, path);
}

export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Sensitive files cannot be revealed in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    let { path } = body;
    const { file, acknowledged } = body;

    if (file && !path) {
      path = join(CLAUDE_DIR, file);
    }
    if (!path) {
      return NextResponse.json({ error: "Path or file is required" }, { status: 400 });
    }
    if (acknowledged !== true) {
      return NextResponse.json(
        {
          error:
            "Reveal must be acknowledged (set acknowledged: true to confirm you understand this exposes secrets)",
        },
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
    if (!isSensitive(path)) {
      return NextResponse.json(
        { error: "File is not sensitive — fetch it normally" },
        { status: 400 }
      );
    }

    const { token, expiresAt } = issueRevealToken(path);
    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    console.error("Failed to issue reveal token:", error);
    return NextResponse.json(
      { error: "Failed to issue reveal token" },
      { status: 500 }
    );
  }
}
