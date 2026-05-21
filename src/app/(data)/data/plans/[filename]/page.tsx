"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MarkdownPreview } from "@/components/editors";

type PlanFile = {
  name: string;
  path: string;
  content: string;
  size: number;
  lastModified: string;
};

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename } = use(params);
  const decoded = decodeURIComponent(filename);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan", decoded],
    queryFn: async () => {
      const res = await fetch(`/api/plans?filename=${encodeURIComponent(decoded)}`);
      if (!res.ok) throw new Error("Failed to load plan");
      return res.json() as Promise<PlanFile>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load plan: {decoded}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/data/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-mono truncate">
            {decoded.replace(".md", "")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.path} · last modified {new Date(data.lastModified).toLocaleString()}
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <MarkdownPreview value={data.content} />
        </CardContent>
      </Card>
    </div>
  );
}
