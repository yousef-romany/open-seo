import { describe, expect, it } from "vitest";
import { buildPageOptimizerActionPlan } from "@/shared/page-optimizer-action-plan";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

function page(): PageOptimizerSuccess {
  return {
    ok: true,
    url: "https://example.com/egypt-tours",
    targetKeyword: "Egypt tours",
    statusCode: 200,
    responseTimeMs: 100,
    coverageWarning: null,
    page: {
      title: "Private Holidays",
      metaDescription: "Plan a private holiday.",
      h1s: ["Private Holidays"],
      canonical: "https://example.com/egypt-tours",
      indexable: true,
      wordCount: 500,
      keywordOccurrences: 0,
      imagesTotal: 2,
      imagesMissingAlt: 0,
      internalLinks: 4,
      externalLinks: 1,
      hasStructuredData: false,
    },
    checks: [
      {
        id: "title-keyword",
        label: "Keyword in page title",
        status: "improve",
        priority: "high",
        summary: "The title misses the keyword.",
        why: "The title explains the page topic.",
        recommendation: "Add the keyword to the title.",
        suggestion: "Egypt Tours | Example",
      },
    ],
  };
}

describe("buildPageOptimizerActionPlan", () => {
  it("combines sources by priority and removes audit tasks already covered on-page", () => {
    const tasks = buildPageOptimizerActionPlan({
      page: page(),
      auditTasks: [
        {
          issueType: "missing-title",
          severity: "critical",
          title: "Missing title",
          explanation: "No title was found.",
          action: "Add a title.",
        },
        {
          issueType: "slow-response",
          severity: "info",
          title: "Slow response",
          explanation: "The server response is slow.",
          action: "Improve server caching.",
        },
      ],
      benchmark: {
        keyword: "Egypt tours",
        locationCode: 2840,
        languageCode: "en",
        comparedAt: "2026-10-29T12:00:00.000Z",
        page: {
          url: page().url,
          wordCount: 500,
          keywordOccurrences: 0,
          titleUsesKeyword: false,
          h1UsesKeyword: false,
          hasStructuredData: false,
        },
        competitors: [],
        analyzedCompetitorCount: 3,
        medianWordCount: 900,
        competitorsUsingKeywordInTitle: 3,
        competitorsUsingKeywordInH1: 2,
        competitorsUsingStructuredData: 0,
        topicGaps: [],
        insights: [
          {
            id: "content-depth",
            status: "opportunity",
            title: "Content depth",
            summary: "Competitors cover more useful detail.",
            action: "Add the missing useful sections.",
          },
        ],
      },
    });

    expect(tasks.map((task) => task.id)).toEqual([
      "on-page:title-keyword",
      "competitors:content-depth",
      "site-audit:slow-response",
    ]);
    expect(tasks.map((task) => task.source)).toEqual([
      "on_page",
      "competitors",
      "site_audit",
    ]);
  });
});
