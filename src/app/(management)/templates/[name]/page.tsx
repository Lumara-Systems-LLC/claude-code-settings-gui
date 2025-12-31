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

interface Template {
  name: string;
  path: string;
  content: string;
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function TemplateDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: template, isLoading, error } = useQuery({
    queryKey: ["template", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/templates?filename=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load template");
      return response.json() as Promise<Template>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save template");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Template saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["template", decodedName] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (template?.content) {
      setContent(template.content);
      setHasChanges(false);
    }
  }, [template]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== template?.content);
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

  if (error || !template) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load template: {decodedName}
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {decodedName.replace(".md", "")}
            </h1>
            <p className="text-sm text-muted-foreground">{template.path}</p>
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
