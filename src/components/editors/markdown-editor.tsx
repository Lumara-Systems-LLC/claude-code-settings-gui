"use client";

import { useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Code } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
  readOnly?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  isSaving = false,
  hasChanges = false,
  readOnly = false,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "split">(
    "split"
  );

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
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList>
            <TabsTrigger value="edit" className="gap-2">
              <Code className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
          </TabsList>
        </Tabs>

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
        {activeTab === "edit" && (
          <Editor
            height="100%"
            language="markdown"
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
            }}
          />
        )}

        {activeTab === "preview" && (
          <div className="h-full overflow-auto p-6">
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{value}</ReactMarkdown>
            </article>
          </div>
        )}

        {activeTab === "split" && (
          <div className="grid h-full grid-cols-2 divide-x">
            <div className="overflow-hidden">
              <Editor
                height="100%"
                language="markdown"
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
                }}
              />
            </div>
            <div className="overflow-auto p-6">
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{value}</ReactMarkdown>
              </article>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
