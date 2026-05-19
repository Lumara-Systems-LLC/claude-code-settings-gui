"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function HostPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["host"],
    queryFn: async () => {
      const response = await fetch(`/api/files?file=HOST.md`);
      if (!response.ok) throw new Error("Failed to load file");
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "HOST.md", content: newContent }),
      });
      if (!response.ok) throw new Error("Failed to save file");
      return response.json();
    },
    onSuccess: () => {
      toast.success("HOST.md saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["host"] });
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
          Failed to load HOST.md. The file may not exist yet — it&apos;ll be created on
          first save.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">HOST.md</h1>
        <p className="text-sm text-muted-foreground">
          Machine-specific documentation (hardware, networking, local services)
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
