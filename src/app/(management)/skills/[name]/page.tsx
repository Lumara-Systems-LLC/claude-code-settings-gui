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
import matter from "gray-matter";
import type { Skill } from "@/types/skill";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function SkillDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: skill, isLoading, error } = useQuery({
    queryKey: ["skill", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/skills?name=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load skill");
      return response.json() as Promise<Skill>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save skill");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Skill saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["skill", decodedName] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (skill) {
      // Reconstruct the full markdown with frontmatter
      const fullContent = matter.stringify(skill.content, skill.frontmatter);
      setContent(fullContent);
      setHasChanges(false);
    }
  }, [skill]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (skill) {
      const originalContent = matter.stringify(skill.content, skill.frontmatter);
      setHasChanges(newContent !== originalContent);
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

  if (error || !skill) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load skill: {decodedName}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/skills">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">/{decodedName}</h1>
              {skill.frontmatter["allowed-tools"] && (
                <Badge variant="secondary">
                  {skill.frontmatter["allowed-tools"]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {skill.frontmatter.description}
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
