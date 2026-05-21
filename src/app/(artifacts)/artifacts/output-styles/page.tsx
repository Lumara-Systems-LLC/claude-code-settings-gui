"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Palette } from "lucide-react";
import Link from "next/link";
import { CreateMarkdownFileDialog } from "@/components/create-markdown-file-dialog";

type StyleListItem = {
  name: string;
  path: string;
  size: string;
  lastModified: string;
  description?: string;
};

export default function OutputStylesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["output-styles"],
    queryFn: async () => {
      const res = await fetch("/api/output-styles");
      if (!res.ok) throw new Error("Failed to load output styles");
      return res.json() as Promise<StyleListItem[]>;
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
          Failed to load output styles. Make sure the directory exists at
          ~/.claude/output-styles/
        </AlertDescription>
      </Alert>
    );
  }

  const styles = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Output Styles</h1>
          <p className="text-sm text-muted-foreground">
            Switch how Claude formats responses (teaching, executive, minimal, etc.)
          </p>
        </div>
        <CreateMarkdownFileDialog
          buttonLabel="New Style"
          dialogTitle="Create New Output Style"
          dialogDescription="A reusable response style switchable with /output-style"
          apiPath="/api/output-styles"
          queryKey="output-styles"
          routePrefix="/artifacts/output-styles"
          destinationLabel={(f) =>
            `Will be saved as ~/.claude/output-styles/${f}`
          }
          contentTemplate={(name, heading) =>
            `# ${heading}\n\nDefine the tone, structure, and conventions Claude should use when this style is active.\n\n## Tone\n\n## Structure\n\n## Examples\n`
          }
        />
      </div>

      {styles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No output styles yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {styles.map((s) => (
            <Link
              key={s.name}
              href={`/artifacts/output-styles/${encodeURIComponent(s.name)}`}
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {s.name.replace(".md", "")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {s.description || "No description"}
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
