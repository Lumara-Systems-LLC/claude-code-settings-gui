"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Settings,
  Server,
  HardDrive,
  Webhook,
  ScrollText,
} from "lucide-react";
import { LauncherTile } from "./launcher-tile";

type McpServersResponse = {
  servers: Record<string, unknown>;
  count: number;
};

export function QuickLauncher() {
  const { data: mcp } = useQuery<McpServersResponse>({
    queryKey: ["mcp-servers"],
    queryFn: async () => {
      const res = await fetch("/api/mcp-servers");
      if (!res.ok) throw new Error("Failed to fetch MCP servers");
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <Card data-tour-step="quick-actions">
      <CardHeader>
        <CardTitle>Quick Launcher</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <LauncherTile
            href="/config/claude-md"
            icon={<FileText className="h-5 w-5" />}
            title="CLAUDE.md"
            subtitle="Global rules"
          />
          <LauncherTile
            href="/config/settings-json"
            icon={<Settings className="h-5 w-5" />}
            title="settings.json"
            subtitle="Permissions & hooks"
          />
          <LauncherTile
            href="/integrations/mcp-servers"
            icon={<Server className="h-5 w-5" />}
            title="MCP Servers"
            subtitle="External integrations"
            badge={mcp?.count}
          />
          <LauncherTile
            href="/data/storage"
            icon={<HardDrive className="h-5 w-5" />}
            title="Storage"
            subtitle="Disk usage & cleanup"
          />
          <LauncherTile
            href="/artifacts/hooks"
            icon={<Webhook className="h-5 w-5" />}
            title="Hooks"
            subtitle="Event handlers"
          />
          <LauncherTile
            href="/insights/audit"
            icon={<ScrollText className="h-5 w-5" />}
            title="Audit Log"
            subtitle="Change history"
          />
        </div>
      </CardContent>
    </Card>
  );
}
