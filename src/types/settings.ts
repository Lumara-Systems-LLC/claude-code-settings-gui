export type PermissionPattern = string;

export type Permission = {
  allow: PermissionPattern[];
  deny: PermissionPattern[];
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
  | "PostToolUse";

export type Hooks = Partial<Record<HookEvent, HookMatcher[]>>;

export type Settings = {
  permissions: Permission;
  mcpServers: Record<string, MCPServer>;
  alwaysThinkingEnabled?: boolean;
  hooks: Hooks;
  attribution?: {
    commit?: string;
    pr?: string;
  };
};
