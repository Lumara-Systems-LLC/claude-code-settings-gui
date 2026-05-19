"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigStatus = {
  configDir: string;
  exists: boolean;
  isEmpty: boolean;
  isDemo: boolean;
  missing: string[];
  present: string[];
};

type Health = "green" | "yellow" | "red";

function deriveHealth(data: ConfigStatus): { level: Health; label: string } {
  if (!data.exists) return { level: "red", label: "Config dir missing" };
  if (data.isEmpty) return { level: "red", label: "Config dir empty" };
  if (data.missing.length > 0)
    return {
      level: "yellow",
      label: `${data.missing.length} item${data.missing.length === 1 ? "" : "s"} missing`,
    };
  return { level: "green", label: "All expected files present" };
}

const dotClass: Record<Health, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function SystemHealthCard() {
  const { data, isLoading, isError } = useQuery<ConfigStatus>({
    queryKey: ["config-status"],
    queryFn: async () => {
      const res = await fetch("/api/config-status");
      if (!res.ok) throw new Error("Failed to fetch config status");
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <Link href="/config/settings-json">
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : isError || !data ? (
            <p className="text-sm text-muted-foreground">Unavailable</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", dotClass[deriveHealth(data).level])}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{deriveHealth(data).label}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground" title={data.configDir}>
                {data.configDir}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
