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

export function CreateSkillDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create skill");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast.success(`Skill "${variables.name}" created`);
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/skills/${encodeURIComponent(variables.name)}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
            <DialogDescription>
              Create a new skill that can be invoked with /{"{name}"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="name">Name</Label>
                <InfoTip
                  content={
                    <div>
                      <p>{helpContent.creation.skill.name.description}</p>
                      <p className="mt-1 text-xs">Example: {helpContent.creation.skill.name.example}</p>
                    </div>
                  }
                  side="right"
                />
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="my-skill"
                pattern="^[a-z][a-z0-9-]*$"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="description">Description</Label>
                <InfoTip
                  content={helpContent.creation.skill.description.description}
                  side="right"
                />
              </div>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this skill do?"
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
