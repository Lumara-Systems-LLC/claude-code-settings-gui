import {
  LayoutDashboard,
  Settings,
  Wand2,
  Network,
  Folder,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type TopLevelNav = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Route prefixes that should highlight this top-level item. */
  matches: string[];
};

export const TOP_LEVEL_NAV: TopLevelNav[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
    matches: ["/"],
  },
  {
    title: "Config",
    href: "/config/claude-md",
    icon: Settings,
    matches: ["/config"],
  },
  {
    title: "Artifacts",
    href: "/artifacts/rules",
    icon: Wand2,
    matches: ["/artifacts"],
  },
  {
    title: "Integrations",
    href: "/integrations/mcp-servers",
    icon: Network,
    matches: ["/integrations"],
  },
  {
    title: "Data",
    href: "/data/files",
    icon: Folder,
    matches: ["/data"],
  },
  {
    title: "Insights",
    href: "/insights/usage-stats",
    icon: BarChart3,
    matches: ["/insights"],
  },
];

export function isTopLevelActive(item: TopLevelNav, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  return item.matches.some(
    (m) => pathname === m || pathname.startsWith(`${m}/`)
  );
}
