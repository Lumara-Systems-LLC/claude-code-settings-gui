import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { platform, release, hostname, totalmem, cpus, networkInterfaces } from "os";
import { PATHS, CLAUDE_DIR } from "@/lib/constants";
import { fileExists } from "@/lib/file-utils";
import { IS_DEMO_MODE } from "@/lib/demo-data";

/**
 * Build a sensible HOST.md template using local system information.
 * All data stays in-process — nothing is transmitted externally.
 */
function buildHostMdContent(): string {
  const platName = platform();
  const relVersion = release();
  const host = hostname();
  const cpu = cpus()[0];
  const memGb = (totalmem() / (1024 ** 3)).toFixed(1);

  // Collect network interface names and IPv4 addresses
  const nifs = networkInterfaces();
  const netLines = Object.entries(nifs)
    .flatMap(([name, addrs]) =>
      (addrs || [])
        .filter((a) => a.family === "IPv4" && !a.internal)
        .map((a) => `  - **${name}**: ${a.address}`)
    )
    .join("\n");

  return `# Host Configuration

> Auto-generated on ${new Date().toISOString().split("T")[0]} by Claude Code Settings GUI.
> Edit freely — this is your machine's reference document.

## System Overview

| Property | Value |
|----------|-------|
| Platform | ${platName} ${relVersion} |
| Hostname | ${host} |
| CPU | ${cpu.model} (${cpus().length} cores) |
| RAM | ${memGb} GB |

## Network

${netLines || "  _(no external interfaces detected)_"}

## Local Services

_(list any local services Claude Code should know about)_

- Port 22 — SSH
- Port 5432 — PostgreSQL _(example)_

## SSH / Remote Access

_(document SSH keys, known hosts, jump boxes, etc.)_

## Environment Notes

_(anything else Claude Code should know about this machine)_
`;
}

/**
 * Build a sensible SYSTEM_ARCHITECTURE.md template.
 */
function buildSystemArchitectureContent(): string {
  return `# System Architecture

> Auto-generated on ${new Date().toISOString().split("T")[0]} by Claude Code Settings GUI.
> Edit freely — describe your Claude Code setup here.

## Claude Code Directory Layout

\`\`\`
${CLAUDE_DIR}/
├── CLAUDE.md                  # Global agent instructions
├── HOST.md                    # Machine-specific docs
├── SYSTEM_ARCHITECTURE.md     # This file
├── README.md                  # User documentation
├── settings.json              # Permissions, MCP servers, hooks
├── settings.local.json        # Local overrides (git-ignored)
├── rules/                     # Development guidelines
├── skills/                    # Reusable agent workflows
├── agents/                    # Specialized agent roles
├── hooks/                     # Event-triggered automations
├── templates/                 # File/commit templates
├── prompts/                   # Prompt snippets
├── commands/                  # Custom /-commands
├── output-styles/             # Output formatting presets
├── workflows/                 # Multi-step workflows
├── plans/                     # Project plans
├── projects/                  # Project metadata
├── backups/                   # Auto-backups
└── cache/                     # Internal cache
\`\`\`

## Toolchain

_(describe your editor, terminal, LSPs, formatters, linters, etc.)_

- Editor: _(VS Code / Neovim / …)_
- Shell: _(bash / zsh / fish)_
- Package manager: _(npm / pnpm / yarn)_

## Coding Conventions

_(language preferences, naming conventions, formatting rules)_

## Git Workflow

_(branch strategy, commit conventions, PR process)_

## CI / CD

_(build pipeline, deployment targets, testing strategy)_

## External Services

_(APIs, databases, cloud providers, MCP servers)_
`;
}

const DOC_FILES = {
  hostMd: {
    path: PATHS.HOST_MD,
    label: "HOST.md",
    builder: buildHostMdContent,
  },
  systemArchitecture: {
    path: PATHS.SYSTEM_ARCHITECTURE,
    label: "SYSTEM_ARCHITECTURE.md",
    builder: buildSystemArchitectureContent,
  },
} as const;

type DocFileKey = keyof typeof DOC_FILES;

export async function POST(request: Request) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot generate files in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { files }: { files?: DocFileKey[] } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty 'files' array (e.g. [\"hostMd\", \"systemArchitecture\"])" },
        { status: 400 }
      );
    }

    const generated: string[] = [];
    const skipped: string[] = [];

    for (const key of files) {
      const doc = DOC_FILES[key];
      if (!doc) {
        skipped.push(`${key} (unknown)`);
        continue;
      }
      if (await fileExists(doc.path)) {
        skipped.push(`${doc.label} (already exists)`);
        continue;
      }
      const content = doc.builder();
      await fs.writeFile(doc.path, content, "utf-8");
      generated.push(doc.label);
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
    });
  } catch (error) {
    console.error("Failed to generate docs:", error);
    return NextResponse.json(
      { error: "Failed to generate documentation files" },
      { status: 500 }
    );
  }
}

/**
 * GET — return which doc files are missing (for the banner to decide whether to show).
 */
export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ missingDocs: [] });
  }

  const missingDocs: DocFileKey[] = [];

  for (const [key, doc] of Object.entries(DOC_FILES) as [DocFileKey, (typeof DOC_FILES)[DocFileKey]][]) {
    const exists = await fileExists(doc.path);
    if (!exists) {
      missingDocs.push(key);
    }
  }

  return NextResponse.json({ missingDocs });
}
