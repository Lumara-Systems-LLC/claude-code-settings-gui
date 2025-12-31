"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Server,
  Plus,
  Trash2,
  Play,
  Loader2,
  Check,
  X,
  Search,
  ExternalLink,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface McpServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "stdio" | "sse";
  url?: string;
}

interface RegistryServer {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  envVars: string[];
  category: string;
}

interface ServersResponse {
  servers: Record<string, McpServer>;
  count: number;
}

interface RegistryResponse {
  servers: RegistryServer[];
  categories: string[];
}

interface TestResult {
  success: boolean;
  status: string;
  message: string;
  output?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  development: "bg-blue-500/10 text-blue-500",
  database: "bg-green-500/10 text-green-500",
  system: "bg-orange-500/10 text-orange-500",
  utility: "bg-purple-500/10 text-purple-500",
  search: "bg-yellow-500/10 text-yellow-500",
  communication: "bg-pink-500/10 text-pink-500",
  automation: "bg-cyan-500/10 text-cyan-500",
  monitoring: "bg-red-500/10 text-red-500",
};

export default function McpServersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("installed");
  const [searchQuery, setSearchQuery] = useState("");
  const [installDialog, setInstallDialog] = useState<{
    open: boolean;
    server?: RegistryServer;
    name: string;
    envVars: Record<string, string>;
  }>({
    open: false,
    name: "",
    envVars: {},
  });
  const [addCustomDialog, setAddCustomDialog] = useState(false);
  const [customServer, setCustomServer] = useState({
    name: "",
    command: "",
    args: "",
  });
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Query installed servers
  const { data: installed, isLoading: installedLoading, error: installedError } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: async () => {
      const response = await fetch("/api/mcp-servers");
      if (!response.ok) throw new Error("Failed to load servers");
      return response.json() as Promise<ServersResponse>;
    },
  });

  // Query registry
  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ["mcp-servers", "registry"],
    queryFn: async () => {
      const response = await fetch("/api/mcp-servers?mode=registry");
      if (!response.ok) throw new Error("Failed to load registry");
      return response.json() as Promise<RegistryResponse>;
    },
    enabled: activeTab === "registry",
  });

  // Add server mutation
  const addMutation = useMutation({
    mutationFn: async (data: { name: string; config?: Partial<McpServer>; fromRegistry?: string }) => {
      const response = await fetch("/api/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add server");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Added MCP server "${variables.name}"`);
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      setInstallDialog({ open: false, name: "", envVars: {} });
      setAddCustomDialog(false);
      setCustomServer({ name: "", command: "", args: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove server mutation
  const removeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/mcp-servers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove server");
      }
      return response.json();
    },
    onSuccess: (_, name) => {
      toast.success(`Removed MCP server "${name}"`);
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Test server mutation
  const testMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/mcp-servers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to test server");
      }
      return response.json() as Promise<TestResult>;
    },
    onSuccess: (result, name) => {
      setTestResults((prev) => ({ ...prev, [name]: result }));
      if (result.success) {
        toast.success(`Server "${name}" is ${result.status}`);
      } else {
        toast.error(`Server "${name}" test failed: ${result.message}`);
      }
      setTestingServer(null);
    },
    onError: (error, name) => {
      setTestResults((prev) => ({
        ...prev,
        [name]: { success: false, status: "error", message: error.message },
      }));
      setTestingServer(null);
    },
  });

  const handleTest = (name: string) => {
    setTestingServer(name);
    testMutation.mutate(name);
  };

  const handleInstallFromRegistry = (server: RegistryServer) => {
    const envVars: Record<string, string> = {};
    server.envVars.forEach((v) => {
      envVars[v] = "";
    });
    setInstallDialog({
      open: true,
      server,
      name: server.id,
      envVars,
    });
  };

  const handleConfirmInstall = () => {
    if (!installDialog.server) return;

    addMutation.mutate({
      name: installDialog.name,
      fromRegistry: installDialog.server.id,
      config: {
        env: Object.fromEntries(
          Object.entries(installDialog.envVars).filter(([, v]) => v.trim())
        ),
      },
    });
  };

  const handleAddCustom = () => {
    addMutation.mutate({
      name: customServer.name,
      config: {
        command: customServer.command,
        args: customServer.args.split(" ").filter((a) => a.trim()),
      },
    });
  };

  const filteredRegistry = registry?.servers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (installedLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (installedError) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load MCP servers</AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const installedServers = Object.entries(installed?.servers || {});

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MCP Servers</h1>
            <p className="text-sm text-muted-foreground">
              Model Context Protocol servers extend Claude&apos;s capabilities
            </p>
          </div>
          <Button onClick={() => setAddCustomDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Custom
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="installed">
              Installed ({installedServers.length})
            </TabsTrigger>
            <TabsTrigger value="registry">Registry</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="space-y-4">
            {installedServers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Server className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No MCP servers installed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse the registry to add MCP servers
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("registry")}>
                    Browse Registry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {installedServers.map(([name, config]) => {
                  const testResult = testResults[name];
                  const isTesting = testingServer === name;

                  return (
                    <Card key={name}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">{name}</CardTitle>
                          </div>
                          {testResult && (
                            <Badge
                              variant="outline"
                              className={
                                testResult.success
                                  ? "border-green-500 text-green-500"
                                  : "border-red-500 text-red-500"
                              }
                            >
                              {testResult.success ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              {testResult.status}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs font-mono truncate">
                          {config.command} {config.args?.join(" ")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {config.env && Object.keys(config.env).length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1">
                            {Object.keys(config.env).map((key) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(name)}
                            disabled={isTesting}
                          >
                            {isTesting ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-3 w-3" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMutation.mutate(name)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="registry" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search MCP servers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {registryLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRegistry?.map((server) => {
                  const isInstalled = installedServers.some(([name]) => name === server.id);

                  return (
                    <Card key={server.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">{server.name}</CardTitle>
                          </div>
                          <Badge
                            variant="secondary"
                            className={CATEGORY_COLORS[server.category] || ""}
                          >
                            {server.category}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {server.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {server.envVars.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1">
                            {server.envVars.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleInstallFromRegistry(server)}
                          disabled={isInstalled || addMutation.isPending}
                        >
                          {isInstalled ? (
                            <>
                              <Check className="mr-2 h-3 w-3" />
                              Installed
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-3 w-3" />
                              Install
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Install from Registry Dialog */}
      <Dialog
        open={installDialog.open}
        onOpenChange={(open) => !open && setInstallDialog({ open: false, name: "", envVars: {} })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Install {installDialog.server?.name}
            </DialogTitle>
            <DialogDescription>
              {installDialog.server?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Server Name</Label>
              <Input
                value={installDialog.name}
                onChange={(e) =>
                  setInstallDialog((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Server name in settings.json"
              />
            </div>

            {installDialog.server?.envVars.map((envVar) => (
              <div key={envVar} className="space-y-2">
                <Label>{envVar}</Label>
                <Input
                  type="password"
                  value={installDialog.envVars[envVar] || ""}
                  onChange={(e) =>
                    setInstallDialog((prev) => ({
                      ...prev,
                      envVars: { ...prev.envVars, [envVar]: e.target.value },
                    }))
                  }
                  placeholder={`Enter ${envVar}`}
                />
              </div>
            ))}

            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground font-mono">
                {installDialog.server?.command} {installDialog.server?.args.join(" ")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInstallDialog({ open: false, name: "", envVars: {} })}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmInstall} disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Server Dialog */}
      <Dialog open={addCustomDialog} onOpenChange={setAddCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Add Custom MCP Server
            </DialogTitle>
            <DialogDescription>
              Add a custom MCP server by specifying the command to run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Server Name</Label>
              <Input
                value={customServer.name}
                onChange={(e) =>
                  setCustomServer((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="my-server"
              />
            </div>
            <div className="space-y-2">
              <Label>Command</Label>
              <Input
                value={customServer.command}
                onChange={(e) =>
                  setCustomServer((prev) => ({ ...prev, command: e.target.value }))
                }
                placeholder="npx"
              />
            </div>
            <div className="space-y-2">
              <Label>Arguments (space-separated)</Label>
              <Input
                value={customServer.args}
                onChange={(e) =>
                  setCustomServer((prev) => ({ ...prev, args: e.target.value }))
                }
                placeholder="-y @modelcontextprotocol/server-custom"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustomDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={
                !customServer.name ||
                !customServer.command ||
                addMutation.isPending
              }
            >
              {addMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
