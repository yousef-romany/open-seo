import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

const mocks = vi.hoisted(() => ({
  getSerpAnalysis: vi.fn(),
  inspect: vi.fn(),
}));

vi.mock("@/server/features/keywords/services/KeywordResearchService", () => ({
  KeywordResearchService: { getSerpAnalysis: mocks.getSerpAnalysis },
}));

vi.mock(
  "@/server/features/page-optimizer/services/PageOptimizerService",
  () => ({
    PageOptimizerService: { inspect: mocks.inspect },
  }),
);

import { PageOptimizerBenchmarkService } from "@/server/features/page-optimizer/services/PageOptimizerBenchmarkService";

const billingCustomer: BillingCustomerContext = {
  organizationId: "org-1",
  userId: "user-1",
  userEmail: "owner@example.com",
  projectId: "project-1",
};

function pageResult(
  url: string,
  overrides: Partial<PageOptimizerSuccess["page"]> = {},
): PageOptimizerSuccess {
  return {
    ok: true,
    url,
    targetKeyword: "Egypt tours",
    statusCode: 200,
    responseTimeMs: 100,
    coverageWarning: null,
    page: {
      title: "Travel in Egypt",
      metaDescription: "Plan a memorable holiday.",
      h1s: ["Discover Egypt"],
      canonical: url,
      indexable: true,
      wordCount: 300,
      keywordOccurrences: 0,
      imagesTotal: 2,
      imagesMissingAlt: 0,
      internalLinks: 4,
      externalLinks: 1,
      hasStructuredData: false,
      ...overrides,
    },
    checks: [],
  };
}

describe("PageOptimizerBenchmarkService", () => {
  beforeEach(() => {
    mocks.getSerpAnalysis.mockResolvedValue({
      requestedKeyword: "egypt tours",
      depth: 20,
      items: [
        {
          rank: 1,
          title: "The project's own result",
          url: "https://www.example.com/tours",
          domain: "example.com",
          description: "Own page",
          etv: null,
          estimatedPaidTrafficCost: null,
          referringDomains: null,
          backlinks: null,
          isNew: false,
          rankChange: null,
        },
        {
          rank: 2,
          title: "Egypt Tours and Nile Cruise Planning",
          url: "https://competitor-one.test/egypt",
          domain: "competitor-one.test",
          description: "Private trips with Nile cruise planning advice.",
          etv: null,
          estimatedPaidTrafficCost: null,
          referringDomains: null,
          backlinks: null,
          isNew: false,
          rankChange: null,
        },
        {
          rank: 3,
          title: "Egypt Tours: Nile Cruise Planning",
          url: "https://competitor-two.test/tours",
          domain: "competitor-two.test",
          description: "Compare itineraries and Nile cruise planning tips.",
          etv: null,
          estimatedPaidTrafficCost: null,
          referringDomains: null,
          backlinks: null,
          isNew: false,
          rankChange: null,
        },
      ],
    });
    mocks.inspect.mockImplementation(
      async ({ url }: { url: string; targetKeyword: string }) => {
        if (url.includes("competitor-one")) {
          return {
            result: pageResult(url, {
              title: "Egypt Tours and Nile Cruise Planning",
              h1s: ["Egypt Tours and Nile Cruise Planning"],
              wordCount: 1_000,
              keywordOccurrences: 3,
              hasStructuredData: true,
            }),
            bodyText: "Nile cruise planning and private itineraries.",
          };
        }
        if (url.includes("competitor-two")) {
          return {
            result: pageResult(url, {
              title: "Egypt Tours: Nile Cruise Planning",
              h1s: ["Egypt Tours for First-Time Visitors"],
              wordCount: 600,
              keywordOccurrences: 2,
            }),
            bodyText: "Nile cruise planning and itinerary advice.",
          };
        }
        return {
          result: pageResult(url),
          bodyText: "A short introduction to holidays in the country.",
        };
      },
    );
  });

  it("excludes the project site and turns ranking-page patterns into actionable gaps", async () => {
    const result = await PageOptimizerBenchmarkService.benchmark(
      {
        projectId: "project-1",
        url: "https://example.com/",
        targetKeyword: "Egypt tours",
        locationCode: 2840,
        languageCode: "en",
      },
      billingCustomer,
    );

    expect(result.competitors.map((competitor) => competitor.domain)).toEqual([
      "competitor-one.test",
      "competitor-two.test",
    ]);
    expect(result.medianWordCount).toBe(800);
    expect(result.topicGaps).toContainEqual({
      phrase: "nile cruise",
      competitorCount: 2,
    });
    expect(
      result.insights.find((insight) => insight.id === "content-depth")?.status,
    ).toBe("opportunity");
    expect(
      result.insights.find((insight) => insight.id === "title-pattern")?.status,
    ).toBe("opportunity");
    expect(mocks.inspect).toHaveBeenCalledTimes(3);
  });
});
