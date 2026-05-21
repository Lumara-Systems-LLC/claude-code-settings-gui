import { randomBytes } from "crypto";

// In-memory single-use tokens that authorize revealing one specific sensitive
// file. Tokens expire after TTL_MS and are consumed on first valid use.
// This is process-local — it would NOT survive a serverless cold start, but
// the GUI is intended to run as a long-lived local process.

type Entry = { path: string; expiresAt: number };

const TTL_MS = 60_000; // 60 seconds — enough to click through a confirm modal
const tokens = new Map<string, Entry>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [token, entry] of tokens) {
    if (entry.expiresAt <= now) {
      tokens.delete(token);
    }
  }
}

export function issueRevealToken(path: string): { token: string; expiresAt: number } {
  purgeExpired();
  const token = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + TTL_MS;
  tokens.set(token, { path, expiresAt });
  return { token, expiresAt };
}

export function consumeRevealToken(token: string, path: string): boolean {
  purgeExpired();
  const entry = tokens.get(token);
  if (!entry) return false;
  if (entry.path !== path) return false;
  if (entry.expiresAt <= Date.now()) {
    tokens.delete(token);
    return false;
  }
  tokens.delete(token);
  return true;
}
