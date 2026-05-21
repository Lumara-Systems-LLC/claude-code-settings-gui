import { promises as fs } from "fs";
import { join, dirname, basename } from "path";
import { CLAUDE_DIR } from "./constants";
import { logAudit } from "./audit-log";

// Filenames matching these patterns are treated as sensitive and only
// served by /api/files when the caller presents a valid reveal token.
const SENSITIVE_FILENAME_PATTERNS: readonly RegExp[] = [
  /^\.env(\..+)?$/i,
  /^\.credentials\.json$/i,
  /\.key$/i,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /(^|[._-])secrets?([._-]|$)/i,
  /(^|[._-])tokens?([._-]|$)/i,
  /(^|[._-])passwords?([._-]|$)/i,
  /\.gpg$/i,
  /\.asc$/i,
];

export function isSensitive(path: string): boolean {
  const name = basename(path);
  return SENSITIVE_FILENAME_PATTERNS.some((re) => re.test(name));
}

export function validatePath(path: string): boolean {
  const normalizedPath = join(path);
  return normalizedPath.startsWith(CLAUDE_DIR);
}

export async function createBackup(path: string): Promise<string | null> {
  try {
    const content = await fs.readFile(path, "utf-8");
    const backupPath = `${path}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, content, "utf-8");
    return backupPath;
  } catch {
    return null;
  }
}

export async function readFile(path: string): Promise<string> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }
  return fs.readFile(path, "utf-8");
}

export async function writeFile(
  path: string,
  content: string,
  createBackupFirst = true
): Promise<void> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }

  await fs.mkdir(dirname(path), { recursive: true });

  if (createBackupFirst) {
    try {
      await fs.access(path);
      await createBackup(path);
    } catch {
      // File doesn't exist, no backup needed
    }
  }

  const tempPath = `${path}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, path);
  // Audit the write (best-effort; doesn't fail the caller)
  if (!path.endsWith(".gui-audit.jsonl") && !path.includes(".backup.")) {
    await logAudit({ action: "write", path, size: content.length });
  }
}

export async function deleteFile(path: string): Promise<void> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }
  await fs.unlink(path);
  if (!path.endsWith(".gui-audit.jsonl") && !path.includes(".backup.")) {
    await logAudit({ action: "delete", path });
  }
}

export async function listDirectory(
  path: string,
  options?: { recursive?: boolean; filter?: (name: string) => boolean }
): Promise<string[]> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }

  const entries = await fs.readdir(path, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (options?.filter && !options.filter(entry.name)) {
      continue;
    }

    if (entry.isDirectory() && options?.recursive) {
      const subFiles = await listDirectory(fullPath, options);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function getFileStats(path: string): Promise<{
  size: number;
  sizeHuman: string;
  lastModified: Date;
  isDirectory: boolean;
}> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }

  const stats = await fs.stat(path);
  return {
    size: stats.size,
    sizeHuman: formatBytes(stats.size),
    lastModified: stats.mtime,
    isDirectory: stats.isDirectory(),
  };
}

export async function getDirectorySize(path: string): Promise<{
  sizeBytes: number;
  sizeHuman: string;
  itemCount: number;
}> {
  if (!validatePath(path)) {
    throw new Error(`Path must be within ${CLAUDE_DIR} directory`);
  }

  let totalSize = 0;
  let itemCount = 0;

  async function walkDir(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          itemCount++;
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await walkDir(path);
  return {
    sizeBytes: totalSize,
    sizeHuman: formatBytes(totalSize),
    itemCount,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
