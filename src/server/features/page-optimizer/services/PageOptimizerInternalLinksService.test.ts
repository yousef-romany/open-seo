import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

const mocks = vi.hoisted(() => ({
  getLatestCompletedAuditForProject: vi.fn(),
  getPagesForAudit: vi.fn(),
  inspect: vi.fn(),
}));

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {
    getLatestCompletedAuditForProject: mocks.getLatestCompletedAuditForProject,
    getPagesForAudit: mocks.getPagesForAudit,
  },
}));

vi.mock(
  "@/server/features/page-optimizer/services/PageOptimizerService",
  () => ({
    PageOptimizerService: { inspect: mocks.inspect },
  }),
);

import { PageOptimizerInternalLinksService } from "@/server/features/page-optimizer/services/PageOptimizerInternalLinksService";

function pageResult(
  url: string,
  title = "Egypt Tours and Private Trips",
): PageOptimizerSuccess {
  return {
    ok: true,
    url,
    targetKeyword: "Egypt tours",
    statusCode: 200,
    responseTimeMs: 100,
    coverageWarning: null,
    page: {
      title,
      metaDescription: "Plan an Egypt holiday with a local tour specialist.",
      h1s: [title],
      canonical: url,
      indexable: true,
      wordCount: 600,
      keywordOccurrences: 2,
      imagesTotal: 2,
      imagesMissingAlt: 0,
      internalLinks: 5,
      externalLinks: 1,
      hasStructuredData: false,
    },
    checks: [],
  };
}

describe("PageOptimizerInternalLinksService", () => {
  beforeEach(() => {
    mocks.getLatestCompletedAuditForProject.mockResolvedValue({
      id: "audit-1",
      completedAt: "2026-10-28T12:00:00.000Z",
      pagesCrawled: 3,
    });
    mocks.getPagesForAudit.mockResolvedValue([
      {
        id: "page-target",
        url: "https://example.com/egypt-tours/",
        statusCode: 200,
        fetchClass: "ok",
        redirectUrl: null,
        title: "Egypt Tours and Private Trips",
        metaDescription: "Private Egypt tours.",
        wordCount: 600,
        isIndexable: true,
        crawlDepth: 1,
        inSitemap: true,
        internalLinkCount: 5,
        responseTimeMs: 100,
      },
      {
        id: "page-cruise",
        url: "https://example.com/nile-cruises/",
        statusCode: 200,
        fetchClass: "ok",
        redirectUrl: null,
        title: "Egypt Nile Cruises | Example Travel",
        metaDescription: "Combine a Nile cruise with private Egypt tours.",
        wordCount: 800,
        isIndexable: true,
        crawlDepth: 1,
        inSitemap: true,
        internalLinkCount: 6,
        responseTimeMs: 100,
      },
      {
        id: "page-guide",
        url: "https://example.com/egypt-guide/",
        statusCode: 200,
        fetchClass: "ok",
        redirectUrl: null,
        title: "Egypt Travel Guide | Example Travel",
        metaDescription: "Advice for planning Egypt tours.",
        wordCount: 700,
        isIndexable: true,
        crawlDepth: 1,
        inSitemap: true,
        internalLinkCount: 7,
        responseTimeMs: 100,
      },
      {
        id: "page-guide-pagination",
        url: "https://example.com/egypt-guide/?page=2",
        statusCode: 200,
        fetchClass: "ok",
        redirectUrl: null,
        title: "Egypt Travel Guide | Example Travel",
        metaDescription: "Advice for planning Egypt tours.",
        wordCount: 700,
        isIndexable: true,
        crawlDepth: 2,
        inSitemap: false,
        internalLinkCount: 7,
        responseTimeMs: 100,
      },
    ]);
    mocks.inspect.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes("egypt-tours")) {
        return {
          result: pageResult(url),
          bodyText:
            "Choose the right Egypt itinerary for your trip. Compare routes before you book.",
          links: [
            {
              targetUrl: "https://example.com/egypt-guide/",
              anchor: "Egypt travel guide",
              isInternal: true,
            },
          ],
        };
      }
      if (url.includes("egypt-guide")) {
        return {
          result: pageResult(url, "Egypt Travel Guide"),
          bodyText:
            "Our Egypt travel guide explains routes and the best season for tours.",
          links: [
            {
              targetUrl: "https://example.com/egypt-tours",
              anchor: "Egypt tours",
              isInternal: true,
            },
          ],
        };
      }
      return {
        result: pageResult(url, "Egypt Nile Cruises"),
        bodyText:
          "Nile cruises can be combined with private Egypt tours and guided sightseeing.",
        links: [],
      };
    });
  });

  it("finds missing links in both directions and excludes links that already exist", async () => {
    const result = await PageOptimizerInternalLinksService.suggest({
      projectId: "project-1",
      url: "https://example.com/egypt-tours/",
      targetKeyword: "Egypt tours",
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result).toMatchObject({
      pagesConsidered: 2,
      pagesAnalyzed: 2,
      existingIncomingLinks: 1,
      existingOutgoingLinks: 1,
    });
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          direction: "to_page",
          sourceUrl: "https://example.com/nile-cruises/",
          suggestedAnchor: "Egypt tours",
        }),
        expect.objectContaining({
          direction: "from_page",
          destinationUrl: "https://example.com/nile-cruises/",
          suggestedAnchor: "Egypt Nile Cruises",
        }),
      ]),
    );
    expect(mocks.getLatestCompletedAuditForProject).toHaveBeenCalledWith(
      "project-1",
    );
  });

  it("asks for a Site Audit before inspecting pages when no completed audit exists", async () => {
    mocks.getLatestCompletedAuditForProject.mockResolvedValue(undefined);

    await expect(
      PageOptimizerInternalLinksService.suggest({
        projectId: "project-1",
        url: "https://example.com/egypt-tours/",
        targetKeyword: "Egypt tours",
      }),
    ).resolves.toEqual({ status: "no_audit" });
    expect(mocks.getPagesForAudit).not.toHaveBeenCalled();
    expect(mocks.inspect).not.toHaveBeenCalled();
  });
});
