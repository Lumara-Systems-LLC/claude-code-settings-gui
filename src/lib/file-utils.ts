import { promises as fs } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

const CLAUDE_DIR = join(homedir(), ".claude");

/**
 * Validates that a path is within the ~/.claude directory
 */
export function validatePath(path: string): boolean {
  const normalizedPath = join(path);
  return normalizedPath.startsWith(CLAUDE_DIR);
}

/**
 * Creates a backup of a file before modifying it
 */
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

/**
 * Reads a file and returns its content
 */
export async function readFile(path: string): Promise<string> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
  }
  return fs.readFile(path, "utf-8");
}

/**
 * Writes content to a file with optional backup
 */
export async function writeFile(
  path: string,
  content: string,
  createBackupFirst = true
): Promise<void> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
  }

  // Ensure directory exists
  await fs.mkdir(dirname(path), { recursive: true });

  // Create backup if requested and file exists
  if (createBackupFirst) {
    try {
      await fs.access(path);
      await createBackup(path);
    } catch {
      // File doesn't exist, no backup needed
    }
  }

  // Write atomically by writing to temp file first
  const tempPath = `${path}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, path);
}

/**
 * Deletes a file
 */
export async function deleteFile(path: string): Promise<void> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
  }
  await fs.unlink(path);
}

/**
 * Lists files in a directory
 */
export async function listDirectory(
  path: string,
  options?: { recursive?: boolean; filter?: (name: string) => boolean }
): Promise<string[]> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
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

/**
 * Gets file stats
 */
export async function getFileStats(path: string): Promise<{
  size: number;
  sizeHuman: string;
  lastModified: Date;
  isDirectory: boolean;
}> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
  }

  const stats = await fs.stat(path);
  return {
    size: stats.size,
    sizeHuman: formatBytes(stats.size),
    lastModified: stats.mtime,
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Gets directory size recursively
 */
export async function getDirectorySize(path: string): Promise<{
  sizeBytes: number;
  sizeHuman: string;
  itemCount: number;
}> {
  if (!validatePath(path)) {
    throw new Error("Path must be within ~/.claude directory");
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

/**
 * Formats bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Checks if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
