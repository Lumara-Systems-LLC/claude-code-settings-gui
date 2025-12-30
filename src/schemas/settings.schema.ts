import { z } from "zod";

export const permissionPatternSchema = z
  .string()
  .min(1, "Permission pattern cannot be empty");

export const permissionSchema = z.object({
  allow: z.array(permissionPatternSchema).default([]),
  deny: z.array(permissionPatternSchema).default([]),
});

export const mcpServerSchema = z.object({
  type: z.enum(["sse", "stdio"]).optional(),
  url: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const hookDefinitionSchema = z.object({
  type: z.enum(["command", "prompt"]),
  command: z.string().optional(),
  prompt: z.string().optional(),
  timeout: z.number().positive().max(300000).optional(),
});

export const hookMatcherSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(hookDefinitionSchema),
});

export const hooksSchema = z
  .object({
    SessionStart: z.array(hookMatcherSchema).optional(),
    Stop: z.array(hookMatcherSchema).optional(),
    UserPromptSubmit: z.array(hookMatcherSchema).optional(),
    PreToolUse: z.array(hookMatcherSchema).optional(),
    PostToolUse: z.array(hookMatcherSchema).optional(),
  })
  .catchall(z.array(hookMatcherSchema).optional());

export const settingsSchema = z
  .object({
    permissions: permissionSchema.optional().default({ allow: [], deny: [] }),
    mcpServers: z.record(z.string(), mcpServerSchema).optional().default({}),
    alwaysThinkingEnabled: z.boolean().optional(),
    hooks: hooksSchema.optional().default({}),
    attribution: z
      .object({
        commit: z.string().optional(),
        pr: z.string().optional(),
      })
      .optional(),
  })
  .catchall(z.unknown());

export type SettingsSchema = z.infer<typeof settingsSchema>;

/**
 * Format Zod validation errors into human-readable messages
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
