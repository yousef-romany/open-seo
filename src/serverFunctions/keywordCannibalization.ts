import { createServerFn } from "@tanstack/react-start";
import {
  GscNotConnectedError,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { KeywordCannibalizationService } from "@/server/features/gsc/services/KeywordCannibalizationService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { keywordCannibalizationInputSchema } from "@/types/schemas/keyword-cannibalization";

export const getKeywordCannibalizationReport = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(keywordCannibalizationInputSchema)
  .handler(async ({ context }) => {
    try {
      return {
        connected: true as const,
        report: await KeywordCannibalizationService.getReport(
          context.projectId,
        ),
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
