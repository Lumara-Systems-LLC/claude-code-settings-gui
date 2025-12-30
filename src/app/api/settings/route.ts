import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { settingsSchema, formatValidationErrors } from "@/schemas/settings.schema";
import { createBackup } from "@/lib/file-utils";
import { IS_DEMO_MODE, DEMO_SETTINGS } from "@/lib/demo-data";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_SETTINGS);
  }

  try {
    const content = await fs.readFile(SETTINGS_PATH, "utf-8");
    const settings = JSON.parse(content);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to read settings:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
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

    // Validate the settings
    const result = settingsSchema.safeParse(body);
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      return NextResponse.json(
        {
          error: "Invalid settings format",
          details: errors,
          issues: result.error.issues
        },
        { status: 400 }
      );
    }

    // Create backup before writing
    await createBackup(SETTINGS_PATH);

    // Write atomically
    const tempPath = `${SETTINGS_PATH}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, JSON.stringify(result.data, null, 2), "utf-8");
    await fs.rename(tempPath, SETTINGS_PATH);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot save in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { path: jsonPath, value } = body;

    if (!jsonPath) {
      return NextResponse.json(
        { error: "Path is required for partial update" },
        { status: 400 }
      );
    }

    // Read current settings
    const content = await fs.readFile(SETTINGS_PATH, "utf-8");
    const settings = JSON.parse(content);

    // Update the value at the path
    const pathParts = jsonPath.split(".");
    let current = settings;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!(pathParts[i] in current)) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;

    // Create backup before writing
    await createBackup(SETTINGS_PATH);

    // Write atomically
    const tempPath = `${SETTINGS_PATH}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, JSON.stringify(settings, null, 2), "utf-8");
    await fs.rename(tempPath, SETTINGS_PATH);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to patch settings:", error);
    return NextResponse.json(
      { error: "Failed to patch settings" },
      { status: 500 }
    );
  }
}
