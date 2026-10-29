import { z } from "zod";

export const actionCenterInputSchema = z.object({
  projectId: z.string().uuid(),
});

export const actionCenterStatusSchema = actionCenterInputSchema.extend({
  actionKey: z.string().trim().min(1).max(4096),
  status: z.enum(["todo", "in_progress", "done"]),
});
