"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap = {
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
};

type IconName = keyof typeof iconMap;

type NavItem = {
  title: string;
  href: string;
  icon: IconName;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navItems: (NavItem | NavGroup)[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    title: "Settings",
    items: [
      { title: "CLAUDE.md", href: "/claude-md", icon: "FileText" },
      { title: "settings.json", href: "/settings-json", icon: "Settings" },
      { title: "README", href: "/readme", icon: "BookOpen" },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Rules", href: "/rules", icon: "Scale" },
      { title: "Skills", href: "/skills", icon: "Wand2" },
      { title: "Agents", href: "/agents", icon: "Bot" },
      { title: "Hooks", href: "/hooks", icon: "Webhook" },
      { title: "Templates", href: "/templates", icon: "FileCode" },
      { title: "Prompts", href: "/prompts", icon: "MessageSquare" },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Storage", href: "/storage", icon: "HardDrive" },
      { title: "Projects", href: "/projects", icon: "FolderOpen" },
      { title: "Git", href: "/git", icon: "GitBranch" },
    ],
  },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const Icon = iconMap[item.icon];
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.title}
    </Link>
  );
}

function NavGroupComponent({ group }: { group: NavGroup }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const hasActiveChild = group.items.some((item) => pathname === item.href);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActiveChild
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {group.title}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div className="ml-2 space-y-1 border-l pl-3">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
      <ScrollArea className="h-full py-4">
        <div className="px-3 py-2">
          <h2 className="mb-4 px-3 text-lg font-semibold tracking-tight">
            Claude Code
          </h2>
          <nav className="space-y-2">
            {navItems.map((item) =>
              isNavGroup(item) ? (
                <NavGroupComponent key={item.title} group={item} />
              ) : (
                <NavLink key={item.href} item={item} />
              )
            )}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  );
}
