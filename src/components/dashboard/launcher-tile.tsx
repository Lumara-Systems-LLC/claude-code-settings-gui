"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LauncherTileProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string | number;
}

export function LauncherTile({ href, icon, title, subtitle, badge }: LauncherTileProps) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardContent className="flex flex-col gap-2 py-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">{icon}</div>
            {badge !== undefined && badge !== "" && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
