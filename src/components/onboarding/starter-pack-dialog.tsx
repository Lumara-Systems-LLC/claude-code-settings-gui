"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Leaf,
  Code,
  Layers,
  Loader2,
  Check,
  AlertTriangle,
  FileText,
  Settings,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";

interface StarterPackInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  fileCount: number;
  hasSettings: boolean;
}

interface StarterPacksResponse {
  packs: StarterPackInfo[];
  hasExistingConfig: boolean;
  isDemo: boolean;
}

interface ApplyResult {
  success: boolean;
  pack: { id: string; name: string };
  mode: string;
  createdFiles: string[];
  skippedFiles: string[];
  settingsResult: "created" | "merged" | "skipped";
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Leaf: <Leaf className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
  Layers: <Layers className="h-5 w-5" />,
};

interface StarterPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function StarterPackDialog({
  open,
  onOpenChange,
  onComplete,
}: StarterPackDialogProps) {
  const [selectedPack, setSelectedPack] = useState<string>("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<StarterPacksResponse>({
    queryKey: ["starter-packs"],
    queryFn: async () => {
      const res = await fetch("/api/starter-packs");
      if (!res.ok) throw new Error("Failed to fetch starter packs");
      return res.json();
    },
    enabled: open,
  });

  const applyMutation = useMutation<ApplyResult, Error, { packId: string; mode: string }>({
    mutationFn: async ({ packId, mode }) => {
      const res = await fetch("/api/starter-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to apply starter pack");
      }
      return res.json();
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      queryClient.invalidateQueries({ queryKey: ["claude-md"] });

      const filesCreated = result.createdFiles.length;
      const filesSkipped = result.skippedFiles.length;

      toast.success(`Applied "${result.pack.name}" starter pack`, {
        description: `Created ${filesCreated} file${filesCreated !== 1 ? "s" : ""}${
          filesSkipped > 0 ? `, skipped ${filesSkipped} existing` : ""
        }`,
      });

      onOpenChange(false);
      onComplete?.();
    },
    onError: (error) => {
      toast.error("Failed to apply starter pack", {
        description: error.message,
      });
    },
  });

  const handleApply = () => {
    if (!selectedPack) {
      toast.error("Please select a starter pack");
      return;
    }
    applyMutation.mutate({ packId: selectedPack, mode });
  };

  const selectedPackInfo = data?.packs.find((p) => p.id === selectedPack);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="h-5 w-5 text-primary" />
            Quick Start Setup
          </DialogTitle>
          <DialogDescription>
            Choose a starter pack to bootstrap your Claude Code configuration.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.isDemo ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Starter packs are not available in demo mode.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {data?.hasExistingConfig && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have existing configuration. Choose &quot;Merge&quot; to add new files
                  without overwriting, or &quot;Replace&quot; to start fresh (creates backup).
                </AlertDescription>
              </Alert>
            )}

            <RadioGroup
              value={selectedPack}
              onValueChange={setSelectedPack}
              className="space-y-3"
            >
              {data?.packs.map((pack) => (
                <div
                  key={pack.id}
                  className={`relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedPack === pack.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedPack(pack.id)}
                >
                  <RadioGroupItem value={pack.id} id={pack.id} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                        {ICON_MAP[pack.icon] || <FileText className="h-5 w-5" />}
                      </div>
                      <Label htmlFor={pack.id} className="font-medium cursor-pointer">
                        {pack.name}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{pack.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {pack.fileCount} files
                      </Badge>
                      {pack.hasSettings && (
                        <Badge variant="secondary" className="text-xs">
                          <Settings className="h-3 w-3 mr-1" />
                          permissions
                        </Badge>
                      )}
                      {pack.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {data?.hasExistingConfig && selectedPack && (
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">Apply mode:</Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as "merge" | "replace")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="cursor-pointer">
                      Merge (keep existing)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="cursor-pointer">
                      Replace (backup & overwrite)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {selectedPackInfo && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">This will create:</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• CLAUDE.md with basic instructions</li>
                  {selectedPackInfo.id !== "minimal" && (
                    <>
                      <li>• Development rules in rules/</li>
                      <li>• Workflow skills in skills/</li>
                    </>
                  )}
                  {selectedPackInfo.hasSettings && (
                    <li>• Permissions in settings.json</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedPack || applyMutation.isPending || data?.isDemo}
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply Starter Pack
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
