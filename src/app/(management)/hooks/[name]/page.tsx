"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, use } from "react";
import { MainLayout } from "@/components/layout";
import { CodeEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Terminal, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { HookScript, HookMetricsSummary } from "@/types/hook";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default function HookDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: hook, isLoading, error } = useQuery({
    queryKey: ["hook", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/hooks?name=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load hook");
      return response.json() as Promise<HookScript>;
    },
  });

  const { data: metricsData } = useQuery({
    queryKey: ["hook-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/hooks/metrics");
      if (!response.ok) return null;
      return response.json() as Promise<{
        metrics: unknown[];
        summaries: HookMetricsSummary[];
      }>;
    },
  });

  const metrics = metricsData?.summaries?.find((s) =>
    s.hookName.includes(decodedName.replace(".sh", ""))
  );

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/hooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save hook");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Hook saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["hook", decodedName] });
      queryClient.invalidateQueries({ queryKey: ["hooks"] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  useEffect(() => {
    if (hook?.content) {
      setContent(hook.content);
      setHasChanges(false);
    }
  }, [hook]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== hook?.content);
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

  if (error || !hook) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load hook: {decodedName}
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const successRate = metrics
    ? Math.round((metrics.successCount / metrics.totalExecutions) * 100)
    : null;

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold">
                {decodedName.replace(".sh", "")}
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                .sh
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{hook.path}</p>
          </div>

          {metrics && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{metrics.avgDurationMs}ms avg</span>
              </div>
              <div className="flex items-center gap-1.5">
                {successRate !== null && successRate >= 90 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span>{successRate}% success</span>
              </div>
              <Badge variant="secondary">
                {metrics.totalExecutions} runs
              </Badge>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border">
          <CodeEditor
            value={content}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={mutation.isPending}
            hasChanges={hasChanges}
            language="shell"
          />
        </div>
      </div>
    </MainLayout>
  );
}
