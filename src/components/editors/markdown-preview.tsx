"use client";

import { useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  className?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") || "";

  const onCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative group not-prose my-4">
      {lang && (
        <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono">
          {lang}
        </div>
      )}
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 rounded-md p-1.5 bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background border border-border/50"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      <pre
        className={cn(
          "rounded-lg border bg-muted/30 px-4 py-3 overflow-auto text-sm leading-relaxed",
          lang && "pt-7"
        )}
      >
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  children?: React.ReactNode;
};

function makeComponents(): Components {
  function makeHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
    function Heading({ children, ...props }: HeadingProps) {
      const text = typeof children === "string" ? children : extractText(children);
      const id = slugify(text);
      const className = "group/heading relative scroll-mt-24";
      const inner = (
        <>
          <a
            href={`#${id}`}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/heading:opacity-100 transition-opacity no-underline"
            aria-label="Anchor link"
          >
            <LinkIcon className="h-4 w-4 text-muted-foreground/60" />
          </a>
          {children}
        </>
      );
      switch (level) {
        case 1: return <h1 id={id} className={className} {...props}>{inner}</h1>;
        case 2: return <h2 id={id} className={className} {...props}>{inner}</h2>;
        case 3: return <h3 id={id} className={className} {...props}>{inner}</h3>;
        case 4: return <h4 id={id} className={className} {...props}>{inner}</h4>;
        case 5: return <h5 id={id} className={className} {...props}>{inner}</h5>;
        case 6: return <h6 id={id} className={className} {...props}>{inner}</h6>;
      }
    }
    Heading.displayName = `MdHeading${level}`;
    return Heading;
  }

  return {
    h1: makeHeading(1),
    h2: makeHeading(2),
    h3: makeHeading(3),
    h4: makeHeading(4),
    h5: makeHeading(5),
    h6: makeHeading(6),
    code({ className, children, ...rest }) {
      // Detect inline vs block by presence of language class
      const isBlock = /language-(\w+)/.test(className ?? "");
      if (!isBlock) {
        return (
          <code
            className="rounded bg-muted px-1.5 py-0.5 text-[0.875em] font-mono before:hidden after:hidden"
            {...rest}
          >
            {children}
          </code>
        );
      }
      return (
        <CodeBlock className={className}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      );
    },
    pre({ children }) {
      // react-markdown wraps code blocks in <pre><code>; we render the pre
      // ourselves in CodeBlock, so collapse the outer one to a fragment.
      return <>{children}</>;
    },
    a({ href, children, ...props }) {
      const external = href?.startsWith("http");
      return (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          {...props}
        >
          {children}
        </a>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-lg border not-prose">
          <table className="w-full text-sm border-collapse">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-muted/50">{children}</thead>;
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 text-left font-semibold border-b border-border">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="px-3 py-2 border-b border-border/50">{children}</td>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-4 border-l-4 border-primary/40 bg-muted/30 pl-4 pr-3 py-2 italic text-muted-foreground rounded-r">
          {children}
        </blockquote>
      );
    },
    hr() {
      return <hr className="my-6 border-border" />;
    },
    input({ type, checked, disabled }) {
      // GFM task list checkboxes
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked ?? false}
            disabled={disabled ?? true}
            readOnly
            className="mr-2 accent-primary"
          />
        );
      }
      return <input type={type} />;
    },
  };
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

export function MarkdownPreview({ value, className }: Props) {
  return (
    <article
      className={cn(
        // Prose base
        "prose prose-base dark:prose-invert max-w-none px-6 py-6",
        // Headings
        "prose-headings:scroll-mt-24 prose-headings:font-semibold",
        "prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border",
        "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-border/50",
        "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2",
        "prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-1.5",
        // Body
        "prose-p:leading-7 prose-p:my-3",
        "prose-li:my-1 prose-li:leading-7",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
        // Inline code already styled via component override; clear default
        "prose-code:before:content-none prose-code:after:content-none",
        // Strong/em
        "prose-strong:text-foreground prose-strong:font-semibold",
        // Lists
        "prose-ul:my-3 prose-ol:my-3",
        // Images
        "prose-img:rounded-lg prose-img:border prose-img:border-border",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={makeComponents()}
      >
        {value}
      </ReactMarkdown>
    </article>
  );
}
