"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText, Code } from "lucide-react";
import Link from "next/link";
import type { RuleListItem } from "@/types/rule";
import { CreateRuleDialog } from "@/components/create-rule-dialog";

export default function RulesPage() {
  const { data: rules, isLoading, error } = useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const response = await fetch("/api/rules");
      if (!response.ok) throw new Error("Failed to load rules");
      return response.json() as Promise<RuleListItem[]>;
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
            Failed to load rules. Make sure the directory exists at ~/.claude/rules/
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const coreRules = rules?.filter((r) => !r.isPathSpecific) || [];
  const pathSpecificRules = rules?.filter((r) => r.isPathSpecific) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rules</h1>
            <p className="text-sm text-muted-foreground">
              Development guidelines and standards for Claude Code
            </p>
          </div>
          <CreateRuleDialog />
        </div>

        {coreRules.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Core Rules</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coreRules.map((rule) => (
                <Link
                  key={rule.filename}
                  href={`/rules/${encodeURIComponent(rule.filename)}`}
                >
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          {rule.filename.replace(".md", "")}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rule.description || "No description"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {pathSpecificRules.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Path-Specific Rules</h2>
            <p className="text-sm text-muted-foreground">
              These rules are automatically applied based on file extensions
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pathSpecificRules.map((rule) => (
                <Link
                  key={rule.filename}
                  href={`/rules/${encodeURIComponent(rule.filename)}`}
                >
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">
                            {rule.filename.replace(".md", "")}
                          </CardTitle>
                        </div>
                        <Badge variant="secondary">Auto-load</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rule.description || "No description"}
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
