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
import type { Agent } from "@/types/agent";

const modelColors: Record<string, string> = {
  sonnet: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  opus: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  haiku: "bg-green-500/10 text-green-500 border-green-500/30",
};

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function AgentDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: agent, isLoading, error } = useQuery({
    queryKey: ["agent", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/agents?name=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load agent");
      return response.json() as Promise<Agent>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save agent");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Agent saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["agent", decodedName] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (agent) {
      const fullContent = matter.stringify(agent.content, agent.frontmatter);
      setContent(fullContent);
      setHasChanges(false);
    }
  }, [agent]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (agent) {
      const originalContent = matter.stringify(agent.content, agent.frontmatter);
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

  if (error || !agent) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load agent: {decodedName}</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/agents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{decodedName}</h1>
              {agent.frontmatter.model && (
                <Badge
                  variant="outline"
                  className={modelColors[agent.frontmatter.model]}
                >
                  {agent.frontmatter.model}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.frontmatter.description}
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
