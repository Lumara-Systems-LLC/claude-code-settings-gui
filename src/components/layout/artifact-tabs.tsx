"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Scale,
  Wand2,
  Bot,
  Webhook,
  Terminal,
  Palette,
  Workflow,
  FileCode,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

type ArtifactTab = {
  kind: string;
  title: string;
  icon: LucideIcon;
};

export const ARTIFACT_TABS: ArtifactTab[] = [
  { kind: "rules", title: "Rules", icon: Scale },
  { kind: "skills", title: "Skills", icon: Wand2 },
  { kind: "agents", title: "Agents", icon: Bot },
  { kind: "hooks", title: "Hooks", icon: Webhook },
  { kind: "commands", title: "Commands", icon: Terminal },
  { kind: "output-styles", title: "Output Styles", icon: Palette },
  { kind: "workflows", title: "Workflows", icon: Workflow },
  { kind: "templates", title: "Templates", icon: FileCode },
  { kind: "prompts", title: "Prompts", icon: MessageSquare },
];

export function ArtifactTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Artifact types"
      className="-mx-1 flex gap-1 overflow-x-auto border-b pb-2"
    >
      {ARTIFACT_TABS.map((tab) => {
        const Icon = tab.icon;
        const href = `/artifacts/${tab.kind}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.kind}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}
