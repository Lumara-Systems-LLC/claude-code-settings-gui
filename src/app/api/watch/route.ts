import { NextRequest } from "next/server";
import { watch, FSWatcher } from "fs";
import { join } from "path";
import { homedir } from "os";
import { IS_DEMO_MODE } from "@/lib/demo-data";

const CLAUDE_DIR = join(homedir(), ".claude");

// Track active watchers by connection
const activeWatchers = new Map<string, FSWatcher[]>();

export async function GET(request: NextRequest) {
  // In demo mode, return a simple keep-alive stream
  if (IS_DEMO_MODE) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(`data: ${JSON.stringify({ type: "connected", demo: true })}\n\n`);

        // Send heartbeat every 30 seconds
        const interval = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
          } catch {
            clearInterval(interval);
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const connectionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const watchers: FSWatcher[] = [];
      const watchDirs = ["skills", "agents", "rules", "hooks", "prompts", "templates"];

      // Debounce to avoid duplicate events
      const eventQueue = new Map<string, NodeJS.Timeout>();

      const sendEvent = (type: string, path: string, category: string) => {
        const key = `${type}:${path}`;

        // Clear existing timeout for this event
        if (eventQueue.has(key)) {
          clearTimeout(eventQueue.get(key)!);
        }

        // Debounce for 100ms
        eventQueue.set(key, setTimeout(() => {
          try {
            const event = JSON.stringify({ type, path, category, timestamp: Date.now() });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          } catch {
            // Connection closed
          }
          eventQueue.delete(key);
        }, 100));
      };

      // Send connected event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", connectionId })}\n\n`));

      // Watch each directory
      for (const dir of watchDirs) {
        const watchPath = join(CLAUDE_DIR, dir);
        try {
          const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename) {
              sendEvent(eventType, filename, dir);
            }
          });

          watcher.on("error", (error) => {
            console.error(`Watch error for ${dir}:`, error);
          });

          watchers.push(watcher);
        } catch (error) {
          // Directory might not exist yet, that's ok
          console.log(`Could not watch ${dir}:`, error);
        }
      }

      // Also watch CLAUDE.md and settings.json
      try {
        const claudeMdWatcher = watch(join(CLAUDE_DIR, "CLAUDE.md"), (eventType) => {
          sendEvent(eventType, "CLAUDE.md", "root");
        });
        watchers.push(claudeMdWatcher);
      } catch {
        // File might not exist
      }

      try {
        const settingsWatcher = watch(join(CLAUDE_DIR, "settings.json"), (eventType) => {
          sendEvent(eventType, "settings.json", "root");
        });
        watchers.push(settingsWatcher);
      } catch {
        // File might not exist
      }

      // Store watchers for cleanup
      activeWatchers.set(connectionId, watchers);

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);

        // Clear pending events
        for (const timeout of eventQueue.values()) {
          clearTimeout(timeout);
        }

        // Close all watchers
        const connectionWatchers = activeWatchers.get(connectionId);
        if (connectionWatchers) {
          for (const watcher of connectionWatchers) {
            watcher.close();
          }
          activeWatchers.delete(connectionId);
        }

        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Connection-Id": connectionId,
    },
  });
}
