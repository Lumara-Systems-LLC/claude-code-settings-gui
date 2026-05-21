"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Wand2,
  Bot,
  Webhook,
  ExternalLink,
} from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { helpContent } from "@/lib/help-content";
import { ConfigStatusBanner } from "@/components/config-status-banner";
import { DocsGenerationBanner } from "@/components/docs-generation-banner";
import { StatsCard } from "./stats-card";
import { HealthStrip } from "./health-strip";
import { QuickLauncher } from "./quick-launcher";
import { ActivityFeed } from "./activity-feed";
import { StorageBreakdown } from "./storage-breakdown";

type Stats = {
  rules: number;
  skills: number;
  agents: number;
  hooks: number;
  projects: number;
  storageSize: string;
};

export function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <ConfigStatusBanner />
      <DocsGenerationBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Claude Code configuration
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="https://github.com/anthropics/claude-code" target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Claude Code Docs
          </Link>
        </Button>
      </div>

      <HealthStrip />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour-step="stats">
        <StatsCard
          title="Rules"
          value={isLoading ? "..." : stats?.rules ?? 0}
          description="Development guidelines"
          icon={<Scale className="h-4 w-4 text-muted-foreground" />}
          href="/artifacts/rules"
          tourStep="rules"
          infoTip={
            <InfoTip
              content={
                <div>
                  <p>{helpContent.dashboard.rules.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {helpContent.dashboard.rules.usage}
                  </p>
                </div>
              }
              side="bottom"
            />
          }
        />
        <StatsCard
          title="Skills"
          value={isLoading ? "..." : stats?.skills ?? 0}
          description="Workflow automations"
          icon={<Wand2 className="h-4 w-4 text-muted-foreground" />}
          href="/artifacts/skills"
          tourStep="skills"
          infoTip={
            <InfoTip
              content={
                <div>
                  <p>{helpContent.dashboard.skills.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {helpContent.dashboard.skills.usage}
                  </p>
                </div>
              }
              side="bottom"
            />
          }
        />
        <StatsCard
          title="Agents"
          value={isLoading ? "..." : stats?.agents ?? 0}
          description="Specialized roles"
          icon={<Bot className="h-4 w-4 text-muted-foreground" />}
          href="/artifacts/agents"
          tourStep="agents"
          infoTip={
            <InfoTip
              content={
                <div>
                  <p>{helpContent.dashboard.agents.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {helpContent.dashboard.agents.usage}
                  </p>
                </div>
              }
              side="bottom"
            />
          }
        />
        <StatsCard
          title="Hooks"
          value={isLoading ? "..." : stats?.hooks ?? 0}
          description="Event handlers"
          icon={<Webhook className="h-4 w-4 text-muted-foreground" />}
          href="/artifacts/hooks"
          tourStep="hooks"
          infoTip={
            <InfoTip
              content={
                <div>
                  <p>{helpContent.dashboard.hooks.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {helpContent.dashboard.hooks.usage}
                  </p>
                </div>
              }
              side="bottom"
            />
          }
        />
      </div>

      <QuickLauncher />

      <div className="grid gap-4 md:grid-cols-2">
        <ActivityFeed />
        <StorageBreakdown />
      </div>
    </div>
  );
}
