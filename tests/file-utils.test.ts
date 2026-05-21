import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// Point CLAUDE_DIR at a temp dir before importing the module-under-test.
// Static imports get hoisted, so we set the env synchronously here and then
// import the modules dynamically below.
const TEST_DIR = join(tmpdir(), `claude-gui-test-${process.pid}-${Date.now()}`);
process.env.CLAUDE_CONFIG_DIR = TEST_DIR;

const fileUtils = await import("../src/lib/file-utils");
const constants = await import("../src/lib/constants");

describe("file-utils", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("CLAUDE_DIR resolution", () => {
    it("respects CLAUDE_CONFIG_DIR env var", () => {
      expect(constants.CLAUDE_DIR).toBe(TEST_DIR);
    });
  });

  describe("validatePath", () => {
    it("accepts paths inside CLAUDE_DIR", () => {
      expect(fileUtils.validatePath(join(TEST_DIR, "settings.json"))).toBe(true);
      expect(fileUtils.validatePath(join(TEST_DIR, "rules", "core.md"))).toBe(true);
    });

    it("rejects paths outside CLAUDE_DIR", () => {
      expect(fileUtils.validatePath("/etc/passwd")).toBe(false);
      expect(fileUtils.validatePath("/tmp/something-else")).toBe(false);
    });
  });

  describe("isSensitive", () => {
    it("flags .env files", () => {
      expect(fileUtils.isSensitive("/foo/.env")).toBe(true);
      expect(fileUtils.isSensitive("/foo/.env.production")).toBe(true);
      expect(fileUtils.isSensitive("/foo/.env.local")).toBe(true);
    });

    it("flags credential files", () => {
      expect(fileUtils.isSensitive("/foo/.credentials.json")).toBe(true);
    });

    it("flags key/pem/cert files", () => {
      expect(fileUtils.isSensitive("/foo/server.key")).toBe(true);
      expect(fileUtils.isSensitive("/foo/cert.pem")).toBe(true);
      expect(fileUtils.isSensitive("/foo/keystore.p12")).toBe(true);
    });

    it("flags filenames containing secret/token/password", () => {
      expect(fileUtils.isSensitive("/foo/my-secret-config.json")).toBe(true);
      expect(fileUtils.isSensitive("/foo/api_token.txt")).toBe(true);
      expect(fileUtils.isSensitive("/foo/password.list")).toBe(true);
    });

    it("does not flag normal files", () => {
      expect(fileUtils.isSensitive("/foo/CLAUDE.md")).toBe(false);
      expect(fileUtils.isSensitive("/foo/settings.json")).toBe(false);
      expect(fileUtils.isSensitive("/foo/rules/core.md")).toBe(false);
      expect(fileUtils.isSensitive("/foo/skills/commit/SKILL.md")).toBe(false);
    });

    it("does not match 'token' as part of another word", () => {
      expect(fileUtils.isSensitive("/foo/tokenizer-config.json")).toBe(false);
      expect(fileUtils.isSensitive("/foo/broken-config.md")).toBe(false);
    });
  });

  describe("read/write roundtrip", () => {
    beforeEach(async () => {
      await fs.rm(join(TEST_DIR, "test-roundtrip.md"), { force: true });
    });

    it("writes then reads back", async () => {
      const target = join(TEST_DIR, "test-roundtrip.md");
      await fileUtils.writeFile(target, "hello world", false);
      const content = await fileUtils.readFile(target);
      expect(content).toBe("hello world");
    });

    it("creates a backup on overwrite", async () => {
      const target = join(TEST_DIR, "test-backup.md");
      await fileUtils.writeFile(target, "original", false);
      await fileUtils.writeFile(target, "updated", true);

      const entries = await fs.readdir(TEST_DIR);
      const backup = entries.find((e) => e.startsWith("test-backup.md.backup."));
      expect(backup).toBeDefined();

      const backupContent = await fs.readFile(join(TEST_DIR, backup!), "utf-8");
      expect(backupContent).toBe("original");
    });

    it("refuses to write outside CLAUDE_DIR", async () => {
      await expect(
        fileUtils.writeFile("/tmp/outside-claude.md", "x", false)
      ).rejects.toThrow(/within/);
    });
  });
});
