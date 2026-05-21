"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SystemArchitecturePage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["system-architecture"],
    queryFn: async () => {
      const response = await fetch(`/api/files?file=SYSTEM_ARCHITECTURE.md`);
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
          file: "SYSTEM_ARCHITECTURE.md",
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save file");
      return response.json();
    },
    onSuccess: () => {
      toast.success("SYSTEM_ARCHITECTURE.md saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["system-architecture"] });
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content);
      setHasChanges(false);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load SYSTEM_ARCHITECTURE.md. The file may not exist yet — it&apos;ll be
          created on first save.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">SYSTEM_ARCHITECTURE.md</h1>
        <p className="text-sm text-muted-foreground">
          Technical documentation of your Claude Code system
        </p>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border">
        <MarkdownEditor
          value={content}
          onChange={(v) => {
            setContent(v);
            setHasChanges(v !== data?.content);
          }}
          onSave={() => mutation.mutate(content)}
          isSaving={mutation.isPending}
          hasChanges={hasChanges}
        />
      </div>
    </div>
  );
}
