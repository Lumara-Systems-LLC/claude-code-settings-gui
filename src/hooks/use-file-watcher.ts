"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface FileWatchEvent {
  type: "connected" | "change" | "rename" | "heartbeat";
  path?: string;
  category?: string;
  timestamp?: number;
  connectionId?: string;
  demo?: boolean;
}

interface UseFileWatcherOptions {
  enabled?: boolean;
  onEvent?: (event: FileWatchEvent) => void;
}

// Map categories to query keys
const CATEGORY_QUERY_KEYS: Record<string, string[]> = {
  skills: ["skills", "skill"],
  agents: ["agents", "agent"],
  rules: ["rules", "rule"],
  hooks: ["hooks", "hook"],
  prompts: ["prompts", "prompt"],
  templates: ["templates"],
  root: ["claude-md", "settings"],
};

export function useFileWatcher(options: UseFileWatcherOptions = {}) {
  const { enabled = true, onEvent } = options;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/watch");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: FileWatchEvent = JSON.parse(event.data);

        // Call custom handler
        onEvent?.(data);

        // Handle file changes by invalidating queries
        if (data.type === "change" || data.type === "rename") {
          const queryKeys = data.category ? CATEGORY_QUERY_KEYS[data.category] : [];

          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }

          // Also invalidate stats for any change
          queryClient.invalidateQueries({ queryKey: ["stats"] });
        }
      } catch (error) {
        console.error("Failed to parse file watch event:", error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);

      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled) {
          connect();
        }
      }, delay);
    };
  }, [enabled, onEvent, queryClient]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled, connect]);

  return {
    isConnected,
  };
}
