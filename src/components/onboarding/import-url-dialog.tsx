"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Loader2,
  Check,
  AlertTriangle,
  Github,
  FileArchive,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  source: string;
  type: "file" | "archive" | "repo";
  createdFiles: string[];
  errors: string[];
}

interface ImportUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function ImportUrlDialog({
  open,
  onOpenChange,
  onComplete,
}: ImportUrlDialogProps) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const queryClient = useQueryClient();

  const importMutation = useMutation<ImportResult, Error, { url: string; mode: string }>({
    mutationFn: async ({ url, mode }) => {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import");
      }
      return res.json();
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      queryClient.invalidateQueries({ queryKey: ["claude-md"] });

      if (result.success) {
        toast.success("Import successful", {
          description: `Imported ${result.createdFiles.length} file${
            result.createdFiles.length !== 1 ? "s" : ""
          }`,
        });
        setUrl("");
        onOpenChange(false);
        onComplete?.();
      } else {
        toast.error("Import had errors", {
          description: result.errors.join(", "),
        });
      }
    },
    onError: (error) => {
      toast.error("Import failed", {
        description: error.message,
      });
    },
  });

  const handleImport = () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    importMutation.mutate({ url: url.trim(), mode });
  };

  const getUrlType = (url: string): { type: string; icon: React.ReactNode } | null => {
    if (!url.trim()) return null;

    if (url.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/)) {
      return { type: "GitHub Repository", icon: <Github className="h-4 w-4" /> };
    }
    if (url.endsWith(".tar.gz") || url.endsWith(".tgz")) {
      return { type: "Archive (.tar.gz)", icon: <FileArchive className="h-4 w-4" /> };
    }
    if (url.endsWith(".md") || url.endsWith(".json")) {
      return { type: "Single File", icon: <FileText className="h-4 w-4" /> };
    }
    if (url.includes("github.com") && url.includes("/blob/")) {
      return { type: "GitHub File", icon: <Github className="h-4 w-4" /> };
    }
    return null;
  };

  const urlType = getUrlType(url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5 text-primary" />
            Import from URL
          </DialogTitle>
          <DialogDescription>
            Import Claude Code configuration from a GitHub repository, archive, or file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-url">URL</Label>
            <Input
              id="import-url"
              type="url"
              placeholder="https://github.com/user/repo or .tar.gz URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={importMutation.isPending}
            />
            {urlType && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {urlType.icon}
                <span>Detected: {urlType.type}</span>
              </div>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Supported formats:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>GitHub repo: <code>https://github.com/user/repo</code> (imports .claude folder)</li>
                <li>Archive: <code>.tar.gz</code> backup file URL</li>
                <li>Single file: <code>.md</code> or <code>.json</code> file URL</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Import mode:</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "merge" | "replace")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="merge" id="import-merge" />
                <Label htmlFor="import-merge" className="cursor-pointer">
                  Merge (skip existing files)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="replace" id="import-replace" />
                <Label htmlFor="import-replace" className="cursor-pointer">
                  Replace (overwrite)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {importMutation.isSuccess && importMutation.data && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm">
              <p className="font-medium text-green-700 dark:text-green-400 mb-1">
                Imported {importMutation.data.createdFiles.length} files:
              </p>
              <ul className="text-muted-foreground space-y-0.5 max-h-32 overflow-auto">
                {importMutation.data.createdFiles.map((file) => (
                  <li key={file}>• {file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!url.trim() || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
