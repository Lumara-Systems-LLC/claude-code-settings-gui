"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Wand2 } from "lucide-react";
import Link from "next/link";
import type { SkillListItem } from "@/types/skill";
import { CreateSkillDialog } from "@/components/create-skill-dialog";

export default function SkillsPage() {
  const { data: skills, isLoading, error } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const response = await fetch("/api/skills");
      if (!response.ok) throw new Error("Failed to load skills");
      return response.json() as Promise<SkillListItem[]>;
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
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
          <AlertDescription>
            Failed to load skills. Make sure the directory exists at ~/.claude/skills/
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  // Group skills by category
  const stackSkills = skills?.filter((s) => s.name.startsWith("stack-")) || [];
  const workflowSkills = skills?.filter((s) => !s.name.startsWith("stack-")) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Skills</h1>
            <p className="text-sm text-muted-foreground">
              Workflow automations invoked with /{"{skill-name}"}
            </p>
          </div>
          <CreateSkillDialog />
        </div>

        {stackSkills.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Stack Skills</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stackSkills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/skills/${encodeURIComponent(skill.name)}`}
                >
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          /{skill.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {skill.description || "No description"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {workflowSkills.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Workflow Skills</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflowSkills.map((skill) => (
                <Link
                  key={skill.name}
                  href={`/skills/${encodeURIComponent(skill.name)}`}
                >
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          /{skill.name}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {skill.description || "No description"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
