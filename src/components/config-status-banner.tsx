"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FolderPlus, FolderX, Rocket } from "lucide-react";
import { toast } from "sonner";
import { StarterPackDialog } from "@/components/onboarding/starter-pack-dialog";

type ConfigStatus = {
  configDir: string;
  exists: boolean;
  isEmpty: boolean;
  isDemo: boolean;
  missing: string[];
  present: string[];
};

export function ConfigStatusBanner() {
  const queryClient = useQueryClient();
  const [starterPackOpen, setStarterPackOpen] = useState(false);

  const { data, isLoading } = useQuery<ConfigStatus>({
    queryKey: ["config-status"],
    queryFn: async () => {
      const res = await fetch("/api/config-status");
      if (!res.ok) throw new Error("Failed to fetch config status");
      return res.json();
    },
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/config-status", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to initialize");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Config directory initialized");
      queryClient.invalidateQueries({ queryKey: ["config-status"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data || data.isDemo) return null;
  if (data.exists && data.missing.length === 0) return null;

  const isMissing = !data.exists;
  const isEmpty = data.exists && data.isEmpty;

  return (
    <>
      <Alert variant="default" className="border-orange-500/50 bg-orange-500/5">
        <div className="flex items-start gap-3">
          {isMissing ? (
            <FolderX className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          ) : (
            <FolderPlus className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-2">
            <AlertTitle className="text-base">
              {isMissing
                ? "Claude config directory not found"
                : isEmpty
                  ? "Claude config directory is empty"
                  : "Claude config is partially set up"}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <div>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {data.configDir}
                </code>
                {!isMissing && data.missing.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    Missing: {data.missing.join(", ")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(isMissing || isEmpty) && (
                  <Button
                    size="sm"
                    onClick={() => initMutation.mutate()}
                    disabled={initMutation.isPending}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    {initMutation.isPending
                      ? "Creating..."
                      : isMissing
                        ? "Create directory & seed minimal config"
                        : "Seed minimal config"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStarterPackOpen(true)}
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Browse starter packs
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the <code className="bg-muted px-1 rounded">CLAUDE_CONFIG_DIR</code> environment
                variable or pass <code className="bg-muted px-1 rounded">--config-dir</code> to point at a
                different location.
              </p>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <StarterPackDialog
        open={starterPackOpen}
        onOpenChange={setStarterPackOpen}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["config-status"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />
    </>
  );
}
