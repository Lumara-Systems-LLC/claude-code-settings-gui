"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Folder,
  File as FileIcon,
  Lock,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { SensitiveFileViewer } from "@/components/sensitive-file-viewer";

type FileListEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  sizeHuman: string;
  lastModified: string;
  sensitive: boolean;
};

type ListResponse = {
  path: string;
  entries: FileListEntry[];
};

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [viewingSensitive, setViewingSensitive] = useState<FileListEntry | null>(null);

  const { data, isLoading, error } = useQuery<ListResponse>({
    queryKey: ["files-list", currentPath],
    queryFn: async () => {
      const url = currentPath
        ? `/api/files/list?path=${encodeURIComponent(currentPath)}`
        : "/api/files/list";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to list files");
      }
      return res.json();
    },
  });

  const handleEntryClick = (entry: FileListEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
    } else if (entry.sensitive) {
      setViewingSensitive(entry);
    } else {
      // For non-sensitive files, open in a new tab to /api/files (raw)
      // or navigate to a viewer page. For now, show a hint.
      const url = `/api/files?path=${encodeURIComponent(entry.path)}`;
      window.open(url, "_blank");
    }
  };

  const handleUp = () => {
    if (!data) return;
    // Navigate up one directory by stripping last segment
    const parts = data.path.split("/").filter(Boolean);
    if (parts.length <= 2) {
      setCurrentPath(null);
      return;
    }
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground">
            Browse the contents of your Claude config directory.
          </p>
        </div>
        {currentPath && (
          <Button variant="outline" size="sm" onClick={handleUp}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Up
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono break-all">
            {data?.path ?? "Loading..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          )}

          {data && data.entries.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Directory is empty.
            </p>
          )}

          {data?.entries.map((entry) => (
            <button
              key={entry.path}
              onClick={() => handleEntryClick(entry)}
              className="flex items-center w-full gap-3 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
            >
              {entry.isDirectory ? (
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : entry.sensitive ? (
                <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
              ) : (
                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="flex-1 truncate font-mono text-sm">{entry.name}</span>
              {entry.sensitive && (
                <Badge variant="outline" className="border-orange-500/50 text-orange-500 text-xs">
                  sensitive
                </Badge>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">
                {entry.isDirectory ? "" : entry.sizeHuman}
              </span>
              {entry.isDirectory && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Files marked <strong>sensitive</strong> (env, credentials, secrets, tokens, keys) are
          masked until you explicitly reveal them. Revealed contents auto-hide after 60 seconds
          or when you switch tabs.
        </AlertDescription>
      </Alert>

      {viewingSensitive && (
        <SensitiveFileViewer
          path={viewingSensitive.path}
          filename={viewingSensitive.name}
          open={!!viewingSensitive}
          onClose={() => setViewingSensitive(null)}
        />
      )}
    </div>
  );
}
