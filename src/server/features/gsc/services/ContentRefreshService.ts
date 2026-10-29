import {
  buildContentRefreshReport,
  type ContentRefreshReport,
} from "@/server/features/gsc/contentRefreshReport";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { previousPeriod } from "@/server/features/gsc/searchPerformanceReport";
import { GscService } from "@/server/features/gsc/services/GscService";

const PAGE_ROW_LIMIT = 1000;
const PAGE_QUERY_ROW_LIMIT = 5000;

type ContentRefreshResult = ContentRefreshReport & {
  siteUrl: string;
  range: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
  };
};

async function getReport(projectId: string): Promise<ContentRefreshResult> {
  const { startDate, endDate } = resolveDateRange({
    dateRange: "last_28_days",
  });
  const previous = previousPeriod(startDate, endDate);
  const [currentPages, previousPages, pageQueries] = await Promise.all([
    GscService.getPerformance({
      projectId,
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: PAGE_ROW_LIMIT,
    }),
    GscService.getPerformance({
      projectId,
      startDate: previous.startDate,
      endDate: previous.endDate,
      dimensions: ["page"],
      rowLimit: PAGE_ROW_LIMIT,
    }),
    GscService.getPerformance({
      projectId,
      startDate,
      endDate,
      dimensions: ["page", "query"],
      rowLimit: PAGE_QUERY_ROW_LIMIT,
    }),
  ]);

  return {
    siteUrl: currentPages.siteUrl,
    range: {
      startDate,
      endDate,
      previousStartDate: previous.startDate,
      previousEndDate: previous.endDate,
    },
    ...buildContentRefreshReport({
      currentRows: currentPages.rows,
      previousRows: previousPages.rows,
      queryRows: pageQueries.rows,
    }),
  };
}

export const ContentRefreshService = { getReport };
