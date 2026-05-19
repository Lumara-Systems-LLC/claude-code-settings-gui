"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Plus, Trash2, Save, Code } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "@/components/ui/info-tip";
import { helpContent } from "@/lib/help-content";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { Settings } from "@/types/settings";

type ValidationError = {
  message: string;
  details: string[];
};

const MODEL_PRESETS = [
  { value: "opus", label: "Opus (most capable)" },
  { value: "sonnet", label: "Sonnet (balanced)" },
  { value: "haiku", label: "Haiku (fastest)" },
];

export default function SettingsJsonPage() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [newAllowPattern, setNewAllowPattern] = useState("");
  const [newDenyPattern, setNewDenyPattern] = useState("");
  const [newAdditionalDir, setNewAdditionalDir] = useState("");
  const [newPluginKey, setNewPluginKey] = useState("");
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
        const err = new Error(errorData.error || "Failed to save settings") as Error & {
          details?: string[];
        };
        err.details = errorData.details;
        throw err;
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      setHasChanges(false);
      setValidationErrors(null);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error & { details?: string[] }) => {
      if (err.details && err.details.length > 0) {
        setValidationErrors({ message: err.message, details: err.details });
        toast.error("Validation failed - see errors below");
      } else {
        setValidationErrors(null);
        toast.error("Failed to save: " + err.message);
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

  function update(patch: Partial<Settings>) {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    setHasChanges(true);
    setValidationErrors(null);
  }

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load settings.json. Use the Dashboard banner to create the file if it doesn&apos;t exist yet.
        </AlertDescription>
      </Alert>
    );
  }

  const enabledPlugins = settings.enabledPlugins ?? {};
  const additionalDirs = settings.permissions.additionalDirectories ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">settings.json</h1>
          <p className="text-sm text-muted-foreground">
            Permissions, MCP servers, hooks, model, plugins, and other configuration
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="mcp">MCP Servers</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="raw" className="gap-2">
            <Code className="h-4 w-4" />
            Raw JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="model-select">Default model</Label>
                <Select
                  value={settings.model ?? ""}
                  onValueChange={(v) => update({ model: v || undefined })}
                >
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Inherit from Claude Code CLI" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_PRESETS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave unset to use whatever Claude Code defaults to. You can also type a
                  specific model ID in the Raw JSON tab.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feature flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="thinking-switch" className="text-sm font-medium">
                    Always thinking
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Force Claude to think before every response (slower, more thorough).
                  </p>
                </div>
                <Switch
                  id="thinking-switch"
                  checked={settings.alwaysThinkingEnabled ?? false}
                  onCheckedChange={(v) => update({ alwaysThinkingEnabled: v })}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="teams-switch" className="text-sm font-medium">
                    Agent teams
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow multiple specialist agents to collaborate on a task.
                  </p>
                </div>
                <Switch
                  id="teams-switch"
                  checked={settings.enableAgentTeams ?? false}
                  onCheckedChange={(v) => update({ enableAgentTeams: v })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status line</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="status-type">Type</Label>
                <Select
                  value={settings.statusLine?.type ?? ""}
                  onValueChange={(v) =>
                    update({
                      statusLine: {
                        ...settings.statusLine,
                        type: v === "" ? undefined : (v as "command" | "static"),
                      },
                    })
                  }
                >
                  <SelectTrigger id="status-type">
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="command">command (run a script)</SelectItem>
                    <SelectItem value="static">static (literal text)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settings.statusLine?.type === "command" && (
                <div className="space-y-1">
                  <Label htmlFor="status-command">Command</Label>
                  <Input
                    id="status-command"
                    placeholder="bash ~/.claude/scripts/statusline.sh"
                    value={settings.statusLine?.command ?? ""}
                    onChange={(e) =>
                      update({
                        statusLine: { ...settings.statusLine, command: e.target.value },
                      })
                    }
                  />
                </div>
              )}
              {settings.statusLine?.type === "static" && (
                <div className="space-y-1">
                  <Label htmlFor="status-text">Text</Label>
                  <Input
                    id="status-text"
                    placeholder="🚀 Claude Code"
                    value={settings.statusLine?.text ?? ""}
                    onChange={(e) =>
                      update({
                        statusLine: { ...settings.statusLine, text: e.target.value },
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="attr-commit">Commit attribution template</Label>
                <Input
                  id="attr-commit"
                  placeholder="Co-authored-by: Claude <claude@anthropic.com>"
                  value={settings.attribution?.commit ?? ""}
                  onChange={(e) =>
                    update({
                      attribution: { ...settings.attribution, commit: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="attr-pr">Pull-request attribution template</Label>
                <Input
                  id="attr-pr"
                  placeholder="🤖 Generated with Claude Code"
                  value={settings.attribution?.pr ?? ""}
                  onChange={(e) =>
                    update({
                      attribution: { ...settings.attribution, pr: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Allow Patterns
                <InfoTip
                  content={
                    <div className="space-y-2">
                      <p>{helpContent.settings.allowPatterns.description}</p>
                      <p className="font-medium">Examples:</p>
                      <ul className="text-xs space-y-1">
                        {helpContent.settings.allowPatterns.examples.map((ex, i) => (
                          <li key={i}>• {ex}</li>
                        ))}
                      </ul>
                    </div>
                  }
                  side="right"
                  maxWidth="320px"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Bash(npm run:*)"
                  value={newAllowPattern}
                  onChange={(e) => setNewAllowPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAllowPattern) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          allow: [...settings.permissions.allow, newAllowPattern],
                        },
                      });
                      setNewAllowPattern("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newAllowPattern) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          allow: [...settings.permissions.allow, newAllowPattern],
                        },
                      });
                      setNewAllowPattern("");
                    }
                  }}
                  size="icon"
                >
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
                        onClick={() =>
                          update({
                            permissions: {
                              ...settings.permissions,
                              allow: settings.permissions.allow.filter((_, i) => i !== index),
                            },
                          })
                        }
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
              <CardTitle className="text-lg flex items-center gap-2">
                Deny Patterns
                <InfoTip
                  content={
                    <div className="space-y-2">
                      <p>{helpContent.settings.denyPatterns.description}</p>
                      <p className="font-medium">Examples:</p>
                      <ul className="text-xs space-y-1">
                        {helpContent.settings.denyPatterns.examples.map((ex, i) => (
                          <li key={i}>• {ex}</li>
                        ))}
                      </ul>
                    </div>
                  }
                  side="right"
                  maxWidth="320px"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Read(.env)"
                  value={newDenyPattern}
                  onChange={(e) => setNewDenyPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDenyPattern) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          deny: [...settings.permissions.deny, newDenyPattern],
                        },
                      });
                      setNewDenyPattern("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newDenyPattern) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          deny: [...settings.permissions.deny, newDenyPattern],
                        },
                      });
                      setNewDenyPattern("");
                    }
                  }}
                  size="icon"
                >
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
                        onClick={() =>
                          update({
                            permissions: {
                              ...settings.permissions,
                              deny: settings.permissions.deny.filter((_, i) => i !== index),
                            },
                          })
                        }
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
              <CardTitle className="text-lg">Additional read directories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paths outside your project that Claude is permitted to read (e.g. a sibling
                repo).
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="/absolute/path/to/dir"
                  value={newAdditionalDir}
                  onChange={(e) => setNewAdditionalDir(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAdditionalDir) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          additionalDirectories: [...additionalDirs, newAdditionalDir],
                        },
                      });
                      setNewAdditionalDir("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newAdditionalDir) {
                      update({
                        permissions: {
                          ...settings.permissions,
                          additionalDirectories: [...additionalDirs, newAdditionalDir],
                        },
                      });
                      setNewAdditionalDir("");
                    }
                  }}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {additionalDirs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No additional directories.</p>
                )}
                {additionalDirs.map((dir, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <code className="text-sm break-all">{dir}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        update({
                          permissions: {
                            ...settings.permissions,
                            additionalDirectories: additionalDirs.filter((_, j) => j !== i),
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{helpContent.settings.mcpServers.description}</span>
            <InfoTip
              content={
                <div className="space-y-2">
                  <p className="font-medium">MCP Server Fields:</p>
                  <ul className="text-xs space-y-1">
                    <li>• <strong>Command:</strong> {helpContent.settings.mcpServers.fields.command}</li>
                    <li>• <strong>Args:</strong> {helpContent.settings.mcpServers.fields.args}</li>
                    <li>• <strong>URL:</strong> {helpContent.settings.mcpServers.fields.url}</li>
                    <li>• <strong>Env:</strong> {helpContent.settings.mcpServers.fields.env}</li>
                  </ul>
                </div>
              }
              side="bottom"
              maxWidth="340px"
            />
          </div>
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
                      <dt className="font-medium text-muted-foreground">Command</dt>
                      <dd>
                        <code>{server.command}</code>
                      </dd>
                    </div>
                  )}
                  {server.url && (
                    <div>
                      <dt className="font-medium text-muted-foreground">URL</dt>
                      <dd>
                        <code>{server.url}</code>
                      </dd>
                    </div>
                  )}
                  {server.args && server.args.length > 0 && (
                    <div>
                      <dt className="font-medium text-muted-foreground">Arguments</dt>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{helpContent.settings.hooks.description}</span>
            <InfoTip
              content={
                <div className="space-y-2">
                  <p className="font-medium">Hook Event Types:</p>
                  <ul className="text-xs space-y-1">
                    {Object.entries(helpContent.settings.hooks.eventTypes).map(([event, desc]) => (
                      <li key={event}>• <strong>{event}:</strong> {desc}</li>
                    ))}
                  </ul>
                </div>
              }
              side="bottom"
              maxWidth="340px"
            />
          </div>
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
                              <code>{hook.command || hook.prompt || "N/A"}</code>
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

        <TabsContent value="plugins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enabled plugins</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Plugin IDs are typically in the form <code>plugin-name@marketplace</code>.
                Toggle each plugin on or off below.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="plugin-id@marketplace"
                  value={newPluginKey}
                  onChange={(e) => setNewPluginKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPluginKey) {
                      update({
                        enabledPlugins: { ...enabledPlugins, [newPluginKey]: true },
                      });
                      setNewPluginKey("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newPluginKey) {
                      update({
                        enabledPlugins: { ...enabledPlugins, [newPluginKey]: true },
                      });
                      setNewPluginKey("");
                    }
                  }}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {Object.keys(enabledPlugins).length === 0 && (
                  <p className="text-sm text-muted-foreground">No plugins configured.</p>
                )}
                {Object.entries(enabledPlugins).map(([id, enabled]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-md border p-2 gap-2"
                  >
                    <code className="text-sm break-all flex-1">{id}</code>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) =>
                        update({
                          enabledPlugins: { ...enabledPlugins, [id]: v },
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = { ...enabledPlugins };
                        delete next[id];
                        update({ enabledPlugins: next });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
  );
}
