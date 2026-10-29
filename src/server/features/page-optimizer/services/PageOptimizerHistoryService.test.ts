import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageOptimizerSuccess } from "@/shared/page-optimizer";

const mocks = vi.hoisted(() => ({
  insertRun: vi.fn(),
  listRuns: vi.fn(),
  listRecentProjectRuns: vi.fn(),
  pruneProjectRuns: vi.fn(),
}));

vi.mock(
  "@/server/features/page-optimizer/repositories/PageOptimizerHistoryRepository",
  () => ({ PageOptimizerHistoryRepository: mocks }),
);

import { PageOptimizerHistoryService } from "@/server/features/page-optimizer/services/PageOptimizerHistoryService";

const result: PageOptimizerSuccess = {
  ok: true,
  url: "https://example.com/service",
  targetKeyword: "Example Service",
  statusCode: 200,
  responseTimeMs: 100,
  coverageWarning: null,
  page: {
    title: "Example Service",
    metaDescription: "Description",
    h1s: ["Example Service"],
    canonical: null,
    indexable: true,
    wordCount: 250,
    keywordOccurrences: 2,
    imagesTotal: 1,
    imagesMissingAlt: 0,
    internalLinks: 3,
    externalLinks: 0,
    hasStructuredData: true,
  },
  checks: [
    {
      id: "title-keyword",
      label: "Keyword in page title",
      status: "pass",
      priority: "high",
      summary: "Pass",
      why: "Reason",
      recommendation: "Keep it",
    },
    {
      id: "image-alt",
      label: "Image descriptions",
      status: "improve",
      priority: "medium",
      summary: "Improve",
      why: "Reason",
      recommendation: "Fix it",
    },
  ],
};

describe("PageOptimizerHistoryService", () => {
  beforeEach(() => {
    mocks.insertRun.mockResolvedValue(undefined);
    mocks.listRuns.mockResolvedValue([]);
    mocks.listRecentProjectRuns.mockResolvedValue([]);
    mocks.pruneProjectRuns.mockResolvedValue(undefined);
  });

  it("records a project-scoped summary and enforces the history cap", async () => {
    await PageOptimizerHistoryService.recordRun({
      projectId: "project_1",
      createdByUserId: "user_1",
      requestedUrl: "https://example.com/service",
      result,
    });

    expect(mocks.insertRun).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        createdByUserId: "user_1",
        url: "https://example.com/service",
        keywordKey: "example service",
        passedCount: 1,
        improveCount: 1,
        reviewCount: 0,
      }),
    );
    expect(mocks.pruneProjectRuns).toHaveBeenCalledWith("project_1", 200);
  });

  it("lists only the requested project, page, and normalized keyword", async () => {
    await PageOptimizerHistoryService.listHistory({
      projectId: "project_1",
      url: "https://example.com/service",
      targetKeyword: "  EXAMPLE   SERVICE ",
    });

    expect(mocks.listRuns).toHaveBeenCalledWith({
      projectId: "project_1",
      url: "https://example.com/service",
      keywordKey: "example service",
      limit: 10,
    });
  });

  it("returns the latest run for each page and keyword pair", async () => {
    const first = {
      id: "run_2",
      url: "https://example.com/service",
      targetKeyword: "Example Service",
      title: "New title",
      primaryH1: "Example Service",
      passedCount: 8,
      improveCount: 2,
      reviewCount: 0,
      wordCount: 300,
      keywordOccurrences: 2,
      createdAt: "2026-10-29T10:00:00.000Z",
    };
    mocks.listRecentProjectRuns.mockResolvedValue([
      first,
      { ...first, id: "run_1", title: "Old title" },
      {
        ...first,
        id: "run_3",
        targetKeyword: "Another Keyword",
      },
    ]);

    const targets =
      await PageOptimizerHistoryService.listRecentTargets("project_1");

    expect(mocks.listRecentProjectRuns).toHaveBeenCalledWith("project_1", 200);
    expect(targets.map((target) => target.id)).toEqual(["run_2", "run_3"]);
  });
});
