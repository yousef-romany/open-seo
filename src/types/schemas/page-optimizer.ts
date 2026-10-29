import { z } from "zod";

const pageUrl = z.string().trim().min(1).max(2048);
const targetKeyword = z.string().trim().min(1).max(200);

export const optimizePageSchema = z.object({
  projectId: z.string().min(1),
  url: pageUrl,
  targetKeyword,
});

export const pageOptimizerSearchSchema = z.object({
  url: pageUrl.optional().catch(undefined),
  keyword: targetKeyword.optional().catch(undefined),
});

export const pageOptimizerHistorySchema = optimizePageSchema.pick({
  projectId: true,
  url: true,
  targetKeyword: true,
});

export const pageOptimizerProjectSchema = optimizePageSchema.pick({
  projectId: true,
});

export const pageOptimizerTaskUpdateSchema = optimizePageSchema.extend({
  taskId: z.string().trim().min(1).max(500),
  status: z.enum(["todo", "in_progress", "done"]),
});
