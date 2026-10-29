import { z } from "zod";

export const contentRefreshInputSchema = z.object({
  projectId: z.string().uuid(),
});
