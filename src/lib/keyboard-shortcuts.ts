// Map of single-key codes pressed after `g` to routes.
// Matches the vim-style g-jump convention.
export const G_JUMP_SHORTCUTS: Record<string, { route: string; label: string }> = {
  d: { route: "/", label: "Dashboard" },
  c: { route: "/config/claude-md", label: "CLAUDE.md" },
  j: { route: "/config/settings-json", label: "settings.json" },
  l: { route: "/config/settings-local", label: "settings.local.json" },
  r: { route: "/artifacts/rules", label: "Rules" },
  s: { route: "/artifacts/skills", label: "Skills" },
  a: { route: "/artifacts/agents", label: "Agents" },
  h: { route: "/artifacts/hooks", label: "Hooks" },
  m: { route: "/artifacts/commands", label: "Commands" },
  o: { route: "/artifacts/output-styles", label: "Output Styles" },
  w: { route: "/artifacts/workflows", label: "Workflows" },
  t: { route: "/artifacts/templates", label: "Templates" },
  p: { route: "/artifacts/prompts", label: "Prompts" },
  n: { route: "/data/plans", label: "Plans" },
  f: { route: "/data/files", label: "Files" },
  u: { route: "/insights/usage-stats", label: "Usage Stats" },
  b: { route: "/data/backups", label: "Backups" },
  i: { route: "/insights/commands-index", label: "Slash Commands Index" },
  v: { route: "/insights/audit", label: "Audit Log" },
  x: { route: "/data/storage", label: "Storage" },
  g: { route: "/integrations/git", label: "Git" },
};

export type ShortcutBinding = {
  combo: string;
  description: string;
};

export const GLOBAL_SHORTCUTS: ShortcutBinding[] = [
  { combo: "⌘K", description: "Open command palette" },
  { combo: "?", description: "Show this help" },
  { combo: "esc", description: "Close dialog / clear g-prefix" },
  ...Object.entries(G_JUMP_SHORTCUTS).map(([key, info]) => ({
    combo: `g ${key}`,
    description: `Jump to ${info.label}`,
  })),
];
