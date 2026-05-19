"use client";

import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
import { BarChart3, Cpu, Webhook, History, ScrollText } from "lucide-react";

const INSIGHTS_TABS = [
  { href: "/insights/usage-stats", title: "Usage Stats", icon: BarChart3 },
  { href: "/insights/commands-index", title: "Slash Commands", icon: Cpu },
  { href: "/insights/hooks", title: "Hook Metrics", icon: Webhook },
  { href: "/insights/history", title: "History", icon: History },
  { href: "/insights/audit", title: "Audit Log", icon: ScrollText },
];

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SectionTabs tabs={INSIGHTS_TABS} ariaLabel="Insights" />
        {children}
      </div>
    </MainLayout>
  );
}
