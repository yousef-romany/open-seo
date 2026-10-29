import { sort } from "remeda";
import type { ContentRefreshOpportunity } from "@/server/features/gsc/contentRefreshReport";
import type { KeywordCannibalizationConflict } from "@/server/features/gsc/keywordCannibalizationReport";
import type {
  SeoActionDifficulty,
  SeoActionItem,
  SeoActionLevel,
  SeoActionStatus,
} from "@/shared/action-center";

type AuditOpportunity = {
  issueType: string;
  title: string;
  explanation: string;
  howToFix: string;
  severity: "critical" | "warning" | "info";
  affectedPages: number;
  exampleUrl: string;
};

type RankedAction = SeoActionItem & { score: number };

const levelScore: Record<SeoActionLevel, number> = {
  high: 90,
  medium: 60,
  low: 30,
};

const statusOrder: Record<SeoActionStatus, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

function auditDifficulty(issueType: string): SeoActionDifficulty {
  if (
    [
      "blocked-page",
      "server-error",
      "crawl-rate-limited",
      "redirect-loop",
      "canonical-conflict",
    ].includes(issueType)
  ) {
    return "hard";
  }
  if (
    [
      "missing-title",
      "missing-meta-description",
      "missing-h1",
      "title-too-long",
      "title-too-short",
    ].includes(issueType)
  ) {
    return "easy";
  }
  return "medium";
}

function withStatus(
  action: Omit<RankedAction, "status">,
  statuses: Map<string, SeoActionStatus>,
): RankedAction {
  return { ...action, status: statuses.get(action.key) ?? "todo" };
}

function refreshActions(
  opportunities: ContentRefreshOpportunity[],
  statuses: Map<string, SeoActionStatus>,
): RankedAction[] {
  return opportunities.slice(0, 6).map((item) => {
    const key = `content-refresh:${item.url}`;
    const impact = item.priority;
    const lostClicks = Math.round(item.change.lostClicks);
    return withStatus(
      {
        key,
        source: "content_refresh",
        title: `Refresh ${new URL(item.url).pathname || "/"}`,
        why: item.action,
        evidence: `${lostClicks} fewer click${lostClicks === 1 ? "" : "s"} than the previous 28 days. ${item.reason}`,
        steps: [
          "Open the page in Page Optimizer and review the recommended title, headings, and missing topics.",
          "Update the sections that no longer answer the main query clearly.",
          "Publish the change, mark the relevant action-plan tasks Done, and let SEO Results track it.",
        ],
        impact,
        difficulty: "medium",
        tool: item.keyword ? "page_optimizer" : "content_refresh",
        url: item.url,
        ...(item.keyword ? { keyword: item.keyword } : {}),
        score: levelScore[impact] + Math.min(lostClicks, 25),
      },
      statuses,
    );
  });
}

function cannibalizationActions(
  conflicts: KeywordCannibalizationConflict[],
  statuses: Map<string, SeoActionStatus>,
): RankedAction[] {
  return conflicts
    .filter((conflict) => conflict.decision !== "keep")
    .slice(0, 4)
    .map((conflict) => {
      const key = `cannibalization:${conflict.query}`;
      const impact = conflict.priority;
      return withStatus(
        {
          key,
          source: "cannibalization",
          title: `Clarify which page should rank for “${conflict.query}”`,
          why: conflict.action,
          evidence: `${conflict.totalImpressions.toLocaleString()} impressions were split across ${conflict.competingPages.length + 1} pages in 28 days. ${conflict.explanation}`,
          steps: [
            "Open the Cannibalization report and compare the primary and competing pages.",
            "Confirm whether the pages serve the same intent before merging, redirecting, or repositioning anything.",
            "Make the chosen page's title, H1, copy, and internal-link anchors clearly match this query.",
          ],
          impact,
          difficulty:
            conflict.decision === "redirect" || conflict.decision === "merge"
              ? "hard"
              : "medium",
          tool: "cannibalization",
          url: conflict.primaryPage.url,
          keyword: conflict.query,
          score:
            levelScore[impact] +
            Math.min(Math.round(conflict.totalImpressions / 50), 20),
        },
        statuses,
      );
    });
}

function auditActions(
  opportunities: AuditOpportunity[],
  statuses: Map<string, SeoActionStatus>,
): RankedAction[] {
  return opportunities.slice(0, 6).map((item) => {
    const impact: SeoActionLevel =
      item.severity === "critical"
        ? "high"
        : item.severity === "warning"
          ? "medium"
          : "low";
    const key = `site-audit:${item.issueType}`;
    return withStatus(
      {
        key,
        source: "site_audit",
        title: `${item.title} on ${item.affectedPages} page${item.affectedPages === 1 ? "" : "s"}`,
        why: item.howToFix,
        evidence: `${item.explanation} The latest audit found ${item.affectedPages} affected page${item.affectedPages === 1 ? "" : "s"}.`,
        steps: [
          "Open Site Audit and inspect the affected URLs and issue details.",
          item.howToFix,
          "Run a new audit and confirm the issue count falls.",
        ],
        impact,
        difficulty: auditDifficulty(item.issueType),
        tool: "site_audit",
        url: item.exampleUrl,
        score: levelScore[impact] + Math.min(item.affectedPages, 20),
      },
      statuses,
    );
  });
}

export function buildActionCenterTasks(input: {
  refreshOpportunities: ContentRefreshOpportunity[];
  cannibalizationConflicts: KeywordCannibalizationConflict[];
  auditOpportunities: AuditOpportunity[];
  statuses: Array<{ actionKey: string; status: SeoActionStatus }>;
}): SeoActionItem[] {
  const statuses = new Map(
    input.statuses.map((item) => [item.actionKey, item.status]),
  );
  const actions = [
    ...refreshActions(input.refreshOpportunities, statuses),
    ...cannibalizationActions(input.cannibalizationConflicts, statuses),
    ...auditActions(input.auditOpportunities, statuses),
  ];
  return sort(
    actions,
    (first, second) =>
      statusOrder[first.status] - statusOrder[second.status] ||
      second.score - first.score ||
      first.title.localeCompare(second.title),
  ).map(({ score: _score, ...action }) => action);
}

export type { AuditOpportunity };
