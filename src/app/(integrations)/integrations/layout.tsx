"use client";

import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
import { Server, Package, FolderOpen, GitBranch } from "lucide-react";

const INTEGRATIONS_TABS = [
  { href: "/integrations/mcp-servers", title: "MCP Servers", icon: Server },
  { href: "/integrations/plugins", title: "Plugins", icon: Package },
  { href: "/integrations/projects", title: "Projects", icon: FolderOpen },
  { href: "/integrations/git", title: "Git", icon: GitBranch },
];

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SectionTabs tabs={INTEGRATIONS_TABS} ariaLabel="Integrations" />
        {children}
      </div>
    </MainLayout>
  );
}
