import { z } from "zod";
import { CLAUDE_DIR } from "@/lib/constants";

export const filePathSchema = z.string().refine(
  (p) => p.startsWith(CLAUDE_DIR),
  `Path must be within ${CLAUDE_DIR} directory`
);

export const fileReadSchema = z.object({
  path: filePathSchema,
});

export const fileWriteSchema = z.object({
  path: filePathSchema,
  content: z.string(),
  createBackup: z.boolean().optional().default(true),
});

export const fileDeleteSchema = z.object({
  path: filePathSchema,
  confirmed: z.boolean().refine((v) => v === true, "Deletion must be confirmed"),
});

export type FileReadInput = z.infer<typeof fileReadSchema>;
export type FileWriteInput = z.infer<typeof fileWriteSchema>;
export type FileDeleteInput = z.infer<typeof fileDeleteSchema>;
