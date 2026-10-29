import {
  buildKeywordCannibalizationReport,
  type KeywordCannibalizationReport,
} from "@/server/features/gsc/keywordCannibalizationReport";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { GscService } from "@/server/features/gsc/services/GscService";

const QUERY_PAGE_ROW_LIMIT = 10000;

type KeywordCannibalizationResult = KeywordCannibalizationReport & {
  siteUrl: string;
  range: { startDate: string; endDate: string };
};

async function getReport(
  projectId: string,
): Promise<KeywordCannibalizationResult> {
  const range = resolveDateRange({ dateRange: "last_28_days" });
  const result = await GscService.getPerformance({
    projectId,
    ...range,
    dimensions: ["query", "page"],
    rowLimit: QUERY_PAGE_ROW_LIMIT,
  });
  return {
    siteUrl: result.siteUrl,
    range,
    ...buildKeywordCannibalizationReport(result.rows),
  };
}

export const KeywordCannibalizationService = { getReport };
