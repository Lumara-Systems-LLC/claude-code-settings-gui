import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const execAsync = promisify(exec);
const CLAUDE_DIR = join(homedir(), ".claude");

// Supported import sources
const GITHUB_RAW_PATTERN = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/;
const GITHUB_BLOB_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;
const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;

interface ImportResult {
  success: boolean;
  source: string;
  type: "file" | "archive" | "repo";
  createdFiles: string[];
  errors: string[];
}

// POST - Import from URL
export async function POST(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: "Cannot import in demo mode" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { url, mode = "merge" } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Create .claude directory if needed
    await fs.mkdir(CLAUDE_DIR, { recursive: true });

    const result: ImportResult = {
      success: false,
      source: url,
      type: "file",
      createdFiles: [],
      errors: [],
    };

    // Check if it's a GitHub repo URL (clone .claude directory)
    const repoMatch = url.match(GITHUB_REPO_PATTERN);
    if (repoMatch) {
      const [, owner, repo] = repoMatch;
      result.type = "repo";

      // Try to fetch .claude directory contents from the repo
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.claude`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ClaudeCodeSettingsGUI",
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return NextResponse.json(
              { error: "Repository does not have a .claude directory" },
              { status: 404 }
            );
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const contents = await response.json();

        // Recursively download files
        await downloadGitHubDirectory(owner, repo, ".claude", CLAUDE_DIR, mode, result);
        result.success = result.createdFiles.length > 0;
      } catch (error) {
        result.errors.push(`Failed to access repository: ${error}`);
      }

      return NextResponse.json(result);
    }

    // Check if it's a GitHub file URL
    let rawUrl = url;
    const blobMatch = url.match(GITHUB_BLOB_PATTERN);
    if (blobMatch) {
      const [, owner, repo, branch, path] = blobMatch;
      rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    }

    // Check if it's a tar.gz archive
    if (rawUrl.endsWith(".tar.gz") || rawUrl.endsWith(".tgz")) {
      result.type = "archive";

      const tempDir = join(CLAUDE_DIR, `.import-temp-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // Download and extract archive
        const tempArchive = join(tempDir, "import.tar.gz");
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(tempArchive, buffer);

        // Extract
        await execAsync(`cd "${tempDir}" && tar -xzf import.tar.gz`);

        // Copy files to .claude
        const entries = await fs.readdir(tempDir);
        for (const entry of entries) {
          if (entry === "import.tar.gz" || entry === ".backup-info.json") continue;

          const sourcePath = join(tempDir, entry);
          const destPath = join(CLAUDE_DIR, entry);

          // In merge mode, skip existing
          if (mode === "merge") {
            try {
              await fs.access(destPath);
              continue;
            } catch {
              // Doesn't exist, proceed
            }
          }

          await fs.cp(sourcePath, destPath, { recursive: true });
          result.createdFiles.push(entry);
        }

        result.success = true;
      } catch (error) {
        result.errors.push(`Archive import failed: ${error}`);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }

      return NextResponse.json(result);
    }

    // Single file import (markdown or JSON)
    if (rawUrl.endsWith(".md") || rawUrl.endsWith(".json")) {
      result.type = "file";

      try {
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }
        const content = await response.text();

        // Determine destination based on file name
        const filename = rawUrl.split("/").pop() || "imported.md";
        let destPath: string;

        if (filename === "CLAUDE.md") {
          destPath = join(CLAUDE_DIR, "CLAUDE.md");
        } else if (filename === "settings.json") {
          destPath = join(CLAUDE_DIR, "settings.json");
        } else if (filename.endsWith(".md")) {
          // Assume it's a rule
          await fs.mkdir(join(CLAUDE_DIR, "rules"), { recursive: true });
          destPath = join(CLAUDE_DIR, "rules", filename);
        } else {
          destPath = join(CLAUDE_DIR, filename);
        }

        // Check if exists in merge mode
        if (mode === "merge") {
          try {
            await fs.access(destPath);
            result.errors.push(`File ${filename} already exists (skipped in merge mode)`);
            return NextResponse.json(result);
          } catch {
            // Doesn't exist, proceed
          }
        }

        await fs.writeFile(destPath, content, "utf-8");
        result.createdFiles.push(filename);
        result.success = true;
      } catch (error) {
        result.errors.push(`File import failed: ${error}`);
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Unsupported URL format. Use GitHub repo URLs, .tar.gz archives, or .md/.json files." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to import from URL:", error);
    return NextResponse.json(
      { error: "Failed to import from URL" },
      { status: 500 }
    );
  }
}

// Recursively download GitHub directory contents
async function downloadGitHubDirectory(
  owner: string,
  repo: string,
  remotePath: string,
  localPath: string,
  mode: string,
  result: ImportResult
) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${remotePath}`;

  const response = await fetch(apiUrl, {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "ClaudeCodeSettingsGUI",
    },
  });

  if (!response.ok) {
    result.errors.push(`Failed to list ${remotePath}: ${response.status}`);
    return;
  }

  const contents = await response.json();

  for (const item of contents) {
    const relativePath = item.path.replace(/^\.claude\/?/, "");
    const itemLocalPath = join(localPath, relativePath);

    if (item.type === "dir") {
      await fs.mkdir(itemLocalPath, { recursive: true });
      await downloadGitHubDirectory(owner, repo, item.path, localPath, mode, result);
    } else if (item.type === "file") {
      // Check if exists in merge mode
      if (mode === "merge") {
        try {
          await fs.access(itemLocalPath);
          continue; // Skip existing
        } catch {
          // Doesn't exist, proceed
        }
      }

      // Download file
      try {
        const fileResponse = await fetch(item.download_url);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          await fs.mkdir(join(itemLocalPath, ".."), { recursive: true });
          await fs.writeFile(itemLocalPath, content, "utf-8");
          result.createdFiles.push(relativePath);
        }
      } catch (error) {
        result.errors.push(`Failed to download ${relativePath}: ${error}`);
      }
    }
  }
}
