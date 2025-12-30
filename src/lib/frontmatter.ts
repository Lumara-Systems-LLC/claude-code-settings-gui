import matter from "gray-matter";

export type ParsedMarkdown<T = Record<string, unknown>> = {
  frontmatter: T;
  content: string;
};

/**
 * Parses markdown with YAML frontmatter
 */
export function parseMarkdown<T = Record<string, unknown>>(
  markdown: string
): ParsedMarkdown<T> {
  const { data, content } = matter(markdown);
  return {
    frontmatter: data as T,
    content: content.trim(),
  };
}

/**
 * Serializes frontmatter and content back to markdown
 */
export function serializeMarkdown<T extends object = Record<string, unknown>>(
  frontmatter: T,
  content: string
): string {
  return matter.stringify(content, frontmatter as object);
}

/**
 * Extracts the first heading from markdown as a title
 */
export function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Extracts the first paragraph as a description
 */
export function extractDescription(markdown: string): string | null {
  // Skip frontmatter if present
  const { content } = matter(markdown);

  // Find first non-heading paragraph
  const lines = content.split("\n");
  let description = "";
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip headings, code blocks, lists, etc.
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("```") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith(">")
    ) {
      if (inParagraph && description) break;
      continue;
    }

    if (trimmed === "") {
      if (inParagraph && description) break;
      continue;
    }

    inParagraph = true;
    description += (description ? " " : "") + trimmed;
  }

  return description || null;
}
