"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  GitBranch,
  GitCommit,
  Plus,
  Minus,
  FileQuestion,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { GitStatus } from "@/types/storage";

export default function GitPage() {
  const queryClient = useQueryClient();
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const { data: gitStatus, isLoading, error } = useQuery({
    queryKey: ["git-status"],
    queryFn: async () => {
      const response = await fetch("/api/git");
      if (!response.ok) throw new Error("Failed to load git status");
      return response.json() as Promise<GitStatus>;
    },
  });

  const gitMutation = useMutation({
    mutationFn: async ({
      action,
      files,
      message,
    }: {
      action: string;
      files?: string[];
      message?: string;
    }) => {
      const response = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, files, message }),
      });
      if (!response.ok) throw new Error("Failed to perform git action");
      return response.json();
    },
    onSuccess: (_, variables) => {
      if (variables.action === "commit") {
        toast.success("Changes committed successfully");
        setCommitDialogOpen(false);
        setCommitMessage("");
        setSelectedFiles([]);
      } else if (variables.action === "stage") {
        toast.success("Files staged");
      } else if (variables.action === "unstage") {
        toast.success("Files unstaged");
      } else if (variables.action === "discard") {
        toast.success("Changes discarded");
      }
      queryClient.invalidateQueries({ queryKey: ["git-status"] });
    },
    onError: (error) => {
      toast.error("Git action failed: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (error || !gitStatus) {
    return (
      <MainLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load git status. Make sure ~/.claude is a git repository.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  const allModified = [
    ...gitStatus.modified,
    ...gitStatus.staged,
    ...gitStatus.untracked,
  ];

  const toggleFile = (file: string) => {
    setSelectedFiles((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  const handleStage = () => {
    if (selectedFiles.length > 0) {
      gitMutation.mutate({ action: "stage", files: selectedFiles });
      setSelectedFiles([]);
    }
  };

  const handleUnstage = () => {
    if (selectedFiles.length > 0) {
      gitMutation.mutate({ action: "unstage", files: selectedFiles });
      setSelectedFiles([]);
    }
  };

  const handleCommit = () => {
    if (gitStatus.staged.length > 0 && commitMessage.trim()) {
      gitMutation.mutate({
        action: "commit",
        message: commitMessage.trim(),
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Git</h1>
            <p className="text-sm text-muted-foreground">
              Manage ~/.claude version control
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-2">
              <GitBranch className="h-3 w-3" />
              {gitStatus.branch}
            </Badge>
            {gitStatus.isClean ? (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-500"
              >
                <Check className="mr-1 h-3 w-3" />
                Clean
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-500"
              >
                {allModified.length} changes
              </Badge>
            )}
          </div>
        </div>

        {gitStatus.isClean ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Check className="mb-4 h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">Working tree clean</p>
              <p className="text-sm text-muted-foreground">
                No uncommitted changes
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleStage}
                disabled={
                  selectedFiles.length === 0 || gitMutation.isPending
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Stage Selected
              </Button>
              <Button
                variant="outline"
                onClick={handleUnstage}
                disabled={
                  selectedFiles.length === 0 || gitMutation.isPending
                }
              >
                <Minus className="mr-2 h-4 w-4" />
                Unstage Selected
              </Button>
              <div className="flex-1" />
              <Button
                onClick={() => setCommitDialogOpen(true)}
                disabled={gitStatus.staged.length === 0}
              >
                <GitCommit className="mr-2 h-4 w-4" />
                Commit Staged
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="h-4 w-4 text-green-500" />
                    Staged ({gitStatus.staged.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gitStatus.staged.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No staged changes
                      </p>
                    ) : (
                      gitStatus.staged.map((file) => (
                        <div
                          key={file}
                          className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-2"
                        >
                          <Checkbox
                            checked={selectedFiles.includes(file)}
                            onCheckedChange={() => toggleFile(file)}
                          />
                          <code className="text-sm">{file}</code>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Minus className="h-4 w-4 text-orange-500" />
                    Modified ({gitStatus.modified.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gitStatus.modified.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No modified files
                      </p>
                    ) : (
                      gitStatus.modified.map((file) => (
                        <div
                          key={file}
                          className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2"
                        >
                          <Checkbox
                            checked={selectedFiles.includes(file)}
                            onCheckedChange={() => toggleFile(file)}
                          />
                          <code className="text-sm">{file}</code>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileQuestion className="h-4 w-4 text-blue-500" />
                    Untracked ({gitStatus.untracked.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gitStatus.untracked.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No untracked files
                      </p>
                    ) : (
                      gitStatus.untracked.map((file) => (
                        <div
                          key={file}
                          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2"
                        >
                          <Checkbox
                            checked={selectedFiles.includes(file)}
                            onCheckedChange={() => toggleFile(file)}
                          />
                          <code className="text-sm">{file}</code>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commit Changes</DialogTitle>
            <DialogDescription>
              Commit {gitStatus.staged.length} staged file(s) to the repository.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommitDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || gitMutation.isPending}
            >
              {gitMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GitCommit className="mr-2 h-4 w-4" />
              )}
              Commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
