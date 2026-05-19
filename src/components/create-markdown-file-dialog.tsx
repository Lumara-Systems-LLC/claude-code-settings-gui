"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  apiPath: string;
  queryKey: string;
  routePrefix: string;
  destinationLabel: (filename: string) => string;
  contentTemplate?: (name: string, title: string) => string;
};

export function CreateMarkdownFileDialog({
  buttonLabel,
  dialogTitle,
  dialogDescription,
  apiPath,
  queryKey,
  routePrefix,
  destinationLabel,
  contentTemplate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { filename: string; content: string }) => {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create file");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(`Created ${variables.filename}`);
      setOpen(false);
      setFilename("");
      setTitle("");
      router.push(`${routePrefix}/${encodeURIComponent(variables.filename)}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) return;

    const finalFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
    const baseName = finalFilename.replace(/\.md$/, "");
    const heading =
      title ||
      baseName
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const content = contentTemplate
      ? contentTemplate(baseName, heading)
      : `# ${heading}\n\nAdd content here.\n`;

    createMutation.mutate({ filename: finalFilename, content });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) =>
                  setFilename(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, "-"))
                }
                placeholder="my-file.md"
                required
              />
              <p className="text-xs text-muted-foreground">
                {destinationLabel(filename || "filename")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Display title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!filename.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
