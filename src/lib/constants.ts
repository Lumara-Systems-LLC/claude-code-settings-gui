import { homedir } from "os";
import { join } from "path";

// Base path for Claude configuration
export const CLAUDE_DIR = join(homedir(), ".claude");

// Core configuration files
export const PATHS = {
  CLAUDE_MD: join(CLAUDE_DIR, "CLAUDE.md"),
  SETTINGS_JSON: join(CLAUDE_DIR, "settings.json"),
  README: join(CLAUDE_DIR, "README.md"),
  RULES_DIR: join(CLAUDE_DIR, "rules"),
  SKILLS_DIR: join(CLAUDE_DIR, "skills"),
  AGENTS_DIR: join(CLAUDE_DIR, "agents"),
  HOOKS_DIR: join(CLAUDE_DIR, "hooks"),
  TEMPLATES_DIR: join(CLAUDE_DIR, "templates"),
  PROMPTS_DIR: join(CLAUDE_DIR, "prompts"),
  COMMANDS_DIR: join(CLAUDE_DIR, "commands"),
  SCRIPTS_DIR: join(CLAUDE_DIR, "scripts"),
  PROJECTS_DIR: join(CLAUDE_DIR, "projects"),
  HOOK_METRICS: join(CLAUDE_DIR, "hooks", "hook-metrics.jsonl"),
} as const;

// Navigation items for sidebar
export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    title: "Settings",
    items: [
      { title: "CLAUDE.md", href: "/claude-md", icon: "FileText" },
      { title: "settings.json", href: "/settings-json", icon: "Settings" },
      { title: "README", href: "/readme", icon: "BookOpen" },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Rules", href: "/rules", icon: "Scale" },
      { title: "Skills", href: "/skills", icon: "Wand2" },
      { title: "Agents", href: "/agents", icon: "Bot" },
      { title: "Hooks", href: "/hooks", icon: "Webhook" },
      { title: "Templates", href: "/templates", icon: "FileCode" },
      { title: "Prompts", href: "/prompts", icon: "MessageSquare" },
    ],
  },
  {
    title: "System",
    items: [
      { title: "MCP Servers", href: "/mcp-servers", icon: "Server" },
      { title: "Storage", href: "/storage", icon: "HardDrive" },
      { title: "Projects", href: "/projects", icon: "FolderOpen" },
      { title: "Git", href: "/git", icon: "GitBranch" },
    ],
  },
] as const;

// Hook event types
export const HOOK_EVENTS = [
  "SessionStart",
  "Stop",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
] as const;

// Agent model types
export const AGENT_MODELS = ["sonnet", "opus", "haiku"] as const;
