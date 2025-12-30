export interface Template {
  id: string;
  name: string;
  description: string;
  category: "skill" | "rule" | "agent" | "hook" | "mcp-server" | "permission";
  tags: string[];
  author?: string;
  content: string;
  filename?: string; // For skills, rules, agents
  preview?: string; // First few lines for preview
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}
