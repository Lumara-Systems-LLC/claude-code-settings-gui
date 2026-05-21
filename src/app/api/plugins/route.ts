import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { createBackup } from "@/lib/file-utils";
import { PATHS } from "@/lib/constants";
import { IS_DEMO_MODE } from "@/lib/demo-data";

type InstalledPluginInstance = {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
};

type InstalledPluginsFile = {
  version: number;
  plugins: Record<string, InstalledPluginInstance[]>;
};

type SettingsFile = {
  enabledPlugins?: Record<string, boolean>;
  [k: string]: unknown;
};

type PluginRow = {
  id: string;
  version: string;
  scope: string;
  installPath: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
  gitCommitSha?: string;
};

const DEMO_PLUGINS: PluginRow[] = [
  {
    id: "gopls-lsp@claude-plugins-official",
    version: "1.0.0",
    scope: "user",
    installPath: "(demo)",
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    enabled: true,
    gitCommitSha: "demo123",
  },
];

const INSTALLED_PATH = join(PATHS.PLUGINS_DIR, "installed_plugins.json");

async function readInstalled(): Promise<InstalledPluginsFile> {
  try {
    const content = await fs.readFile(INSTALLED_PATH, "utf-8");
    return JSON.parse(content) as InstalledPluginsFile;
  } catch {
    return { version: 2, plugins: {} };
  }
}

async function readSettings(): Promise<SettingsFile> {
  try {
    const content = await fs.readFile(PATHS.SETTINGS_JSON, "utf-8");
    return JSON.parse(content) as SettingsFile;
  } catch {
    return {};
  }
}

async function writeSettings(s: SettingsFile): Promise<void> {
  await createBackup(PATHS.SETTINGS_JSON);
  const tempPath = `${PATHS.SETTINGS_JSON}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(s, null, 2), "utf-8");
  await fs.rename(tempPath, PATHS.SETTINGS_JSON);
}

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json(DEMO_PLUGINS);
  }
  try {
    const [installed, settings] = await Promise.all([readInstalled(), readSettings()]);
    const enabled = settings.enabledPlugins ?? {};
    const rows: PluginRow[] = [];

    // Plugins installed AND/OR enabled (some might be enabled in settings but not in
    // installed_plugins.json or vice versa)
    const allIds = new Set<string>([
      ...Object.keys(installed.plugins),
      ...Object.keys(enabled),
    ]);

    for (const id of allIds) {
      const instances = installed.plugins[id] ?? [];
      const first = instances[0];
      rows.push({
        id,
        version: first?.version ?? "(not installed)",
        scope: first?.scope ?? "—",
        installPath: first?.installPath ?? "—",
        installedAt: first?.installedAt ?? "",
        lastUpdated: first?.lastUpdated ?? "",
        enabled: enabled[id] === true,
        gitCommitSha: first?.gitCommitSha,
      });
    }

    rows.sort((a, b) => a.id.localeCompare(b.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to read plugins:", error);
    return NextResponse.json({ error: "Failed to read plugins" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: "Cannot toggle in demo mode" }, { status: 403 });
  }
  try {
    const { id, enabled } = await request.json();
    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "id and enabled (boolean) required" },
        { status: 400 }
      );
    }
    const settings = await readSettings();
    settings.enabledPlugins = { ...(settings.enabledPlugins ?? {}), [id]: enabled };
    await writeSettings(settings);
    return NextResponse.json({ success: true, id, enabled });
  } catch (error) {
    console.error("Failed to toggle plugin:", error);
    return NextResponse.json({ error: "Failed to toggle plugin" }, { status: 500 });
  }
}
