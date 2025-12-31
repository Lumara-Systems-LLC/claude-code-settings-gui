"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, FileCode, Wand2, FileText, Bot, Webhook, Server, Shield, Search, Copy, Check, Download, Loader2, Link as LinkIcon, Rocket } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Template, TemplateCategory } from "@/types/template";
import { ImportUrlDialog } from "@/components/onboarding/import-url-dialog";
import { StarterPackDialog } from "@/components/onboarding/starter-pack-dialog";

interface TemplateListItem {
  name: string;
  path: string;
  size: string;
  lastModified: string;
}

interface GalleryResponse {
  templates: Template[];
  categories: TemplateCategory[];
  total: number;
}

const CATEGORY_ICONS: Record<string, typeof Wand2> = {
  skill: Wand2,
  rule: FileText,
  agent: Bot,
  hook: Webhook,
  "mcp-server": Server,
  permission: Shield,
};

interface ImportResult {
  success: boolean;
  type: "file-created" | "settings-merge";
  path?: string;
  name?: string;
  category?: string;
  content?: string;
  message?: string;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("gallery");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [starterPackOpen, setStarterPackOpen] = useState(false);
  const [settingsMergeDialog, setSettingsMergeDialog] = useState<{ open: boolean; content: string; message: string }>({
    open: false,
    content: "",
    message: "",
  });

  const importMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import template");
      }
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      if (result.type === "settings-merge") {
        // Show dialog with content to copy
        setSettingsMergeDialog({
          open: true,
          content: result.content || "",
          message: result.message || "Copy this to your settings.json",
        });
      } else {
        toast.success(`Imported "${result.name}" to ${result.category}s`);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        queryClient.invalidateQueries({ queryKey: ["agents"] });
        queryClient.invalidateQueries({ queryKey: ["rules"] });
        queryClient.invalidateQueries({ queryKey: ["hooks"] });
      }
      setImportingId(null);
    },
    onError: (error) => {
      toast.error(error.message);
      setImportingId(null);
    },
  });

  const handleImport = (template: Template) => {
    setImportingId(template.id);
    importMutation.mutate(template.id);
  };

  const copySettingsContent = async () => {
    await navigator.clipboard.writeText(settingsMergeDialog.content);
    toast.success("Copied to clipboard");
    setSettingsMergeDialog({ open: false, content: "", message: "" });
  };

  const { data: userTemplates, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["templates", "user"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to load templates");
      return response.json() as Promise<TemplateListItem[]>;
    },
    enabled: activeTab === "user",
  });

  const { data: gallery, isLoading: galleryLoading } = useQuery({
    queryKey: ["templates", "gallery", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: "gallery" });
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("q", searchQuery);
      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error("Failed to load gallery");
      return response.json() as Promise<GalleryResponse>;
    },
    enabled: activeTab === "gallery",
  });

  const copyTemplate = async (template: Template) => {
    await navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    toast.success(`Copied "${template.name}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-sm text-muted-foreground">
              Ready-to-use templates for skills, rules, agents, and more
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportUrlOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Import from URL
            </Button>
            <Button onClick={() => setStarterPackOpen(true)}>
              <Rocket className="h-4 w-4 mr-2" />
              Starter Packs
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="user">My Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            {/* Search and filter */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {gallery?.categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || FileCode;
                  return (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {cat.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Gallery grid */}
            {galleryLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {gallery?.templates.map((template) => {
                  const Icon = CATEGORY_ICONS[template.category] || FileCode;
                  return (
                    <Card key={template.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">{template.name}</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleImport(template)}
                              disabled={importingId === template.id}
                              title="Import to ~/.claude"
                            >
                              {importingId === template.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyTemplate(template)}
                              title="Copy to clipboard"
                            >
                              {copiedId === template.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto pt-2">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {gallery?.templates.length === 0 && !galleryLoading && (
              <div className="py-12 text-center text-muted-foreground">
                No templates found matching your search.
              </div>
            )}
          </TabsContent>

          <TabsContent value="user" className="space-y-4">
            {userError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load templates. Make sure the directory exists at ~/.claude/templates/
                </AlertDescription>
              </Alert>
            ) : userLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : userTemplates && userTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userTemplates.map((template) => (
                  <Link
                    key={template.name}
                    href={`/templates/${encodeURIComponent(template.name)}`}
                  >
                    <Card className="h-full transition-colors hover:bg-accent/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">
                            {template.name.replace(".md", "")}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{template.size}</span>
                          <span>
                            {new Date(template.lastModified).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No templates found in ~/.claude/templates/
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Settings Merge Dialog */}
        <Dialog open={settingsMergeDialog.open} onOpenChange={(open) => !open && setSettingsMergeDialog({ open: false, content: "", message: "" })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Copy to Settings</DialogTitle>
              <DialogDescription>
                {settingsMergeDialog.message}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4">
              <pre className="text-sm">{settingsMergeDialog.content}</pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsMergeDialog({ open: false, content: "", message: "" })}>
                Cancel
              </Button>
              <Button onClick={copySettingsContent}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import from URL Dialog */}
        <ImportUrlDialog
          open={importUrlOpen}
          onOpenChange={setImportUrlOpen}
        />

        {/* Starter Packs Dialog */}
        <StarterPackDialog
          open={starterPackOpen}
          onOpenChange={setStarterPackOpen}
        />
      </div>
    </MainLayout>
  );
}
