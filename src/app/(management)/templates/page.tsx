"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileCode, Wand2, FileText, Bot, Webhook, Server, Shield, Search, Copy, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Template, TemplateCategory } from "@/types/template";

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

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Ready-to-use templates for skills, rules, agents, and more
          </p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyTemplate(template)}
                          >
                            {copiedId === template.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
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
      </div>
    </MainLayout>
  );
}
