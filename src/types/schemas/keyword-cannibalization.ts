import { z } from "zod";

export const keywordCannibalizationInputSchema = z.object({
  projectId: z.string().uuid(),
});
