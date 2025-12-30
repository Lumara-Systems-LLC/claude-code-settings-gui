"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Settings,
  Scale,
  Wand2,
  Bot,
  Webhook,
  HardDrive,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  href: string;
}

function StatsCard({ title, value, description, icon, href }: StatsCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Claude Code configuration
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://github.com/anthropics/claude-code"
            target="_blank"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Claude Code Docs
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Rules"
          value={isLoading ? "..." : stats?.rules ?? 0}
          description="Development guidelines"
          icon={<Scale className="h-4 w-4 text-muted-foreground" />}
          href="/rules"
        />
        <StatsCard
          title="Skills"
          value={isLoading ? "..." : stats?.skills ?? 0}
          description="Workflow automations"
          icon={<Wand2 className="h-4 w-4 text-muted-foreground" />}
          href="/skills"
        />
        <StatsCard
          title="Agents"
          value={isLoading ? "..." : stats?.agents ?? 0}
          description="Specialized roles"
          icon={<Bot className="h-4 w-4 text-muted-foreground" />}
          href="/agents"
        />
        <StatsCard
          title="Hooks"
          value={isLoading ? "..." : stats?.hooks ?? 0}
          description="Event handlers"
          icon={<Webhook className="h-4 w-4 text-muted-foreground" />}
          href="/hooks"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/claude-md">
                <FileText className="mr-2 h-4 w-4" />
                Edit CLAUDE.md
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/settings-json">
                <Settings className="mr-2 h-4 w-4" />
                Edit settings.json
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/storage">
                <HardDrive className="mr-2 h-4 w-4" />
                Manage Storage
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Size
                  </span>
                  <Badge variant="secondary">
                    {stats?.storageSize ?? "Unknown"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Projects
                  </span>
                  <Badge variant="secondary">
                    {stats?.projects ?? 0} tracked
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/storage">View Details</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/claude-md" className="flex flex-col items-start">
                <span className="font-semibold">CLAUDE.md</span>
                <span className="text-xs text-muted-foreground">
                  Global development rules
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link
                href="/settings-json"
                className="flex flex-col items-start"
              >
                <span className="font-semibold">settings.json</span>
                <span className="text-xs text-muted-foreground">
                  Permissions, MCP servers, hooks
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link href="/readme" className="flex flex-col items-start">
                <span className="font-semibold">README.md</span>
                <span className="text-xs text-muted-foreground">
                  Documentation and quick reference
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
