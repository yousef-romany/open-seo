import { describe, expect, it } from "vitest";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";
import { comparePageOptimizerRuns } from "@/shared/page-optimizer-comparison";

function result(overrides: {
  title?: string;
  titleStatus?: "pass" | "improve";
  wordCount?: number;
}): PageOptimizerSuccess {
  return {
    ok: true,
    url: "https://example.com/",
    targetKeyword: "example service",
    statusCode: 200,
    responseTimeMs: 100,
    coverageWarning: null,
    page: {
      title: overrides.title ?? "Example page",
      metaDescription: "Example description",
      h1s: ["Example heading"],
      canonical: null,
      indexable: true,
      wordCount: overrides.wordCount ?? 200,
      keywordOccurrences: 1,
      imagesTotal: 0,
      imagesMissingAlt: 0,
      internalLinks: 1,
      externalLinks: 0,
      hasStructuredData: false,
    },
    checks: [
      {
        id: "title-keyword",
        label: "Keyword in page title",
        status: overrides.titleStatus ?? "improve",
        priority: "high",
        summary: "Summary",
        why: "Reason",
        recommendation: "Recommendation",
      },
    ],
  };
}

describe("comparePageOptimizerRuns", () => {
  it("shows fixed checks and the page elements that changed", () => {
    const comparison = comparePageOptimizerRuns(
      result({}),
      result({
        title: "Example Service | Example",
        titleStatus: "pass",
        wordCount: 260,
      }),
    );

    expect(comparison.improvedChecks).toEqual(["Keyword in page title"]);
    expect(comparison.changedElements).toEqual(["Page title"]);
    expect(comparison.metrics.visibleWords).toEqual({
      before: 200,
      after: 260,
    });
    expect(comparison.hasChanges).toBe(true);
  });

  it("reports when a recheck returns the same page signals", () => {
    expect(comparePageOptimizerRuns(result({}), result({})).hasChanges).toBe(
      false,
    );
  });
});
