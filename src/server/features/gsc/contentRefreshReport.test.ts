import { describe, expect, it } from "vitest";
import { buildContentRefreshReport } from "./contentRefreshReport";

function row(
  keys: string[],
  clicks: number,
  impressions: number,
  ctr: number,
  position: number,
) {
  return { keys, clicks, impressions, ctr, position };
}

describe("content refresh report", () => {
  it("prioritizes meaningful page losses and pairs each page with its strongest current query", () => {
    const report = buildContentRefreshReport({
      previousRows: [
        row(["https://example.com/guide"], 40, 800, 0.05, 4),
        row(["https://example.com/about"], 2, 20, 0.1, 3),
      ],
      currentRows: [
        row(["https://example.com/guide"], 20, 700, 0.029, 8),
        row(["https://example.com/about"], 1, 18, 0.056, 3),
      ],
      queryRows: [
        row(["https://example.com/guide", "secondary query"], 2, 300, 0.01, 9),
        row(["https://example.com/guide", "main query"], 8, 200, 0.04, 7),
      ],
    });

    expect(report).toMatchObject({
      pagesAnalyzed: 2,
      summary: { lostClicks: 20, pagesDeclining: 1, highPriority: 1 },
      opportunities: [
        {
          url: "https://example.com/guide",
          keyword: "main query",
          priority: "high",
          change: { lostClicks: 20, position: 4 },
        },
      ],
    });
  });

  it("keeps a disappeared page actionable even when it has no current metrics", () => {
    const report = buildContentRefreshReport({
      previousRows: [row(["https://example.com/old"], 12, 300, 0.04, 6)],
      currentRows: [],
      queryRows: [],
    });

    expect(report.opportunities[0]).toMatchObject({
      url: "https://example.com/old",
      keyword: null,
      current: { clicks: 0, impressions: 0 },
      change: { lostClicks: 12, lostImpressions: 300 },
    });
  });
});
