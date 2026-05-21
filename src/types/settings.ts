export type PermissionPattern = string;

export type Permission = {
  allow: PermissionPattern[];
  deny: PermissionPattern[];
  ask?: PermissionPattern[];
  additionalDirectories?: string[];
};

export type MCPServerType = "sse" | "stdio";

export type MCPServer = {
  type?: MCPServerType;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

export type HookType = "command" | "prompt";

export type HookDefinition = {
  type: HookType;
  command?: string;
  prompt?: string;
  timeout?: number;
};

export type HookMatcher = {
  matcher?: string;
  hooks: HookDefinition[];
};

export type HookEvent =
  | "SessionStart"
  | "Stop"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCompact"
  | "PostToolUseFailure";

export type Hooks = Partial<Record<HookEvent, HookMatcher[]>>;

export type ClaudeModel = "opus" | "sonnet" | "haiku" | string;

export type StatusLine = {
  type?: "command" | "static";
  command?: string;
  text?: string;
};

export type Attribution = {
  commit?: string;
  pr?: string;
};

export type Settings = {
  model?: ClaudeModel;
  permissions: Permission;
  mcpServers: Record<string, MCPServer>;
  alwaysThinkingEnabled?: boolean;
  enableAgentTeams?: boolean;
  enabledPlugins?: Record<string, boolean>;
  statusLine?: StatusLine;
  hooks: Hooks;
  attribution?: Attribution;
};
