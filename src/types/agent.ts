export type AgentModel = "sonnet" | "opus" | "haiku";

export type AgentFrontmatter = {
  name: string;
  description: string;
  model?: AgentModel;
  tools?: string[];
  skills?: string[];
};

export type Agent = {
  name: string;
  path: string;
  frontmatter: AgentFrontmatter;
  content: string;
};

export type AgentListItem = {
  name: string;
  path: string;
  description: string;
  model?: AgentModel;
};
