import { z } from "zod";

export const skillFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  "allowed-tools": z.string().optional(),
});

export const skillSchema = z.object({
  name: z.string(),
  path: z.string(),
  frontmatter: skillFrontmatterSchema,
  content: z.string(),
});

export type SkillSchema = z.infer<typeof skillSchema>;
