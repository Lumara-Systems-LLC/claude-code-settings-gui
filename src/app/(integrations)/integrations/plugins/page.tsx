"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Package, Info } from "lucide-react";
import { toast } from "sonner";

type PluginRow = {
  id: string;
  version: string;
  scope: string;
  installPath: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
  gitCommitSha?: string;
};

export default function PluginsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await fetch("/api/plugins");
      if (!res.ok) throw new Error("Failed to load plugins");
      return res.json() as Promise<PluginRow[]>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch("/api/plugins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to toggle");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success(`${vars.id} ${vars.enabled ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["plugins"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load plugins.</AlertDescription>
      </Alert>
    );
  }

  const plugins = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plugins</h1>
        <p className="text-sm text-muted-foreground">
          Claude Code plugins from <code>~/.claude/plugins/installed_plugins.json</code>
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Toggling here updates <code>enabledPlugins</code> in settings.json. Use Claude
          Code itself (<code>/plugin install</code>) to actually install or remove
          plugins.
        </AlertDescription>
      </Alert>

      {plugins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No plugins installed.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plugins.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Package className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <CardTitle className="text-base font-mono break-all">
                        {p.id}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          v{p.version}
                        </Badge>
                        <span>scope: {p.scope}</span>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(v) =>
                      toggleMutation.mutate({ id: p.id, enabled: v })
                    }
                    disabled={toggleMutation.isPending}
                  />
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                {p.installedAt && (
                  <div>
                    Installed: {new Date(p.installedAt).toLocaleString()}
                  </div>
                )}
                {p.installPath !== "—" && (
                  <div className="break-all">
                    Path: <code>{p.installPath}</code>
                  </div>
                )}
                {p.gitCommitSha && (
                  <div>
                    Commit: <code className="font-mono">{p.gitCommitSha.slice(0, 12)}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
