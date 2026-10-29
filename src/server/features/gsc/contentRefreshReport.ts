import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";

export type ContentRefreshPriority = "high" | "medium" | "low";

export type ContentRefreshOpportunity = {
  url: string;
  keyword: string | null;
  priority: ContentRefreshPriority;
  reason: string;
  action: string;
  current: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  previous: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  change: {
    lostClicks: number;
    clicksPercent: number | null;
    lostImpressions: number;
    position: number;
  };
};

export type ContentRefreshReport = {
  pagesAnalyzed: number;
  opportunities: ContentRefreshOpportunity[];
  summary: {
    lostClicks: number;
    pagesDeclining: number;
    highPriority: number;
  };
};

type PageMetrics = ContentRefreshOpportunity["current"];

function pageMetrics(row: GscSearchAnalyticsRow | undefined): PageMetrics {
  return row
    ? {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

function priorityFor(input: {
  lostClicks: number;
  clicksPercent: number | null;
  lostImpressions: number;
  positionChange: number;
}): ContentRefreshPriority {
  if (
    input.lostClicks >= 10 ||
    (input.lostClicks >= 5 && (input.clicksPercent ?? 0) <= -30) ||
    (input.lostClicks >= 5 && input.positionChange >= 3)
  ) {
    return "high";
  }
  if (
    input.lostClicks >= 3 ||
    input.positionChange >= 2 ||
    input.lostImpressions >= 100
  ) {
    return "medium";
  }
  return "low";
}

function explanation(input: {
  current: PageMetrics;
  previous: PageMetrics;
  lostClicks: number;
  lostImpressions: number;
  positionChange: number;
}): Pick<ContentRefreshOpportunity, "reason" | "action"> {
  const clickText = `${Math.round(input.lostClicks)} fewer click${Math.round(input.lostClicks) === 1 ? "" : "s"}`;
  if (input.positionChange >= 2) {
    return {
      reason: `${clickText}; average position slipped by ${input.positionChange.toFixed(1)} places.`,
      action:
        "Refresh outdated sections and make the page answer its main query more completely. Then review the title, H1, and internal links.",
    };
  }

  const impressionsStayedVisible =
    input.previous.impressions > 0 &&
    input.current.impressions >= input.previous.impressions * 0.8;
  const ctrDropped =
    input.previous.ctr > 0 && input.current.ctr <= input.previous.ctr * 0.8;
  if (impressionsStayedVisible && ctrDropped) {
    return {
      reason: `${clickText} while impressions stayed fairly steady; CTR fell from ${(input.previous.ctr * 100).toFixed(1)}% to ${(input.current.ctr * 100).toFixed(1)}%.`,
      action:
        "Rewrite the title and meta description so the result matches the searcher's goal and gives a clearer reason to click.",
    };
  }

  if (input.lostImpressions > 0) {
    return {
      reason: `${clickText} and ${Math.round(input.lostImpressions)} fewer impressions.`,
      action:
        "Update stale sections, add useful examples, and strengthen internal links. Check indexing if the page changed or moved recently.",
    };
  }

  return {
    reason: `${clickText} compared with the previous 28 days.`,
    action:
      "Review the queries this page ranks for, refresh weak sections, and make the opening answer more direct.",
  };
}

function isMeaningfulDecline(input: {
  previous: PageMetrics;
  lostClicks: number;
  clicksPercent: number | null;
  lostImpressions: number;
  positionChange: number;
}): boolean {
  if (input.lostClicks <= 0) return false;
  return (
    input.lostClicks >= 2 ||
    (input.previous.clicks >= 3 && (input.clicksPercent ?? 0) <= -20) ||
    (input.previous.impressions >= 50 && input.positionChange >= 2) ||
    (input.lostImpressions >= 50 && input.previous.impressions >= 100)
  );
}

function mainKeywords(rows: GscSearchAnalyticsRow[]): Map<string, string> {
  const bestByPage = new Map<
    string,
    { keyword: string; clicks: number; impressions: number }
  >();
  for (const row of rows) {
    const page = row.keys?.[0];
    const keyword = row.keys?.[1];
    if (!page || !keyword) continue;
    const current = bestByPage.get(page);
    if (
      !current ||
      row.clicks > current.clicks ||
      (row.clicks === current.clicks && row.impressions > current.impressions)
    ) {
      bestByPage.set(page, {
        keyword,
        clicks: row.clicks,
        impressions: row.impressions,
      });
    }
  }
  return new Map(
    Array.from(bestByPage, ([page, value]) => [page, value.keyword]),
  );
}

const priorityRank: Record<ContentRefreshPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Compare page-level GSC periods and return only declines large enough to act on. */
export function buildContentRefreshReport(input: {
  currentRows: GscSearchAnalyticsRow[];
  previousRows: GscSearchAnalyticsRow[];
  queryRows: GscSearchAnalyticsRow[];
}): ContentRefreshReport {
  const currentByPage = new Map(
    input.currentRows.flatMap((row) =>
      row.keys?.[0] ? [[row.keys[0], row] as const] : [],
    ),
  );
  const keywords = mainKeywords(input.queryRows);
  const opportunities: ContentRefreshOpportunity[] = [];

  for (const previousRow of input.previousRows) {
    const url = previousRow.keys?.[0];
    if (!url) continue;
    const current = pageMetrics(currentByPage.get(url));
    const previous = pageMetrics(previousRow);
    const lostClicks = Math.max(previous.clicks - current.clicks, 0);
    const lostImpressions = Math.max(
      previous.impressions - current.impressions,
      0,
    );
    const clicksPercent = percentChange(current.clicks, previous.clicks);
    const positionChange =
      current.impressions > 0 ? current.position - previous.position : 0;

    if (
      !isMeaningfulDecline({
        previous,
        lostClicks,
        clicksPercent,
        lostImpressions,
        positionChange,
      })
    ) {
      continue;
    }

    const { reason, action } = explanation({
      current,
      previous,
      lostClicks,
      lostImpressions,
      positionChange,
    });
    opportunities.push({
      url,
      keyword: keywords.get(url) ?? null,
      priority: priorityFor({
        lostClicks,
        clicksPercent,
        lostImpressions,
        positionChange,
      }),
      reason,
      action,
      current,
      previous,
      change: {
        lostClicks,
        clicksPercent,
        lostImpressions,
        position: positionChange,
      },
    });
  }

  opportunities.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      b.change.lostClicks - a.change.lostClicks ||
      b.previous.clicks - a.previous.clicks,
  );

  return {
    pagesAnalyzed: input.previousRows.length,
    opportunities,
    summary: {
      lostClicks: opportunities.reduce(
        (total, item) => total + item.change.lostClicks,
        0,
      ),
      pagesDeclining: opportunities.length,
      highPriority: opportunities.filter((item) => item.priority === "high")
        .length,
    },
  };
}
