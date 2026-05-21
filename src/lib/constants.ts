import { homedir } from "os";
import { join } from "path";

// Resolution order:
//   1. CLAUDE_CONFIG_DIR env var (matches Claude Code's own convention)
//   2. ~/.claude (default)
// Evaluated once at module load — restart the process after changing the env var.
function resolveClaudeDir(): string {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return join(homedir(), ".claude");
}

export const CLAUDE_DIR = resolveClaudeDir();

export const PATHS = {
  CLAUDE_MD: join(CLAUDE_DIR, "CLAUDE.md"),
  SETTINGS_JSON: join(CLAUDE_DIR, "settings.json"),
  SETTINGS_LOCAL_JSON: join(CLAUDE_DIR, "settings.local.json"),
  README: join(CLAUDE_DIR, "README.md"),
  SYSTEM_ARCHITECTURE: join(CLAUDE_DIR, "SYSTEM_ARCHITECTURE.md"),
  HOST_MD: join(CLAUDE_DIR, "HOST.md"),
  RULES_DIR: join(CLAUDE_DIR, "rules"),
  SKILLS_DIR: join(CLAUDE_DIR, "skills"),
  AGENTS_DIR: join(CLAUDE_DIR, "agents"),
  HOOKS_DIR: join(CLAUDE_DIR, "hooks"),
  TEMPLATES_DIR: join(CLAUDE_DIR, "templates"),
  PROMPTS_DIR: join(CLAUDE_DIR, "prompts"),
  COMMANDS_DIR: join(CLAUDE_DIR, "commands"),
  OUTPUT_STYLES_DIR: join(CLAUDE_DIR, "output-styles"),
  WORKFLOWS_DIR: join(CLAUDE_DIR, "workflows"),
  PLANS_DIR: join(CLAUDE_DIR, "plans"),
  TASKS_DIR: join(CLAUDE_DIR, "tasks"),
  TODOS_DIR: join(CLAUDE_DIR, "todos"),
  PLUGINS_DIR: join(CLAUDE_DIR, "plugins"),
  PROJECTS_DIR: join(CLAUDE_DIR, "projects"),
  SCRIPTS_DIR: join(CLAUDE_DIR, "scripts"),
  BACKUPS_DIR: join(CLAUDE_DIR, "backups"),
  CACHE_DIR: join(CLAUDE_DIR, "cache"),
  HOOK_METRICS: join(CLAUDE_DIR, "hook-metrics.jsonl"),
  HISTORY_JSONL: join(CLAUDE_DIR, "history.jsonl"),
  STATS_CACHE: join(CLAUDE_DIR, "stats-cache.json"),
  COMMAND_INDEX: join(CLAUDE_DIR, "command-index.json"),
  MCP_NEEDS_AUTH: join(CLAUDE_DIR, "mcp-needs-auth-cache.json"),
} as const;

export const HOOK_EVENTS = [
  "SessionStart",
  "Stop",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
] as const;

export const AGENT_MODELS = ["sonnet", "opus", "haiku"] as const;
