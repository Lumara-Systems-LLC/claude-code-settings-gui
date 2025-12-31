"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { helpContent } from "@/lib/help-content";
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

export function CreateRuleDialog() {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { filename: string; content: string }) => {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create rule");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      toast.success(`Rule "${variables.filename}" created`);
      setOpen(false);
      setFilename("");
      setTitle("");
      router.push(`/rules/${encodeURIComponent(variables.filename)}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) return;

    const finalFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
    const ruleTitle =
      title ||
      filename
        .replace(/\.md$/, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const content = `# ${ruleTitle}

Add your rule content here.

## Guidelines

- Rule 1
- Rule 2
- Rule 3
`;

    createMutation.mutate({ filename: finalFilename, content });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Rule</DialogTitle>
            <DialogDescription>
              Create a development rule that applies to your projects
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="filename">Filename</Label>
                <InfoTip
                  content={
                    <div>
                      <p>{helpContent.creation.rule.name.description}</p>
                      <p className="mt-1 text-xs">Example: {helpContent.creation.rule.name.example}</p>
                    </div>
                  }
                  side="right"
                />
              </div>
              <Input
                id="filename"
                value={filename}
                onChange={(e) =>
                  setFilename(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, "-"))
                }
                placeholder="my-rule.md"
                required
              />
              <p className="text-xs text-muted-foreground">
                Will be saved as ~/.claude/rules/{filename || "filename"}.md
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Custom Rule"
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
