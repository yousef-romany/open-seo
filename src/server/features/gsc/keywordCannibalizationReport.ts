import { sort } from "remeda";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";

export type CannibalizationPriority = "high" | "medium" | "low";
export type CannibalizationDecision =
  | "merge"
  | "redirect"
  | "reposition"
  | "keep";

export type CannibalizationPage = {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type KeywordCannibalizationConflict = {
  query: string;
  priority: CannibalizationPriority;
  decision: CannibalizationDecision;
  explanation: string;
  action: string;
  totalClicks: number;
  totalImpressions: number;
  primaryPage: CannibalizationPage;
  competingPages: CannibalizationPage[];
};

export type KeywordCannibalizationReport = {
  queriesAnalyzed: number;
  conflicts: KeywordCannibalizationConflict[];
  summary: {
    conflictingQueries: number;
    affectedPages: number;
    highPriority: number;
    impressionsInvolved: number;
  };
};

const MIN_PAGE_IMPRESSIONS = 10;
const MIN_QUERY_IMPRESSIONS = 30;

function pageTokens(url: string): Set<string> {
  try {
    const tokens = new URL(url).pathname
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
    return new Set(tokens);
  } catch {
    return new Set();
  }
}

function pathSimilarity(a: string, b: string): number {
  const aTokens = pageTokens(a);
  const bTokens = pageTokens(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  const intersection = Array.from(aTokens).filter((token) =>
    bTokens.has(token),
  ).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return intersection / union;
}

function priorityFor(
  totalClicks: number,
  totalImpressions: number,
  pages: CannibalizationPage[],
): CannibalizationPriority {
  const twoPagesNearPageOne = pages
    .slice(0, 2)
    .every((page) => page.position <= 20);
  if (
    totalImpressions >= 500 ||
    totalClicks >= 20 ||
    (totalImpressions >= 200 && twoPagesNearPageOne)
  ) {
    return "high";
  }
  if (totalImpressions >= 100 || totalClicks >= 5) return "medium";
  return "low";
}

function recommendation(input: {
  primary: CannibalizationPage;
  competitor: CannibalizationPage;
  totalClicks: number;
  totalImpressions: number;
}): Pick<
  KeywordCannibalizationConflict,
  "decision" | "explanation" | "action"
> {
  const primaryClickShare =
    input.totalClicks > 0 ? input.primary.clicks / input.totalClicks : 0;
  const primaryImpressionShare =
    input.totalImpressions > 0
      ? input.primary.impressions / input.totalImpressions
      : 0;
  const positionsClose =
    Math.abs(input.primary.position - input.competitor.position) <= 5;
  const pathsAreSimilar =
    pathSimilarity(input.primary.url, input.competitor.url) >= 0.6;

  if (
    input.primary.position <= 3 &&
    primaryClickShare >= 0.8 &&
    input.competitor.position - input.primary.position >= 5
  ) {
    return {
      decision: "keep",
      explanation:
        "Google already has a clear primary page near the top, while the other pages receive only a small share of clicks.",
      action:
        "No consolidation is needed. Keep the pages focused on their own topics and use internal links to reinforce the primary page for this exact query.",
    };
  }

  if (
    pathsAreSimilar &&
    input.primary.clicks >= 5 &&
    input.competitor.clicks === 0 &&
    input.primary.position <= 20 &&
    input.competitor.position >= 20
  ) {
    return {
      decision: "redirect",
      explanation:
        "The URLs look closely related, while one page earns the clicks and the other only appears lower in results.",
      action:
        "Confirm both pages serve the same intent. Move any unique useful content into the primary page, then 301 redirect the weaker page.",
    };
  }

  if (
    positionsClose &&
    primaryClickShare < 0.75 &&
    input.competitor.impressions >= input.totalImpressions * 0.25
  ) {
    return {
      decision: "reposition",
      explanation:
        "Google is splitting similar visibility between two pages, with no clear winner for this query.",
      action:
        "Give each page a distinct search intent. Keep this exact query on the primary page and change the competing page's title, H1, copy, and internal-link anchors toward a different query.",
    };
  }

  if (primaryClickShare >= 0.65 || primaryImpressionShare >= 0.65) {
    return {
      decision: "merge",
      explanation:
        "One page is already the stronger result, but another page still takes a meaningful share of visibility for the same query.",
      action:
        "Move the competing page's unique useful sections into the primary page and point relevant internal links at the primary page. Redirect only if the weaker page becomes redundant.",
    };
  }

  return {
    decision: "keep",
    explanation:
      "The pages may satisfy different intents, and the data does not show enough evidence to combine or redirect them safely.",
    action:
      "Keep both pages, but clarify their titles, H1s, and internal-link anchors so each page targets a distinct search need.",
  };
}

function pageSort(a: CannibalizationPage, b: CannibalizationPage): number {
  return (
    b.clicks - a.clicks ||
    a.position - b.position ||
    b.impressions - a.impressions
  );
}

const priorityRank: Record<CannibalizationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Turn GSC query/page rows into conflicts with enough search activity to act on. */
export function buildKeywordCannibalizationReport(
  rows: GscSearchAnalyticsRow[],
): KeywordCannibalizationReport {
  const pagesByQuery = new Map<string, CannibalizationPage[]>();
  for (const row of rows) {
    const query = row.keys?.[0]?.trim();
    const url = row.keys?.[1];
    if (!query || !url) continue;
    const pages = pagesByQuery.get(query) ?? [];
    pages.push({
      url,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    });
    pagesByQuery.set(query, pages);
  }

  const conflicts: KeywordCannibalizationConflict[] = [];
  for (const [query, queryPages] of pagesByQuery) {
    const pages = sort(
      queryPages.filter(
        (page) => page.impressions >= MIN_PAGE_IMPRESSIONS || page.clicks >= 1,
      ),
      pageSort,
    );
    if (pages.length < 2) continue;

    const totalClicks = pages.reduce((sum, page) => sum + page.clicks, 0);
    const totalImpressions = pages.reduce(
      (sum, page) => sum + page.impressions,
      0,
    );
    const competitor = pages[1];
    const competitorShare = competitor.impressions / totalImpressions;
    if (
      totalImpressions < MIN_QUERY_IMPRESSIONS ||
      (competitorShare < 0.15 &&
        competitor.impressions < 30 &&
        competitor.clicks < 2)
    ) {
      continue;
    }

    const primary = pages[0];
    const { decision, explanation, action } = recommendation({
      primary,
      competitor,
      totalClicks,
      totalImpressions,
    });
    conflicts.push({
      query,
      decision,
      explanation,
      action,
      priority:
        decision === "keep"
          ? "low"
          : priorityFor(totalClicks, totalImpressions, pages),
      totalClicks,
      totalImpressions,
      primaryPage: primary,
      competingPages: pages.slice(1),
    });
  }

  conflicts.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      b.totalImpressions - a.totalImpressions ||
      b.totalClicks - a.totalClicks,
  );
  const affectedPages = new Set(
    conflicts.flatMap((conflict) => [
      conflict.primaryPage.url,
      ...conflict.competingPages.map((page) => page.url),
    ]),
  );

  return {
    queriesAnalyzed: pagesByQuery.size,
    conflicts,
    summary: {
      conflictingQueries: conflicts.length,
      affectedPages: affectedPages.size,
      highPriority: conflicts.filter((conflict) => conflict.priority === "high")
        .length,
      impressionsInvolved: conflicts.reduce(
        (sum, conflict) => sum + conflict.totalImpressions,
        0,
      ),
    },
  };
}
