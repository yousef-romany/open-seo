import { createServerFn } from "@tanstack/react-start";
import {
  GscNotConnectedError,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { SeoResultsService } from "@/server/features/page-optimizer/services/SeoResultsService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { pageOptimizerProjectSchema } from "@/types/schemas/page-optimizer";

export const getSeoResultsReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(pageOptimizerProjectSchema)
  .handler(async ({ context }) => {
    try {
      return {
        connected: true as const,
        report: await SeoResultsService.getReport(context.projectId),
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
