import { createServerFn } from "@tanstack/react-start";
import {
  GscNotConnectedError,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { ContentRefreshService } from "@/server/features/gsc/services/ContentRefreshService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { contentRefreshInputSchema } from "@/types/schemas/content-refresh";

export const getContentRefreshReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(contentRefreshInputSchema)
  .handler(async ({ context }) => {
    try {
      return {
        connected: true as const,
        report: await ContentRefreshService.getReport(context.projectId),
      };
    } catch (error) {
      if (
        error instanceof GscNotConnectedError ||
        isExpectedGrantFailure(error)
      ) {
        return { connected: false as const };
      }
      throw error;
    }
  });
