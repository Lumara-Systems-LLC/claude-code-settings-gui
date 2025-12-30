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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetClose } from "@/components/ui/sheet";

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
    <SheetClose asChild>
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
    </SheetClose>
  );
}

function NavGroupComponent({ group }: { group: NavGroup }) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
        {group.title}
      </div>
      <div className="ml-2 space-y-1 border-l pl-3">
        {group.items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}

export function MobileSidebar() {
  return (
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
  );
}
