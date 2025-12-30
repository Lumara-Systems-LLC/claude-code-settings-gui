#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT_DIR = path.join(__dirname, "..");
const PORT = process.env.PORT || 3000;

console.log("🚀 Starting Claude Code Settings GUI...\n");

// Check if node_modules exists, if not run npm install
const nodeModulesPath = path.join(ROOT_DIR, "node_modules");
if (!fs.existsSync(nodeModulesPath)) {
  console.log("📦 Installing dependencies (first run only)...\n");
  const install = spawn("npm", ["install"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
  });

  install.on("close", (code) => {
    if (code !== 0) {
      console.error("❌ Failed to install dependencies");
      process.exit(1);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  console.log(`🌐 Starting server on http://localhost:${PORT}\n`);

  const server = spawn("npm", ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT },
  });

  // Open browser after a short delay
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    const openCommand =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";

    spawn(openCommand, [url], { shell: true });
  }, 2000);

  server.on("close", (code) => {
    process.exit(code);
  });

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    server.kill("SIGINT");
    process.exit(0);
  });
}
