"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, use } from "react";
import { MainLayout } from "@/components/layout";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PageProps {
  params: Promise<{ name: string }>;
}

interface Prompt {
  name: string;
  path: string;
  content: string;
}

export default function PromptDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ["prompt", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/prompts?filename=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load prompt");
      return response.json() as Promise<Prompt>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save prompt");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Prompt saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["prompt", decodedName] });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (prompt) {
      setContent(prompt.content);
      setHasChanges(false);
    }
  }, [prompt]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (prompt) {
      setHasChanges(newContent !== prompt.content);
    }
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

  if (error || !prompt) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load prompt: {decodedName}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const displayName = decodedName.replace(".md", "");

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/prompts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              Curated analysis prompt
            </p>
          </div>
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
