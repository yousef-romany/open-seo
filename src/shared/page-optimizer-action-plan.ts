import { sort } from "remeda";
import type {
  PageOptimizerActionTask,
  PageOptimizerAuditTask,
  PageOptimizerBenchmark,
  PageOptimizerInternalLinksResult,
  PageOptimizerPriority,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const PRIORITY_ORDER: Record<PageOptimizerPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const AUDIT_OVERLAPS: Record<string, string[]> = {
  "missing-title": ["title-keyword", "title-length"],
  "title-too-long": ["title-length"],
  "title-too-short": ["title-length"],
  "missing-meta-description": ["meta-description"],
  "meta-description-too-long": ["meta-description"],
  "meta-description-too-short": ["meta-description"],
  "missing-h1": ["h1"],
  "multiple-h1": ["h1"],
  "thin-content": ["content-depth"],
  "images-missing-alt": ["image-alt"],
  "no-outgoing-links": ["internal-links"],
  "noindex-page": ["indexability"],
  "canonical-conflict": ["canonical"],
  "canonicalized-page": ["canonical"],
};

function auditPriority(
  severity: PageOptimizerAuditTask["severity"],
): PageOptimizerPriority {
  if (severity === "critical") return "high";
  if (severity === "warning") return "medium";
  return "low";
}

export function buildPageOptimizerActionPlan(input: {
  page: PageOptimizerSuccess;
  auditTasks?: PageOptimizerAuditTask[];
  benchmark?: PageOptimizerBenchmark | null;
  internalLinks?: PageOptimizerInternalLinksResult | null;
}): PageOptimizerActionTask[] {
  const activeChecks = input.page.checks.filter(
    (check) => check.status !== "pass",
  );
  const tasks: PageOptimizerActionTask[] = activeChecks.map((check) => ({
    id: `on-page:${check.id}`,
    source: "on_page",
    priority: check.priority,
    title: check.label,
    action: check.recommendation,
    why: check.why,
    verification: `Recheck the page and confirm “${check.label}” moves to Passed.`,
    ...(check.suggestion ? { suggestion: check.suggestion } : {}),
  }));
  const activeCheckIds = new Set(activeChecks.map((check) => check.id));

  for (const auditTask of input.auditTasks ?? []) {
    const overlaps = AUDIT_OVERLAPS[auditTask.issueType] ?? [];
    if (overlaps.some((checkId) => activeCheckIds.has(checkId))) continue;
    tasks.push({
      id: `site-audit:${auditTask.issueType}`,
      source: "site_audit",
      priority: auditPriority(auditTask.severity),
      title: auditTask.title,
      action: auditTask.action,
      why: auditTask.explanation,
      verification:
        "Run a new Site Audit and confirm this issue no longer appears for the page.",
    });
  }

  for (const insight of input.benchmark?.insights ?? []) {
    if (insight.status === "strong") continue;
    tasks.push({
      id: `competitors:${insight.id}`,
      source: "competitors",
      priority: insight.status === "opportunity" ? "medium" : "low",
      title: insight.title,
      action: insight.action,
      why: insight.summary,
      verification:
        "Run the competitor benchmark again and review how the updated page compares.",
    });
  }

  if (input.internalLinks?.status === "ready") {
    for (const suggestion of input.internalLinks.suggestions) {
      const editTitle =
        suggestion.direction === "to_page"
          ? suggestion.sourceTitle
          : input.page.page.title;
      tasks.push({
        id: `internal-links:${suggestion.id}`,
        source: "internal_links",
        priority: "medium",
        title: `Add an internal link on ${editTitle}`,
        action: `${suggestion.placement} Use “${suggestion.suggestedAnchor}” as the anchor text.`,
        why: suggestion.reason,
        verification:
          "Run Internal link suggestions again and confirm this opportunity is gone.",
        suggestion: suggestion.suggestedAnchor,
        destinationUrl: suggestion.destinationUrl,
      });
    }
  }

  return sort(tasks, (first, second) => {
    const priorityDifference =
      PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
    if (priorityDifference !== 0) return priorityDifference;
    return first.title.localeCompare(second.title);
  });
}
