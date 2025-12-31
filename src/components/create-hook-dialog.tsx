"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const HOOK_EVENTS = [
  { value: "SessionStart", label: "Session Start" },
  { value: "Stop", label: "Stop" },
  { value: "UserPromptSubmit", label: "User Prompt Submit" },
  { value: "PreToolUse", label: "Pre Tool Use" },
  { value: "PostToolUse", label: "Post Tool Use" },
];

export function CreateHookDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [event, setEvent] = useState<string>("SessionStart");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; content: string }) => {
      const response = await fetch("/api/hooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create hook");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hooks"] });
      toast.success(`Hook "${variables.name}" created`);
      setOpen(false);
      setName("");
      setEvent("SessionStart");
      setDescription("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalName = name.endsWith(".sh") ? name : `${name}.sh`;

    const content = `#!/bin/bash
# Hook: ${finalName}
# Event: ${event}
# ${description || "Add description here"}

# Your hook logic here
echo "Running ${finalName}"
`;

    createMutation.mutate({ name: finalName, content });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Hook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Hook</DialogTitle>
            <DialogDescription>
              Create a shell script that runs on Claude Code events
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Filename</Label>
                <InfoTip
                  content={
                    <div>
                      <p>{helpContent.creation.hook.name.description}</p>
                      <p className="mt-1 text-xs">Example: {helpContent.creation.hook.name.example}</p>
                    </div>
                  }
                  side="right"
                />
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, "-"))
                }
                placeholder="my-hook.sh"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="event">Event Type</Label>
                <InfoTip
                  content={helpContent.creation.hook.event.description}
                  side="right"
                />
              </div>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {HOOK_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Remember to register this hook in settings.json
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this hook do?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
