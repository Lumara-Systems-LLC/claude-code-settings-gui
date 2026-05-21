import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { CLAUDE_DIR, PATHS } from "@/lib/constants";
import { dirExists, fileExists } from "@/lib/file-utils";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const EXPECTED_FILES = [
  { key: "settings", path: PATHS.SETTINGS_JSON, label: "settings.json" },
  { key: "claudeMd", path: PATHS.CLAUDE_MD, label: "CLAUDE.md" },
] as const;

const EXPECTED_DIRS = [
  { key: "rules", path: PATHS.RULES_DIR, label: "rules" },
  { key: "skills", path: PATHS.SKILLS_DIR, label: "skills" },
  { key: "agents", path: PATHS.AGENTS_DIR, label: "agents" },
  { key: "hooks", path: PATHS.HOOKS_DIR, label: "hooks" },
] as const;

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({
      configDir: CLAUDE_DIR,
      exists: true,
      isEmpty: false,
      isDemo: true,
      missing: [],
      present: ["settings.json", "CLAUDE.md", "rules", "skills", "agents", "hooks"],
    });
  }

  const exists = await dirExists(CLAUDE_DIR);
  if (!exists) {
    return NextResponse.json({
      configDir: CLAUDE_DIR,
      exists: false,
      isEmpty: true,
      isDemo: false,
      missing: [...EXPECTED_FILES.map((f) => f.label), ...EXPECTED_DIRS.map((d) => d.label)],
      present: [],
    });
  }

  let entryCount = 0;
  try {
    const entries = await fs.readdir(CLAUDE_DIR);
    entryCount = entries.length;
  } catch {
    entryCount = 0;
  }

  const fileChecks = await Promise.all(
    EXPECTED_FILES.map(async (f) => ({ ...f, present: await fileExists(f.path) }))
  );
  const dirChecks = await Promise.all(
    EXPECTED_DIRS.map(async (d) => ({ ...d, present: await dirExists(d.path) }))
  );

  const missing = [
    ...fileChecks.filter((c) => !c.present).map((c) => c.label),
    ...dirChecks.filter((c) => !c.present).map((c) => c.label),
  ];
  const present = [
    ...fileChecks.filter((c) => c.present).map((c) => c.label),
    ...dirChecks.filter((c) => c.present).map((c) => c.label),
  ];

  return NextResponse.json({
    configDir: CLAUDE_DIR,
    exists: true,
    isEmpty: entryCount === 0,
    isDemo: false,
    missing,
    present,
  });
}

export async function POST() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot initialize config in demo mode" },
      { status: 403 }
    );
  }

  try {
    await fs.mkdir(CLAUDE_DIR, { recursive: true });

    for (const dir of EXPECTED_DIRS) {
      await fs.mkdir(dir.path, { recursive: true });
    }

    if (!(await fileExists(PATHS.SETTINGS_JSON))) {
      const minimalSettings = {
        permissions: { allow: [], deny: [] },
        hooks: {},
        mcpServers: {},
      };
      await fs.writeFile(
        PATHS.SETTINGS_JSON,
        JSON.stringify(minimalSettings, null, 2),
        "utf-8"
      );
    }

    if (!(await fileExists(PATHS.CLAUDE_MD))) {
      const minimalClaudeMd = `# AI Agent Operating Rules

Add your global Claude Code instructions here. These apply to all projects unless overridden by a project-level CLAUDE.md.

## Rules

(none yet)

## Skills

(none yet)
`;
      await fs.writeFile(PATHS.CLAUDE_MD, minimalClaudeMd, "utf-8");
    }

    return NextResponse.json({ success: true, configDir: CLAUDE_DIR });
  } catch (error) {
    console.error("Failed to initialize config:", error);
    return NextResponse.json(
      { error: "Failed to initialize config" },
      { status: 500 }
    );
  }
}
