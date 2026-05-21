"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Workflow, ListOrdered } from "lucide-react";
import Link from "next/link";
import { CreateMarkdownFileDialog } from "@/components/create-markdown-file-dialog";

type WorkflowListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
  stepCount?: number;
};

export default function WorkflowsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to load workflows");
      return res.json() as Promise<WorkflowListItem[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load workflows. Make sure the directory exists at
          ~/.claude/workflows/
        </AlertDescription>
      </Alert>
    );
  }

  const workflows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Multi-step orchestrations that chain skills and agents
          </p>
        </div>
        <CreateMarkdownFileDialog
          buttonLabel="New Workflow"
          dialogTitle="Create New Workflow"
          dialogDescription="A multi-step orchestration template"
          apiPath="/api/workflows"
          queryKey="workflows"
          routePrefix="/artifacts/workflows"
          destinationLabel={(f) => `Will be saved as ~/.claude/workflows/${f}`}
          contentTemplate={(name, heading) =>
            `# ${heading}\n\nDescribe when and how this workflow runs.\n\n## Trigger\n\nWhen to use \`/workflow ${name}\`.\n\n## Steps\n\n### 1. First step\n\n### 2. Second step\n\n### 3. Third step\n`
          }
        />
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No workflows yet. Create one to define a reusable multi-step process.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Link
              key={wf.name}
              href={`/artifacts/workflows/${encodeURIComponent(wf.name)}`}
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {wf.name.replace(".md", "")}
                      </CardTitle>
                    </div>
                    {wf.stepCount && wf.stepCount > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <ListOrdered className="h-3 w-3" />
                        {wf.stepCount} steps
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {wf.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
