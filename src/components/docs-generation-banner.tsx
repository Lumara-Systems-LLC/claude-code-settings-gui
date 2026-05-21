"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FilePlus, FileText, Server, X } from "lucide-react";
import { toast } from "sonner";

type DocFileKey = "hostMd" | "systemArchitecture";

interface DocInfo {
  key: DocFileKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const DOC_FILES: DocInfo[] = [
  {
    key: "hostMd",
    label: "HOST.md",
    description: "Machine-specific docs (hardware, networking, local services)",
    icon: <Server className="h-4 w-4" />,
  },
  {
    key: "systemArchitecture",
    label: "SYSTEM_ARCHITECTURE.md",
    description: "Technical docs of your Claude Code system",
    icon: <FileText className="h-4 w-4" />,
  },
];

const DISMISSED_KEY = "docs-generation-banner-dismissed";

export function DocsGenerationBanner() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery<{ missingDocs: DocFileKey[] }>({
    queryKey: ["docs-generate-missing"],
    queryFn: async () => {
      const res = await fetch("/api/docs-generate");
      if (!res.ok) throw new Error("Failed to check docs status");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (selected: DocFileKey[]) => {
      const res = await fetch("/api/docs-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate docs");
      }
      return res.json();
    },
    onSuccess: (result) => {
      setDialogOpen(false);
      setDismissed(true);
      try {
        localStorage.setItem(DISMISSED_KEY, "true");
      } catch { /* ignore */ }

      const generated = result.generated.join(", ");
      toast.success(`Generated: ${generated}`);

      if (result.skipped?.length) {
        const skipped = result.skipped.join(", ");
        toast.info(`Skipped: ${skipped}`);
      }

      queryClient.invalidateQueries({ queryKey: ["docs-generate-missing"] });
      queryClient.invalidateQueries({ queryKey: ["host"] });
      queryClient.invalidateQueries({ queryKey: ["system-architecture"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Respect dismissal
  if (typeof window !== "undefined" && !dismissed) {
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "true") {
        setDismissed(true);
      }
    } catch { /* ignore */ }
  }

  if (isLoading || !data || dismissed || data.missingDocs.length === 0) {
    return null;
  }

  const missingInfo = DOC_FILES.filter((d) => data.missingDocs.includes(d.key));

  return (
    <>
      <Alert variant="default" className="border-blue-500/50 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <FilePlus className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <AlertTitle className="text-base flex items-center gap-2">
              Documentation files missing
              <div className="flex gap-1">
                {missingInfo.map((d) => (
                  <Badge key={d.key} variant="secondary" className="text-xs">
                    {d.label}
                  </Badge>
                ))}
              </div>
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                Claude Code works better when it understands your environment.
                Generate starter templates for the missing documentation files below.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Generate templates
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={() => {
                    setDismissed(true);
                    try {
                      localStorage.setItem(DISMISSED_KEY, "true");
                    } catch { /* ignore */ }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-primary" />
              Generate Documentation Templates
            </DialogTitle>
            <DialogDescription>
              Select which files to create. Existing files will never be overwritten.
            </DialogDescription>
          </DialogHeader>

          <DocsSelectionForm
            missingDocs={data.missingDocs}
            onGenerate={(selected) => generateMutation.mutate(selected)}
            isGenerating={generateMutation.isPending}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DocsSelectionFormProps {
  missingDocs: DocFileKey[];
  onGenerate: (selected: DocFileKey[]) => void;
  isGenerating: boolean;
  onCancel: () => void;
}

function DocsSelectionForm({ missingDocs, onGenerate, isGenerating, onCancel }: DocsSelectionFormProps) {
  const [selected, setSelected] = useState<Set<DocFileKey>>(
    new Set(missingDocs)
  );

  const toggle = (key: DocFileKey) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  return (
    <>
      <div className="space-y-3 py-2">
        {DOC_FILES.filter((d) => missingDocs.includes(d.key)).map((doc) => (
          <div
            key={doc.key}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <Checkbox
              id={doc.key}
              checked={selected.has(doc.key)}
              onCheckedChange={() => toggle(doc.key)}
            />
            <label htmlFor={doc.key} className="flex-1 cursor-pointer space-y-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                {doc.icon}
                {doc.label}
              </div>
              <p className="text-xs text-muted-foreground">
                {doc.description}
              </p>
            </label>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onGenerate([...selected])}
          disabled={selected.size === 0 || isGenerating}
        >
          <FilePlus className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : `Generate ${selected.size} file${selected.size !== 1 ? "s" : ""}`}
        </Button>
      </DialogFooter>
    </>
  );
}
