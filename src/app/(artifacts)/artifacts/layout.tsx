import { MainLayout } from "@/components/layout";
import { ArtifactTabs } from "@/components/layout/artifact-tabs";

export default function ArtifactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <ArtifactTabs />
        {children}
      </div>
    </MainLayout>
  );
}
