"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, use } from "react";
import { MarkdownEditor } from "@/components/editors";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PageProps {
  params: Promise<{ name: string }>;
}

interface Prompt {
  name: string;
  path: string;
  content: string;
}

export default function PromptDetailPage({ params }: PageProps) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ["prompt", decodedName],
    queryFn: async () => {
      const response = await fetch(
        `/api/prompts?filename=${encodeURIComponent(decodedName)}`
      );
      if (!response.ok) throw new Error("Failed to load prompt");
      return response.json() as Promise<Prompt>;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: decodedName,
          content: newContent,
        }),
      });
      if (!response.ok) throw new Error("Failed to save prompt");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Prompt saved successfully");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["prompt", decodedName] });
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: decodedName, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      router.push("/artifacts/prompts");
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  useEffect(() => {
    if (prompt) {
      setContent(prompt.content);
      setHasChanges(false);
    }
  }, [prompt]);

  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (prompt) {
      setHasChanges(newContent !== prompt.content);
    }
  };

  const handleSave = () => {
    mutation.mutate(content);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load prompt: {decodedName}</AlertDescription>
      </Alert>
    );
  }

  const displayName = decodedName.replace(".md", "");

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/artifacts/prompts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Curated analysis prompt
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border">
        <MarkdownEditor
          value={content}
          onChange={handleChange}
          onSave={handleSave}
          isSaving={mutation.isPending}
          hasChanges={hasChanges}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete prompt?</DialogTitle>
            <DialogDescription>
              This permanently removes <code>{decodedName}</code>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false);
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
