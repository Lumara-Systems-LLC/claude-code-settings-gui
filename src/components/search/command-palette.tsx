"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FileText,
  Settings,
  BookOpen,
  Scale,
  Wand2,
  Bot,
  Webhook,
  FileCode,
  MessageSquare,
  HardDrive,
  FolderOpen,
  GitBranch,
  Server,
  Loader2,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: "rule" | "skill" | "agent" | "template" | "prompt" | "hook";
  name: string;
  path: string;
  score?: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
}

const pages = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "CLAUDE.md", href: "/claude-md", icon: FileText },
  { title: "settings.json", href: "/settings-json", icon: Settings },
  { title: "README", href: "/readme", icon: BookOpen },
  { title: "Rules", href: "/rules", icon: Scale },
  { title: "Skills", href: "/skills", icon: Wand2 },
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Hooks", href: "/hooks", icon: Webhook },
  { title: "Templates", href: "/templates", icon: FileCode },
  { title: "Prompts", href: "/prompts", icon: MessageSquare },
  { title: "MCP Servers", href: "/mcp-servers", icon: Server },
  { title: "Storage", href: "/storage", icon: HardDrive },
  { title: "Projects", href: "/projects", icon: FolderOpen },
  { title: "Git", href: "/git", icon: GitBranch },
];

const typeIcons: Record<SearchResult["type"], typeof Scale> = {
  rule: Scale,
  skill: Wand2,
  agent: Bot,
  template: FileCode,
  prompt: MessageSquare,
  hook: Webhook,
};

const typeRoutes: Record<SearchResult["type"], (name: string) => string> = {
  rule: (name) => `/rules/${encodeURIComponent(name)}`,
  skill: (name) => `/skills/${encodeURIComponent(name)}`,
  agent: (name) => `/agents/${encodeURIComponent(name)}`,
  template: (name) => `/templates/${encodeURIComponent(name)}`,
  prompt: (name) => `/prompts/${encodeURIComponent(name)}`,
  hook: (name) => `/hooks/${encodeURIComponent(name)}`,
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      setQuery("");
      setSearchResults([]);
      command();
    },
    [onOpenChange]
  );

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data: SearchResponse = await response.json();
          setSearchResults(data.results);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search failed:", error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Filter pages by query for static navigation
  const filteredPages = query
    ? pages.filter((page) =>
        page.title.toLowerCase().includes(query.toLowerCase())
      )
    : pages;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, skills, rules, agents..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {/* Dynamic search results */}
        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {searchResults.map((result) => {
                const Icon = typeIcons[result.type];
                const href = typeRoutes[result.type](result.name);
                return (
                  <CommandItem
                    key={`${result.type}-${result.name}`}
                    onSelect={() => runCommand(() => router.push(href))}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{result.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {result.type}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Static pages */}
        <CommandGroup heading="Pages">
          {filteredPages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>

        {!query && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/claude-md"))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Edit CLAUDE.md
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/settings-json"))}
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/storage"))}
              >
                <HardDrive className="mr-2 h-4 w-4" />
                View Storage
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
