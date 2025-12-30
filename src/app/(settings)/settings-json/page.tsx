"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Plus, Trash2, Save, Code } from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { Settings } from "@/types/settings";

interface ValidationError {
  message: string;
  details: string[];
}

export default function SettingsJsonPage() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("permissions");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [newAllowPattern, setNewAllowPattern] = useState("");
  const [newDenyPattern, setNewDenyPattern] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load settings");
      return response.json() as Promise<Settings>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newSettings: Settings) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || "Failed to save settings") as Error & {
          details?: string[];
        };
        error.details = errorData.details;
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      setHasChanges(false);
      setValidationErrors(null);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error & { details?: string[] }) => {
      if (error.details && error.details.length > 0) {
        setValidationErrors({
          message: error.message,
          details: error.details,
        });
        toast.error("Validation failed - see errors below");
      } else {
        setValidationErrors(null);
        toast.error("Failed to save: " + error.message);
      }
    },
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
      setRawJson(JSON.stringify(data, null, 2));
      setHasChanges(false);
    }
  }, [data]);

  const handleSave = () => {
    if (activeTab === "raw" && rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        mutation.mutate(parsed);
      } catch {
        toast.error("Invalid JSON");
      }
    } else if (settings) {
      mutation.mutate(settings);
    }
  };

  const addAllowPattern = () => {
    if (newAllowPattern && settings) {
      const newSettings = {
        ...settings,
        permissions: {
          ...settings.permissions,
          allow: [...settings.permissions.allow, newAllowPattern],
        },
      };
      setSettings(newSettings);
      setHasChanges(true);
      setValidationErrors(null);
      setNewAllowPattern("");
    }
  };

  const removeAllowPattern = (index: number) => {
    if (settings) {
      const newSettings = {
        ...settings,
        permissions: {
          ...settings.permissions,
          allow: settings.permissions.allow.filter((_, i) => i !== index),
        },
      };
      setSettings(newSettings);
      setHasChanges(true);
      setValidationErrors(null);
    }
  };

  const addDenyPattern = () => {
    if (newDenyPattern && settings) {
      const newSettings = {
        ...settings,
        permissions: {
          ...settings.permissions,
          deny: [...settings.permissions.deny, newDenyPattern],
        },
      };
      setSettings(newSettings);
      setHasChanges(true);
      setNewDenyPattern("");
    }
  };

  const removeDenyPattern = (index: number) => {
    if (settings) {
      const newSettings = {
        ...settings,
        permissions: {
          ...settings.permissions,
          deny: settings.permissions.deny.filter((_, i) => i !== index),
        },
      };
      setSettings(newSettings);
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (error || !settings) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load settings.json. Make sure the file exists at ~/.claude/settings.json
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">settings.json</h1>
            <p className="text-sm text-muted-foreground">
              Permissions, MCP servers, hooks, and other configuration
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
            {hasChanges && (
              <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </Button>
        </div>

        {validationErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{validationErrors.message}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {validationErrors.details.map((detail, index) => (
                  <li key={index} className="text-sm">
                    <code className="rounded bg-destructive/20 px-1">{detail}</code>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setValidationErrors(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="mcp">MCP Servers</TabsTrigger>
            <TabsTrigger value="hooks">Hooks</TabsTrigger>
            <TabsTrigger value="raw" className="gap-2">
              <Code className="h-4 w-4" />
              Raw JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Allow Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Bash(npm run:*)"
                    value={newAllowPattern}
                    onChange={(e) => setNewAllowPattern(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAllowPattern()}
                  />
                  <Button onClick={addAllowPattern} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {settings.permissions.allow.map((pattern, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <code className="text-sm">{pattern}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAllowPattern(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deny Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Read(.env)"
                    value={newDenyPattern}
                    onChange={(e) => setNewDenyPattern(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDenyPattern()}
                  />
                  <Button onClick={addDenyPattern} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {settings.permissions.deny.map((pattern, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-2"
                      >
                        <code className="text-sm">{pattern}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDenyPattern(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4">
            {Object.entries(settings.mcpServers).map(([name, server]) => (
              <Card key={name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <Badge variant="secondary">{server.type || "stdio"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {server.command && (
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          Command
                        </dt>
                        <dd>
                          <code>{server.command}</code>
                        </dd>
                      </div>
                    )}
                    {server.url && (
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          URL
                        </dt>
                        <dd>
                          <code>{server.url}</code>
                        </dd>
                      </div>
                    )}
                    {server.args && server.args.length > 0 && (
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          Arguments
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                          {server.args.map((arg, i) => (
                            <Badge key={i} variant="outline">
                              {arg}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                    )}
                    {server.env && Object.keys(server.env).length > 0 && (
                      <div>
                        <dt className="font-medium text-muted-foreground">
                          Environment Variables
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                          {Object.keys(server.env).map((key) => (
                            <Badge key={key} variant="outline">
                              {key}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="hooks" className="space-y-4">
            {Object.entries(settings.hooks).map(([event, matchers]) => (
              <Card key={event}>
                <CardHeader>
                  <CardTitle className="text-lg">{event}</CardTitle>
                </CardHeader>
                <CardContent>
                  {matchers && matchers.length > 0 ? (
                    <div className="space-y-2">
                      {matchers.map((matcher, index) => (
                        <div key={index} className="rounded-md border p-3">
                          {matcher.matcher && (
                            <div className="mb-2 text-sm text-muted-foreground">
                              Matcher: <code>{matcher.matcher}</code>
                            </div>
                          )}
                          <div className="space-y-1">
                            {matcher.hooks.map((hook, hookIndex) => (
                              <div key={hookIndex} className="text-sm">
                                <Badge variant="secondary" className="mr-2">
                                  {hook.type}
                                </Badge>
                                <code>
                                  {hook.command || hook.prompt || "N/A"}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hooks configured for this event
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="raw">
            <div className="h-[600px] overflow-hidden rounded-lg border">
              <Editor
                height="100%"
                language="json"
                theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                value={rawJson}
                onChange={(value) => {
                  if (value !== undefined) {
                    setRawJson(value);
                    setHasChanges(true);
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
