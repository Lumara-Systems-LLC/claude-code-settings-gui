"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ClaudeMdPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["claude-md"],
    queryFn: async () => {
      const response = await fetch(
        `/api/files?path=${encodeURIComponent(
          process.env.HOME + "/.claude/CLAUDE.md"
        )}`
      );
      if (!response.ok) throw new Error("Failed to load file");
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: process.env.HOME + "/.claude/CLAUDE.md",
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save file");
      return response.json();
    },
    onSuccess: () => {
      toast.success("CLAUDE.md saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["claude-md"] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (data?.content) {
      setContent(data.content);
      setHasChanges(false);
    }
  }, [data]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== data?.content);
  };

  const handleSave = () => {
    mutation.mutate(content);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="flex-1" />
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
            Failed to load CLAUDE.md. Make sure the file exists at ~/.claude/CLAUDE.md
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">CLAUDE.md</h1>
          <p className="text-sm text-muted-foreground">
            Global development rules and instructions for Claude Code
          </p>
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border">
          <MarkdownEditor
            value={content}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={mutation.isPending}
            hasChanges={hasChanges}
          />
        </div>
      </div>
    </MainLayout>
  );
}
