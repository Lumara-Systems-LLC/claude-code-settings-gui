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
  SlidersHorizontal,
  BookOpen,
  Scale,
  Wand2,
  Bot,
  Webhook,
  FileCode,
  MessageSquare,
  HardDrive,
  FolderOpen,
  Folder,
  GitBranch,
  Server,
  Loader2,
  Terminal,
  Palette,
  Workflow,
  ClipboardList,
  BarChart3,
  Archive,
  Cpu,
  Network,
  House,
  Package,
  History,
  ScrollText,
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

type Page = { title: string; href: string; icon: typeof LayoutDashboard };

const pageGroups: { heading: string; pages: Page[] }[] = [
  {
    heading: "Overview",
    pages: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    heading: "Config",
    pages: [
      { title: "CLAUDE.md", href: "/config/claude-md", icon: FileText },
      { title: "settings.json", href: "/config/settings-json", icon: Settings },
      { title: "settings.local.json", href: "/config/settings-local", icon: SlidersHorizontal },
      { title: "README", href: "/config/readme", icon: BookOpen },
      { title: "Architecture", href: "/config/system-architecture", icon: Network },
      { title: "Host", href: "/config/host", icon: House },
    ],
  },
  {
    heading: "Artifacts",
    pages: [
      { title: "Rules", href: "/artifacts/rules", icon: Scale },
      { title: "Skills", href: "/artifacts/skills", icon: Wand2 },
      { title: "Agents", href: "/artifacts/agents", icon: Bot },
      { title: "Hooks", href: "/artifacts/hooks", icon: Webhook },
      { title: "Commands", href: "/artifacts/commands", icon: Terminal },
      { title: "Output Styles", href: "/artifacts/output-styles", icon: Palette },
      { title: "Workflows", href: "/artifacts/workflows", icon: Workflow },
      { title: "Templates", href: "/artifacts/templates", icon: FileCode },
      { title: "Prompts", href: "/artifacts/prompts", icon: MessageSquare },
    ],
  },
  {
    heading: "Integrations",
    pages: [
      { title: "MCP Servers", href: "/integrations/mcp-servers", icon: Server },
      { title: "Plugins", href: "/integrations/plugins", icon: Package },
      { title: "Projects", href: "/integrations/projects", icon: FolderOpen },
      { title: "Git", href: "/integrations/git", icon: GitBranch },
    ],
  },
  {
    heading: "Data",
    pages: [
      { title: "Files", href: "/data/files", icon: Folder },
      { title: "Plans", href: "/data/plans", icon: ClipboardList },
      { title: "Storage", href: "/data/storage", icon: HardDrive },
      { title: "Backups", href: "/data/backups", icon: Archive },
    ],
  },
  {
    heading: "Insights",
    pages: [
      { title: "Usage Stats", href: "/insights/usage-stats", icon: BarChart3 },
      { title: "Slash Commands", href: "/insights/commands-index", icon: Cpu },
      { title: "Hook Metrics", href: "/insights/hooks", icon: Webhook },
      { title: "History", href: "/insights/history", icon: History },
      { title: "Audit Log", href: "/insights/audit", icon: ScrollText },
    ],
  },
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
  rule: (name) => `/artifacts/rules/${encodeURIComponent(name)}`,
  skill: (name) => `/artifacts/skills/${encodeURIComponent(name)}`,
  agent: (name) => `/artifacts/agents/${encodeURIComponent(name)}`,
  template: (name) => `/artifacts/templates/${encodeURIComponent(name)}`,
  prompt: (name) => `/artifacts/prompts/${encodeURIComponent(name)}`,
  hook: (name) => `/artifacts/hooks/${encodeURIComponent(name)}`,
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

  // Filter pages by query, preserving group structure
  const filteredGroups = query
    ? pageGroups
        .map((g) => ({
          ...g,
          pages: g.pages.filter((p) =>
            p.title.toLowerCase().includes(query.toLowerCase())
          ),
        }))
        .filter((g) => g.pages.length > 0)
    : pageGroups;

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

        {/* Static pages, grouped by top-level section */}
        {filteredGroups.map((group, idx) => (
          <div key={group.heading}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.heading}>
              {group.pages.map((page) => (
                <CommandItem
                  key={page.href}
                  onSelect={() => runCommand(() => router.push(page.href))}
                >
                  <page.icon className="mr-2 h-4 w-4" />
                  {page.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}

        {!query && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/config/claude-md"))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Edit CLAUDE.md
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/config/settings-json"))}
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/data/storage"))}
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
