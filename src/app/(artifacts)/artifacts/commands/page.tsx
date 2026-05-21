"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Terminal } from "lucide-react";
import Link from "next/link";
import { CreateMarkdownFileDialog } from "@/components/create-markdown-file-dialog";

type CommandListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
};

export default function CommandsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["commands"],
    queryFn: async () => {
      const res = await fetch("/api/commands");
      if (!res.ok) throw new Error("Failed to load commands");
      return res.json() as Promise<CommandListItem[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          Failed to load commands. Make sure the directory exists at
          ~/.claude/commands/
        </AlertDescription>
      </Alert>
    );
  }

  const commands = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commands</h1>
          <p className="text-sm text-muted-foreground">
            Quick slash-command definitions for Claude Code
          </p>
        </div>
        <CreateMarkdownFileDialog
          buttonLabel="New Command"
          dialogTitle="Create New Command"
          dialogDescription="Quick slash-command available as /name"
          apiPath="/api/commands"
          queryKey="commands"
          routePrefix="/artifacts/commands"
          destinationLabel={(f) => `Will be saved as ~/.claude/commands/${f}`}
          contentTemplate={(name, heading) =>
            `# ${heading}\n\nDescribe what \`/${name}\` does and how Claude should respond when invoked.\n`
          }
        />
      </div>

      {commands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No commands yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {commands.map((cmd) => (
            <Link
              key={cmd.name}
              href={`/artifacts/commands/${encodeURIComponent(cmd.name)}`}
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-mono">
                      /{cmd.name.replace(".md", "")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cmd.description || "No description"}
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
