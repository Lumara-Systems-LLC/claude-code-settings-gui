"use client";

import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
import { Folder, ClipboardList, HardDrive, Archive } from "lucide-react";

const DATA_TABS = [
  { href: "/data/files", title: "Files", icon: Folder },
  { href: "/data/plans", title: "Plans", icon: ClipboardList },
  { href: "/data/storage", title: "Storage", icon: HardDrive },
  { href: "/data/backups", title: "Backups", icon: Archive },
];

export default function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SectionTabs tabs={DATA_TABS} ariaLabel="Data and files" />
        {children}
      </div>
    </MainLayout>
  );
}
