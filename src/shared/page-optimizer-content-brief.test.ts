import { describe, expect, it } from "vitest";
import {
  buildPageOptimizerContentBrief,
  formatPageOptimizerContentBriefMarkdown,
} from "@/shared/page-optimizer-content-brief";
import type {
  PageOptimizerBenchmark,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const pageResult: PageOptimizerSuccess = {
  ok: true,
  url: "https://example.com/",
  targetKeyword: "Egypt tours",
  statusCode: 200,
  responseTimeMs: 100,
  coverageWarning: null,
  page: {
    title: "Travel in Egypt",
    metaDescription: "Plan a memorable holiday.",
    h1s: ["Discover Egypt"],
    canonical: "https://example.com/",
    indexable: true,
    wordCount: 1_409,
    keywordOccurrences: 2,
    imagesTotal: 4,
    imagesMissingAlt: 0,
    internalLinks: 8,
    externalLinks: 2,
    hasStructuredData: true,
  },
  checks: [
    {
      id: "title-keyword",
      label: "Keyword in page title",
      status: "improve",
      priority: "high",
      summary: "Missing keyword.",
      why: "Clarifies the topic.",
      recommendation: "Add it naturally.",
      suggestion: "Egypt tours | Example Travel",
    },
    {
      id: "h1",
      label: "Main heading",
      status: "improve",
      priority: "high",
      summary: "Missing keyword.",
      why: "Clarifies the page.",
      recommendation: "Add it naturally.",
      suggestion: "Egypt tours",
    },
  ],
};

const benchmark: PageOptimizerBenchmark = {
  keyword: "Egypt tours",
  locationCode: 2840,
  languageCode: "en",
  comparedAt: "2026-10-29T12:00:00.000Z",
  page: {
    url: pageResult.url,
    wordCount: 1_409,
    keywordOccurrences: 2,
    titleUsesKeyword: false,
    h1UsesKeyword: false,
    hasStructuredData: true,
  },
  competitors: [],
  analyzedCompetitorCount: 4,
  medianWordCount: 3_168,
  competitorsUsingKeywordInTitle: 2,
  competitorsUsingKeywordInH1: 1,
  competitorsUsingStructuredData: 4,
  topicGaps: [{ phrase: "egypt tour packages", competitorCount: 2 }],
  insights: [],
};

describe("page optimizer content brief", () => {
  it("turns optimizer suggestions and competitor gaps into a copyable plan", () => {
    const brief = buildPageOptimizerContentBrief(pageResult, benchmark);
    const markdown = formatPageOptimizerContentBriefMarkdown(brief);

    expect(brief.recommendedTitle).toBe("Egypt tours | Example Travel");
    expect(brief.recommendedH1).toBe("Egypt tours");
    expect(brief.sections).toContainEqual(
      expect.objectContaining({
        heading: "Egypt Tour Packages",
        source: "competitor gap",
      }),
    );
    expect(brief.wordCountGuidance).toContain("3,168");
    expect(markdown).toContain("# Content brief: Egypt tours");
    expect(markdown).toContain("- [ ] Review whether “egypt tour packages”");
  });
});
