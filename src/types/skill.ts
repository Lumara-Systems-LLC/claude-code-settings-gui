export type SkillFrontmatter = {
  name: string;
  description: string;
  "allowed-tools"?: string;
};

export type Skill = {
  name: string;
  path: string;
  frontmatter: SkillFrontmatter;
  content: string;
};

export type SkillListItem = {
  name: string;
  path: string;
  description: string;
};
