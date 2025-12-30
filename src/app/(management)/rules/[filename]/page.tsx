"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, use } from "react";
import { MainLayout } from "@/components/layout";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Rule } from "@/types/rule";

interface PageProps {
  params: Promise<{ filename: string }>;
}

export default function RuleDetailPage({ params }: PageProps) {
  const { filename } = use(params);
  const decodedFilename = decodeURIComponent(filename);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: rule, isLoading, error } = useQuery({
    queryKey: ["rule", decodedFilename],
    queryFn: async () => {
      const response = await fetch(
        `/api/rules?filename=${encodeURIComponent(decodedFilename)}`
      );
      if (!response.ok) throw new Error("Failed to load rule");
      return response.json() as Promise<Rule>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: decodedFilename,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save rule");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Rule saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["rule", decodedFilename] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (rule?.content) {
      setContent(rule.content);
      setHasChanges(false);
    }
  }, [rule]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== rule?.content);
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

  if (error || !rule) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load rule: {decodedFilename}
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
            <Link href="/rules">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {decodedFilename.replace(".md", "")}
              </h1>
              {rule.isPathSpecific && (
                <Badge variant="secondary">Path-specific</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{rule.path}</p>
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
