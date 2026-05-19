#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const ROOT_DIR = path.join(__dirname, "..");

function parseArgs(argv) {
  const args = { configDir: null, port: null, help: false, demo: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a === "--demo") {
      args.demo = true;
    } else if (a === "--config-dir" || a === "-c") {
      args.configDir = argv[++i];
    } else if (a.startsWith("--config-dir=")) {
      args.configDir = a.split("=")[1];
    } else if (a === "--port" || a === "-p") {
      args.port = argv[++i];
    } else if (a.startsWith("--port=")) {
      args.port = a.split("=")[1];
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Claude Code Settings GUI — visual manager for your Claude Code configuration.

Usage:
  claude-code-settings-gui [options]

Options:
  -c, --config-dir <path>   Claude config directory (default: \$CLAUDE_CONFIG_DIR or ~/.claude)
  -p, --port <port>         Port to bind (default: \$PORT or 3000)
      --demo                Run in demo mode (read-only, fake data)
  -h, --help                Show this help

Environment:
  CLAUDE_CONFIG_DIR         Same as --config-dir
  PORT                      Same as --port
  NEXT_PUBLIC_DEMO_MODE     Set to "true" for demo mode

Examples:
  npx claude-code-settings-gui
  npx claude-code-settings-gui --config-dir ~/work/.claude
  CLAUDE_CONFIG_DIR=/data/.claude npx claude-code-settings-gui --port 4000
`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const configDir = args.configDir || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const port = args.port || process.env.PORT || 3000;
const demoMode = args.demo || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const childEnv = {
  ...process.env,
  CLAUDE_CONFIG_DIR: configDir,
  PORT: String(port),
};
if (demoMode) {
  childEnv.NEXT_PUBLIC_DEMO_MODE = "true";
}

console.log("Claude Code Settings GUI");
console.log(`  config dir: ${configDir}${fs.existsSync(configDir) ? "" : "  (does not exist yet)"}`);
console.log(`  port:       ${port}`);
if (demoMode) console.log("  mode:       demo (read-only)");
console.log("");

const nodeModulesPath = path.join(ROOT_DIR, "node_modules");
if (!fs.existsSync(nodeModulesPath)) {
  console.log("Installing dependencies (first run only)...\n");
  const install = spawn("npm", ["install"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
  });

  install.on("close", (code) => {
    if (code !== 0) {
      console.error("Failed to install dependencies");
      process.exit(1);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  console.log(`Starting server on http://localhost:${port}\n`);

  const server = spawn("npm", ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
    env: childEnv,
  });

  setTimeout(() => {
    const url = `http://localhost:${port}`;
    const openCommand =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";

    spawn(openCommand, [url], { shell: true, stdio: "ignore" }).on("error", () => {
      // Browser launch is best-effort; ignore failures
    });
  }, 2000);

  server.on("close", (code) => {
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => {
    server.kill("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.kill("SIGTERM");
    process.exit(0);
  });
}
