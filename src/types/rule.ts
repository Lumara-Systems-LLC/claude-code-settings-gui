export type RuleFrontmatter = {
  paths?: string; // glob pattern for path-specific rules
};

export type Rule = {
  filename: string;
  path: string;
  frontmatter?: RuleFrontmatter;
  content: string;
  isPathSpecific: boolean;
};

export type RuleListItem = {
  filename: string;
  path: string;
  isPathSpecific: boolean;
  description?: string;
};
