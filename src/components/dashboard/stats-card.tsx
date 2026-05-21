"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  href: string;
  infoTip?: React.ReactNode;
  tourStep?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  href,
  infoTip,
  tourStep,
}: StatsCardProps) {
  return (
    <Link href={href} data-tour-step={tourStep}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {infoTip}
          </div>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
