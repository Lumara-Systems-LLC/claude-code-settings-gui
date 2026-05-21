"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Plus, Trash2, Save, Code, Info, FileX } from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

type LocalSettings = {
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  _exists?: boolean;
  _demo?: boolean;
  [k: string]: unknown;
};

export default function SettingsLocalPage() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const [tab, setTab] = useState("permissions");
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [newAllow, setNewAllow] = useState("");
  const [newDeny, setNewDeny] = useState("");
  const [newAsk, setNewAsk] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings-local"],
    queryFn: async () => {
      const res = await fetch("/api/settings-local");
      if (!res.ok) throw new Error("Failed to load settings.local.json");
      return res.json() as Promise<LocalSettings>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (s: LocalSettings) => {
      const res = await fetch("/api/settings-local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("settings.local.json saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["settings-local"] });
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings-local", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("settings.local.json removed");
      queryClient.invalidateQueries({ queryKey: ["settings-local"] });
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
      const { _exists, _demo, ...rest } = data;
      void _exists;
      void _demo;
      setRawJson(JSON.stringify(rest, null, 2));
      setHasChanges(false);
    }
  }, [data]);

  function update(patch: Partial<LocalSettings>) {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    setHasChanges(true);
  }

  const handleSave = () => {
    if (tab === "raw" && rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        saveMutation.mutate(parsed);
      } catch {
        toast.error("Invalid JSON");
      }
    } else if (settings) {
      saveMutation.mutate(settings);
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
        <AlertDescription>Failed to load settings.local.json</AlertDescription>
      </Alert>
    );
  }

  const allow = settings.permissions?.allow ?? [];
  const deny = settings.permissions?.deny ?? [];
  const ask = settings.permissions?.ask ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            settings.local.json
            {!settings._exists && (
              <Badge variant="outline" className="text-xs">
                not yet created
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Machine-specific overrides — not committed to git
          </p>
        </div>
        <div className="flex gap-2">
          {settings._exists && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Delete settings.local.json? This cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete file
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
            {hasChanges && (
              <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About settings.local.json</AlertTitle>
        <AlertDescription>
          This file layers <strong>on top of</strong> settings.json with per-machine
          overrides. Common use: machine-specific tool paths, allowlists for desktop-only
          commands, WebFetch domain allowlist. Typically gitignored.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="raw" className="gap-2">
            <Code className="h-4 w-4" />
            Raw JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionList
            title="Allow"
            icon="✓"
            value={allow}
            newValue={newAllow}
            setNewValue={setNewAllow}
            onAdd={(v) =>
              update({
                permissions: { ...settings.permissions, allow: [...allow, v] },
              })
            }
            onRemove={(i) =>
              update({
                permissions: {
                  ...settings.permissions,
                  allow: allow.filter((_, j) => j !== i),
                },
              })
            }
          />
          <PermissionList
            title="Deny"
            icon="✗"
            value={deny}
            newValue={newDeny}
            setNewValue={setNewDeny}
            destructive
            onAdd={(v) =>
              update({
                permissions: { ...settings.permissions, deny: [...deny, v] },
              })
            }
            onRemove={(i) =>
              update({
                permissions: {
                  ...settings.permissions,
                  deny: deny.filter((_, j) => j !== i),
                },
              })
            }
          />
          <PermissionList
            title="Ask"
            icon="?"
            value={ask}
            newValue={newAsk}
            setNewValue={setNewAsk}
            onAdd={(v) =>
              update({
                permissions: { ...settings.permissions, ask: [...ask, v] },
              })
            }
            onRemove={(i) =>
              update({
                permissions: {
                  ...settings.permissions,
                  ask: ask.filter((_, j) => j !== i),
                },
              })
            }
          />
        </TabsContent>

        <TabsContent value="raw">
          <div className="h-[600px] overflow-hidden rounded-lg border">
            <Editor
              height="100%"
              language="json"
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              value={rawJson}
              onChange={(v) => {
                if (v !== undefined) {
                  setRawJson(v);
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

      {!settings._exists && (
        <div className="text-center text-sm text-muted-foreground py-4 flex items-center gap-2 justify-center">
          <FileX className="h-4 w-4" />
          File doesn&apos;t exist yet — saving any change will create it.
        </div>
      )}
    </div>
  );
}

type PermissionListProps = {
  title: string;
  icon: string;
  value: string[];
  newValue: string;
  setNewValue: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  destructive?: boolean;
};

function PermissionList(props: PermissionListProps) {
  const { title, icon, value, newValue, setNewValue, onAdd, onRemove, destructive } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="permission pattern"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newValue) {
                onAdd(newValue);
                setNewValue("");
              }
            }}
          />
          <Button
            size="icon"
            onClick={() => {
              if (newValue) {
                onAdd(newValue);
                setNewValue("");
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {value.length === 0 && (
              <p className="text-sm text-muted-foreground">None.</p>
            )}
            {value.map((pattern, i) => (
              <div
                key={i}
                className={
                  "flex items-center justify-between rounded-md border p-2 " +
                  (destructive ? "border-destructive/30 bg-destructive/5" : "")
                }
              >
                <code className="text-sm break-all">{pattern}</code>
                <Button variant="ghost" size="icon" onClick={() => onRemove(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
