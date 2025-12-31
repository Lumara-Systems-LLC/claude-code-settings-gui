"use client";

import { useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
  readOnly?: boolean;
  language?: string;
}

export function CodeEditor({
  value,
  onChange,
  onSave,
  isSaving = false,
  hasChanges = false,
  readOnly = false,
  language = "shell",
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleEditorChange = useCallback(
    (val: string | undefined) => {
      if (val !== undefined && !readOnly) {
        onChange(val);
      }
    },
    [onChange, readOnly]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }
    },
    [onSave]
  );

  return (
    <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {language}
          </span>
        </div>

        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
            {hasChanges && (
              <span className="ml-1 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            wordWrap: "on",
            lineNumbers: "on",
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
