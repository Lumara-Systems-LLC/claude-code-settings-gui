import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { spawn } from "child_process";
import { createBackup } from "@/lib/file-utils";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

interface McpServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "stdio" | "sse";
  url?: string;
}

interface Settings {
  mcpServers?: Record<string, McpServer>;
  [key: string]: unknown;
}

// Popular MCP servers registry
export const MCP_SERVER_REGISTRY = [
  {
    id: "github",
    name: "GitHub",
    description: "GitHub API integration - repos, issues, PRs, and more",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVars: ["GITHUB_TOKEN"],
    category: "development",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Query and manage PostgreSQL databases",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    envVars: ["DATABASE_URL"],
    category: "database",
  },
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read and navigate local filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/"],
    envVars: [],
    category: "system",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent memory and knowledge storage",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    envVars: [],
    category: "utility",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Web search using Brave Search API",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    envVars: ["BRAVE_API_KEY"],
    category: "search",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Slack workspace integration",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    envVars: ["SLACK_BOT_TOKEN"],
    category: "communication",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    envVars: [],
    category: "automation",
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "Query local SQLite databases",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite"],
    envVars: [],
    category: "database",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking and monitoring",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sentry"],
    envVars: ["SENTRY_AUTH_TOKEN"],
    category: "monitoring",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Linear issue tracking integration",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-linear"],
    envVars: ["LINEAR_API_KEY"],
    category: "development",
  },
];

// Demo data for demo mode
const DEMO_SERVERS: Record<string, McpServer> = {
  github: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_TOKEN: "***" },
  },
  memory: {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
};

async function readSettings(): Promise<Settings> {
  try {
    const content = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  await createBackup(SETTINGS_PATH);
  const tempPath = `${SETTINGS_PATH}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(settings, null, 2), "utf-8");
  await fs.rename(tempPath, SETTINGS_PATH);
}

// GET - List MCP servers
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode");

  // Return registry of available servers
  if (mode === "registry") {
    return NextResponse.json({
      servers: MCP_SERVER_REGISTRY,
      categories: [...new Set(MCP_SERVER_REGISTRY.map((s) => s.category))],
    });
  }

  if (IS_DEMO_MODE) {
    return NextResponse.json({
      servers: DEMO_SERVERS,
      count: Object.keys(DEMO_SERVERS).length,
    });
  }

  try {
    const settings = await readSettings();
    const servers = settings.mcpServers || {};

    return NextResponse.json({
      servers,
      count: Object.keys(servers).length,
    });
  } catch (error) {
    console.error("Failed to read MCP servers:", error);
    return NextResponse.json(
      { error: "Failed to read MCP servers" },
      { status: 500 }
    );
  }
}

// POST - Add or update MCP server
export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot modify in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, config, fromRegistry } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Server name is required" },
        { status: 400 }
      );
    }

    // Validate name format
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json(
        { error: "Name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    let serverConfig: McpServer;

    if (fromRegistry) {
      // Install from registry
      const registryServer = MCP_SERVER_REGISTRY.find((s) => s.id === fromRegistry);
      if (!registryServer) {
        return NextResponse.json(
          { error: "Server not found in registry" },
          { status: 404 }
        );
      }

      serverConfig = {
        command: registryServer.command,
        args: registryServer.args,
        env: config?.env || {},
      };
    } else {
      // Custom server config
      if (!config?.command) {
        return NextResponse.json(
          { error: "Server command is required" },
          { status: 400 }
        );
      }

      serverConfig = {
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        type: config.type,
        url: config.url,
      };
    }

    const settings = await readSettings();
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }

    settings.mcpServers[name] = serverConfig;
    await writeSettings(settings);

    return NextResponse.json({
      success: true,
      name,
      config: serverConfig,
    });
  } catch (error) {
    console.error("Failed to add MCP server:", error);
    return NextResponse.json(
      { error: "Failed to add MCP server" },
      { status: 500 }
    );
  }
}

// DELETE - Remove MCP server
export async function DELETE(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot modify in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Server name is required" },
        { status: 400 }
      );
    }

    const settings = await readSettings();
    if (!settings.mcpServers || !settings.mcpServers[name]) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    delete settings.mcpServers[name];
    await writeSettings(settings);

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Failed to remove MCP server:", error);
    return NextResponse.json(
      { error: "Failed to remove MCP server" },
      { status: 500 }
    );
  }
}

// PATCH - Test MCP server connection
export async function PATCH(request: NextRequest) {
  if (IS_DEMO_MODE) {
    // Simulate test in demo mode
    return NextResponse.json({
      success: true,
      status: "connected",
      message: "Demo mode - connection simulated",
    });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Server name is required" },
        { status: 400 }
      );
    }

    const settings = await readSettings();
    const server = settings.mcpServers?.[name];

    if (!server) {
      return NextResponse.json(
        { error: "Server not found" },
        { status: 404 }
      );
    }

    // Try to spawn the process and check if it starts
    return new Promise<Response>((resolve) => {
      const timeout = setTimeout(() => {
        child.kill();
        resolve(NextResponse.json({
          success: true,
          status: "timeout",
          message: "Server started but did not respond within 5 seconds",
        }));
      }, 5000);

      const child = spawn(server.command, server.args || [], {
        env: { ...process.env, ...server.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        resolve(NextResponse.json({
          success: false,
          status: "error",
          message: error.message,
        }));
      });

      child.on("spawn", () => {
        // Process spawned successfully, wait a bit for output
        setTimeout(() => {
          clearTimeout(timeout);
          child.kill();
          resolve(NextResponse.json({
            success: true,
            status: "connected",
            message: "Server started successfully",
            output: stdout || stderr || "No output",
          }));
        }, 2000);
      });

      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code !== null && code !== 0) {
          resolve(NextResponse.json({
            success: false,
            status: "error",
            message: `Server exited with code ${code}`,
            output: stderr || stdout,
          }));
        }
      });
    });
  } catch (error) {
    console.error("Failed to test MCP server:", error);
    return NextResponse.json(
      { error: "Failed to test MCP server" },
      { status: 500 }
    );
  }
}
