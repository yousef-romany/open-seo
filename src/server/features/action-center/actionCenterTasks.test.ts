import { describe, expect, it } from "vitest";
import { buildActionCenterTasks } from "@/server/features/action-center/actionCenterTasks";

describe("buildActionCenterTasks", () => {
  it("keeps in-progress work first, ranks open opportunities, and omits keep-only conflicts", () => {
    const actions = buildActionCenterTasks({
      refreshOpportunities: [
        {
          url: "https://example.com/tours",
          keyword: "egypt tours",
          priority: "high",
          reason: "Clicks and rankings fell.",
          action: "Refresh the page.",
          current: { clicks: 8, impressions: 100, ctr: 0.08, position: 8 },
          previous: {
            clicks: 23,
            impressions: 180,
            ctr: 0.13,
            position: 4,
          },
          change: {
            lostClicks: 15,
            clicksPercent: -65,
            lostImpressions: 80,
            position: 4,
          },
        },
      ],
      cannibalizationConflicts: [
        {
          query: "brand name",
          priority: "low",
          decision: "keep",
          explanation: "Google already has a clear primary page.",
          action: "Keep both pages distinct.",
          totalClicks: 40,
          totalImpressions: 300,
          primaryPage: {
            url: "https://example.com/",
            clicks: 38,
            impressions: 250,
            ctr: 0.15,
            position: 1.2,
          },
          competingPages: [
            {
              url: "https://example.com/about",
              clicks: 2,
              impressions: 50,
              ctr: 0.04,
              position: 9,
            },
          ],
        },
      ],
      auditOpportunities: [
        {
          issueType: "missing-meta-description",
          title: "Missing meta description",
          explanation: "Search snippets lack a useful description.",
          howToFix: "Write a useful description.",
          severity: "warning",
          affectedPages: 2,
          exampleUrl: "https://example.com/about",
        },
      ],
      statuses: [
        {
          actionKey: "site-audit:missing-meta-description",
          status: "in_progress",
        },
      ],
    });

    expect(actions.map((action) => [action.key, action.status])).toEqual([
      ["site-audit:missing-meta-description", "in_progress"],
      ["content-refresh:https://example.com/tours", "todo"],
    ]);
  });
});
