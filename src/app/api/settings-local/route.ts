import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { createBackup } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const SETTINGS_LOCAL_PATH = PATHS.SETTINGS_LOCAL_JSON;

const EMPTY_LOCAL = {
  permissions: { allow: [], deny: [], ask: [] },
};

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({
      ...EMPTY_LOCAL,
      _exists: true,
      _demo: true,
    });
  }
  try {
    const content = await fs.readFile(SETTINGS_LOCAL_PATH, "utf-8");
    const parsed = JSON.parse(content);
    return NextResponse.json({ ...parsed, _exists: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ ...EMPTY_LOCAL, _exists: false });
    }
    console.error("Failed to read settings.local.json:", error);
    return NextResponse.json(
      { error: "Failed to read settings.local.json" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot save in demo mode" },
      { status: 403 }
    );
  }
  try {
    const body = await request.json();
    // Strip our internal markers before writing
    const clean = { ...body };
    delete clean._exists;
    delete clean._demo;

    try {
      await fs.access(SETTINGS_LOCAL_PATH);
      await createBackup(SETTINGS_LOCAL_PATH);
    } catch {
      // File doesn't exist yet, no backup needed
    }
    const tempPath = `${SETTINGS_LOCAL_PATH}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, JSON.stringify(clean, null, 2), "utf-8");
    await fs.rename(tempPath, SETTINGS_LOCAL_PATH);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to write settings.local.json:", error);
    return NextResponse.json(
      { error: "Failed to write settings.local.json" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot delete in demo mode" }, { status: 403 });
  }
  try {
    await fs.unlink(SETTINGS_LOCAL_PATH);
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: true });
    }
    console.error("Failed to delete settings.local.json:", error);
    return NextResponse.json(
      { error: "Failed to delete settings.local.json" },
      { status: 500 }
    );
  }
}
