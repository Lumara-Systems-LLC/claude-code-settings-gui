"use client";

import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
import {
  FileText,
  Settings,
  SlidersHorizontal,
  BookOpen,
  House,
  Network,
} from "lucide-react";

const CONFIG_TABS = [
  { href: "/config/claude-md", title: "CLAUDE.md", icon: FileText },
  { href: "/config/settings-json", title: "settings.json", icon: Settings },
  { href: "/config/settings-local", title: "settings.local.json", icon: SlidersHorizontal },
  { href: "/config/readme", title: "README", icon: BookOpen },
  { href: "/config/host", title: "Host", icon: House },
  { href: "/config/system-architecture", title: "Architecture", icon: Network },
];

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SectionTabs tabs={CONFIG_TABS} ariaLabel="Configuration files" />
        {children}
      </div>
    </MainLayout>
  );
}
