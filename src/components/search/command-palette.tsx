"use client";

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
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  { title: "Storage", href: "/storage", icon: HardDrive },
  { title: "Projects", href: "/projects", icon: FolderOpen },
  { title: "Git", href: "/git", icon: GitBranch },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type to search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>
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
      </CommandList>
    </CommandDialog>
  );
}
