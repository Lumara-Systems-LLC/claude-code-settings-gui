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

type WorkflowFile = {
  name: string;
  path: string;
  content: string;
};

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename } = use(params);
  const decoded = decodeURIComponent(filename);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workflow", decoded],
    queryFn: async () => {
      const res = await fetch(
        `/api/workflows?filename=${encodeURIComponent(decoded)}`
      );
      if (!res.ok) throw new Error("Failed to load workflow");
      return res.json() as Promise<WorkflowFile>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const res = await fetch("/api/workflows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: decoded, content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Saved");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["workflow", decoded] });
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workflows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: decoded, confirmed: true }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      router.push("/artifacts/workflows");
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });

  useEffect(() => {
    if (data?.content !== undefined) {
      setContent(data.content);
      setHasChanges(false);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load workflow: {decoded}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/artifacts/workflows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{decoded.replace(".md", "")}</h1>
          <p className="text-sm text-muted-foreground">{data.path}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border">
        <MarkdownEditor
          value={content}
          onChange={(v) => {
            setContent(v);
            setHasChanges(v !== data.content);
          }}
          onSave={() => saveMutation.mutate(content)}
          isSaving={saveMutation.isPending}
          hasChanges={hasChanges}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workflow?</DialogTitle>
            <DialogDescription>
              This permanently removes <code>{decoded}</code>.
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
