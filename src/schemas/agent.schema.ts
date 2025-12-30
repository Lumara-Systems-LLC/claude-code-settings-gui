import { z } from "zod";

export const agentFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  model: z.enum(["sonnet", "opus", "haiku"]).optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

export const agentSchema = z.object({
  name: z.string(),
  path: z.string(),
  frontmatter: agentFrontmatterSchema,
  content: z.string(),
});

export type AgentSchema = z.infer<typeof agentSchema>;
