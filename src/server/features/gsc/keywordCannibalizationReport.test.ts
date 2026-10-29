import { describe, expect, it } from "vitest";
import { buildKeywordCannibalizationReport } from "./keywordCannibalizationReport";

function row(
  query: string,
  page: string,
  clicks: number,
  impressions: number,
  position: number,
) {
  return {
    keys: [query, page],
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position,
  };
}

describe("keyword cannibalization report", () => {
  it("finds meaningful query conflicts, chooses the strongest page, and ignores tiny overlaps", () => {
    const report = buildKeywordCannibalizationReport([
      row("seo guide", "https://example.com/seo-guide", 30, 600, 5),
      row("seo guide", "https://example.com/old-seo-guide", 5, 200, 12),
      row("seo services", "https://example.com/services", 12, 100, 8),
      row("seo services", "https://example.com/consulting", 10, 90, 9),
      row("tiny query", "https://example.com/a", 0, 4, 40),
      row("tiny query", "https://example.com/b", 0, 3, 50),
    ]);

    expect(report).toMatchObject({
      queriesAnalyzed: 3,
      summary: {
        conflictingQueries: 2,
        affectedPages: 4,
        highPriority: 2,
        impressionsInvolved: 990,
      },
      conflicts: [
        {
          query: "seo guide",
          priority: "high",
          decision: "merge",
          primaryPage: { url: "https://example.com/seo-guide" },
          competingPages: [{ url: "https://example.com/old-seo-guide" }],
        },
        {
          query: "seo services",
          decision: "reposition",
          primaryPage: { url: "https://example.com/services" },
        },
      ],
    });
  });

  it("only suggests a redirect when similar URLs have a clear winner and a clickless weaker page", () => {
    const report = buildKeywordCannibalizationReport([
      row("egypt tour", "https://example.com/egypt-tour", 10, 100, 8),
      row("egypt tour", "https://example.com/egypt-tour-old", 0, 30, 32),
    ]);

    expect(report.conflicts[0]).toMatchObject({
      decision: "redirect",
      primaryPage: { url: "https://example.com/egypt-tour" },
      competingPages: [{ url: "https://example.com/egypt-tour-old" }],
    });
  });

  it("keeps pages separate when Google already has a clear top result", () => {
    const report = buildKeywordCannibalizationReport([
      row("example brand", "https://example.com/", 40, 250, 1.2),
      row("example brand", "https://example.com/services", 2, 50, 8),
    ]);

    expect(report.conflicts[0]).toMatchObject({
      decision: "keep",
      priority: "low",
      primaryPage: { url: "https://example.com/" },
    });
  });
});
