export type HookMetric = {
  hook: string;
  duration_ms: number;
  exit_code: number;
  result: "success" | "failure";
  tool: string;
  project: string;
  timestamp: string;
};

export type HookMetricsSummary = {
  hookName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  lastExecution: string;
};

export type HookScript = {
  name: string;
  path: string;
  content: string;
  size: number;
  lastModified: string;
};

export type HookListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  enabled: boolean;
};
