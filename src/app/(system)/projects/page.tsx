"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FolderOpen, Calendar } from "lucide-react";

interface ProjectInfo {
  name: string;
  path: string;
  sizeHuman: string;
  sizeBytes: number;
  itemCount: number;
}

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      // Use the storage API and extract projects info
      const response = await fetch("/api/storage");
      if (!response.ok) throw new Error("Failed to load projects");
      const data = await response.json();
      // Find the projects directory
      const projectsDir = data.ephemeralDirectories.find(
        (d: ProjectInfo) => d.name === "projects"
      );
      return projectsDir;
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
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
          <AlertDescription>Failed to load projects information</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Per-project session context stored in ~/.claude/projects/
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.sizeHuman ?? "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects?.itemCount ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">30 days</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">~/.claude/projects/</p>
                    <p className="text-sm text-muted-foreground">
                      Contains session context for each project you work on
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{projects?.sizeHuman ?? "N/A"}</Badge>
              </div>

              <div className="rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Data older than 30 days is automatically cleaned up via cleanup.sh
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">This directory stores:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Session history and context</li>
                  <li>Project-specific settings</li>
                  <li>Cached analysis results</li>
                  <li>Temporary working files</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
