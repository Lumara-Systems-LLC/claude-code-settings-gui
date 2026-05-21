"use client";

import { SystemHealthCard } from "./system-health-card";
import { GitStatusCard } from "./git-status-card";
import { HookHealthCard } from "./hook-health-card";

export function HealthStrip() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SystemHealthCard />
      <GitStatusCard />
      <HookHealthCard />
    </div>
  );
}
