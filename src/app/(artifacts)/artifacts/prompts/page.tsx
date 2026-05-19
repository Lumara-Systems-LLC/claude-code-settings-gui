"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { CreateMarkdownFileDialog } from "@/components/create-markdown-file-dialog";

interface PromptListItem {
  name: string;
  path: string;
  size: string;
  lastModified: string;
}

export default function PromptsPage() {
  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const response = await fetch("/api/prompts");
      if (!response.ok) throw new Error("Failed to load prompts");
      return response.json() as Promise<PromptListItem[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
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
          Failed to load prompts. Make sure the directory exists at ~/.claude/prompts/
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Curated analysis prompts for complex tasks (loaded with /prompt)
          </p>
        </div>
        <CreateMarkdownFileDialog
          buttonLabel="New Prompt"
          dialogTitle="Create New Prompt"
          dialogDescription="A curated analysis prompt for complex tasks"
          apiPath="/api/prompts"
          queryKey="prompts"
          routePrefix="/artifacts/prompts"
          destinationLabel={(f) => `Will be saved as ~/.claude/prompts/${f}`}
          contentTemplate={(_name, heading) =>
            `# ${heading}\n\nDescribe what this prompt accomplishes.\n\n## When to use\n\n## What to analyze\n\n## Output format\n`
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {prompts?.map((prompt) => (
          <Link
            key={prompt.name}
            href={`/artifacts/prompts/${encodeURIComponent(prompt.name)}`}
          >
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    {prompt.name.replace(".md", "")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{prompt.size}</span>
                  <span>{new Date(prompt.lastModified).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
