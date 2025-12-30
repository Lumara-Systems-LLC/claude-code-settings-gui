"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react";
import Link from "next/link";
import type { AgentListItem } from "@/types/agent";
import { CreateAgentDialog } from "@/components/create-agent-dialog";

const modelColors: Record<string, string> = {
  sonnet: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  opus: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  haiku: "bg-green-500/10 text-green-500 border-green-500/30",
};

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to load agents");
      return response.json() as Promise<AgentListItem[]>;
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load agents. Make sure the directory exists at ~/.claude/agents/
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-sm text-muted-foreground">
              Specialized roles with custom tooling and models
            </p>
          </div>
          <CreateAgentDialog />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {agents?.map((agent) => (
            <Link
              key={agent.name}
              href={`/agents/${encodeURIComponent(agent.name)}`}
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                    </div>
                    {agent.model && (
                      <Badge
                        variant="outline"
                        className={modelColors[agent.model]}
                      >
                        {agent.model}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {agent.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
