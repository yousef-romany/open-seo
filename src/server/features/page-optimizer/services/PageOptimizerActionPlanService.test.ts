import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLatestCompletedAuditForProject: vi.fn(),
  getIssuesForAudit: vi.fn(),
  listTaskStates: vi.fn(),
  upsertTaskState: vi.fn(),
}));

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {
    getLatestCompletedAuditForProject: mocks.getLatestCompletedAuditForProject,
    getIssuesForAudit: mocks.getIssuesForAudit,
  },
}));

vi.mock(
  "@/server/features/page-optimizer/repositories/PageOptimizerTaskRepository",
  () => ({
    PageOptimizerTaskRepository: {
      listTaskStates: mocks.listTaskStates,
      upsertTaskState: mocks.upsertTaskState,
    },
  }),
);

import { PageOptimizerActionPlanService } from "@/server/features/page-optimizer/services/PageOptimizerActionPlanService";

describe("PageOptimizerActionPlanService", () => {
  beforeEach(() => {
    mocks.getLatestCompletedAuditForProject.mockResolvedValue({
      id: "audit-1",
    });
    mocks.getIssuesForAudit.mockResolvedValue([
      {
        pageUrl: "https://example.com/tours/",
        issueType: "missing-h1",
        severity: "warning",
      },
      {
        pageUrl: "https://example.com/tours/?ref=audit",
        issueType: "missing-h1",
        severity: "warning",
      },
      {
        pageUrl: "https://example.com/other/",
        issueType: "missing-title",
        severity: "critical",
      },
    ]);
    mocks.listTaskStates.mockResolvedValue([]);
    mocks.upsertTaskState.mockResolvedValue(undefined);
  });

  it("returns deduplicated audit tasks for the requested page in the project audit", async () => {
    const tasks = await PageOptimizerActionPlanService.listAuditTasks({
      projectId: "project-1",
      url: "https://example.com/tours",
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        issueType: "missing-h1",
        title: "Missing H1 heading",
      }),
    ]);
    expect(mocks.getLatestCompletedAuditForProject).toHaveBeenCalledWith(
      "project-1",
    );
    expect(mocks.getIssuesForAudit).toHaveBeenCalledWith("audit-1", {});
  });
});
