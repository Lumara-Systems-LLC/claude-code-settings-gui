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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState<string>("sonnet");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; content: string }) => {
      const response = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create agent");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(`Agent "${variables.name}" created`);
      setOpen(false);
      setName("");
      setDescription("");
      setModel("sonnet");
      router.push(`/agents/${encodeURIComponent(variables.name)}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const displayName = name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const content = `---
name: ${displayName}
description: ${description || ""}
model: ${model}
---

# ${displayName} Agent

${description || "Add agent description here."}

## Capabilities

Describe what this agent specializes in.

## Instructions

Add specific instructions for this agent.
`;

    createMutation.mutate({ name: name.trim(), content });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Create a specialized AI agent for specific tasks
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Name</Label>
                <InfoTip
                  content={
                    <div>
                      <p>{helpContent.creation.agent.name.description}</p>
                      <p className="mt-1 text-xs">Example: {helpContent.creation.agent.name.example}</p>
                    </div>
                  }
                  side="right"
                />
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                placeholder="code-reviewer"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this agent specialize in?"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="model">Model</Label>
                <InfoTip
                  content={helpContent.creation.agent.model.description}
                  side="right"
                />
              </div>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="haiku">Haiku (fast)</SelectItem>
                  <SelectItem value="sonnet">Sonnet (balanced)</SelectItem>
                  <SelectItem value="opus">Opus (powerful)</SelectItem>
                </SelectContent>
              </Select>
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
