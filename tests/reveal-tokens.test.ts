import { describe, it, expect } from "vitest";
import { issueRevealToken, consumeRevealToken } from "../src/lib/reveal-tokens";

describe("reveal-tokens", () => {
  it("issues a token that can be consumed once for the matching path", () => {
    const { token } = issueRevealToken("/home/u/.claude/.env");
    expect(consumeRevealToken(token, "/home/u/.claude/.env")).toBe(true);
  });

  it("refuses to consume the same token twice (single-use)", () => {
    const { token } = issueRevealToken("/home/u/.claude/.env");
    expect(consumeRevealToken(token, "/home/u/.claude/.env")).toBe(true);
    expect(consumeRevealToken(token, "/home/u/.claude/.env")).toBe(false);
  });

  it("refuses to consume a token for a different path than it was issued for", () => {
    const { token } = issueRevealToken("/home/u/.claude/.env");
    expect(consumeRevealToken(token, "/home/u/.claude/other.env")).toBe(false);
  });

  it("refuses an unknown token", () => {
    expect(consumeRevealToken("not-a-real-token", "/home/u/.claude/.env")).toBe(false);
  });

  it("returns an ISO-ish expiresAt in the near future", () => {
    const before = Date.now();
    const { expiresAt } = issueRevealToken("/home/u/.claude/.env");
    expect(expiresAt).toBeGreaterThan(before);
    expect(expiresAt).toBeLessThan(before + 5 * 60 * 1000);
  });
});
