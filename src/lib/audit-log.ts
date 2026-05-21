import { promises as fs } from "fs";
import { join } from "path";
import { CLAUDE_DIR } from "./constants";

export type AuditAction = "write" | "delete" | "create";

export type AuditEntry = {
  timestamp: number;
  action: AuditAction;
  path: string;
  size?: number;
};

const AUDIT_LOG_PATH = join(CLAUDE_DIR, ".gui-audit.jsonl");

/**
 * Append an audit entry. Best-effort: failures don't propagate to callers.
 */
export async function logAudit(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
  const full: AuditEntry = { ...entry, timestamp: Date.now() };
  try {
    await fs.appendFile(AUDIT_LOG_PATH, JSON.stringify(full) + "\n", "utf-8");
  } catch {
    // Audit logging is best-effort; ignore filesystem failures
  }
}

export const AUDIT_LOG_FILE = AUDIT_LOG_PATH;
