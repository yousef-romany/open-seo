import type {
  PageOptimizerCheckStatus,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const STATUS_RANK: Record<PageOptimizerCheckStatus, number> = {
  pass: 0,
  review: 1,
  improve: 2,
};

interface PageOptimizerRunComparison {
  improvedChecks: string[];
  regressedChecks: string[];
  changedElements: string[];
  metrics: {
    passed: { before: number; after: number };
    needChanges: { before: number; after: number };
    visibleWords: { before: number; after: number };
    keywordUses: { before: number; after: number };
  };
  hasChanges: boolean;
}

function countStatus(
  result: PageOptimizerSuccess,
  status: PageOptimizerCheckStatus,
) {
  return result.checks.filter((check) => check.status === status).length;
}

export function comparePageOptimizerRuns(
  before: PageOptimizerSuccess,
  after: PageOptimizerSuccess,
): PageOptimizerRunComparison {
  const beforeChecks = new Map(before.checks.map((check) => [check.id, check]));
  const improvedChecks: string[] = [];
  const regressedChecks: string[] = [];

  for (const check of after.checks) {
    const previous = beforeChecks.get(check.id);
    if (!previous) continue;
    if (STATUS_RANK[check.status] < STATUS_RANK[previous.status]) {
      improvedChecks.push(check.label);
    }
    if (STATUS_RANK[check.status] > STATUS_RANK[previous.status]) {
      regressedChecks.push(check.label);
    }
  }

  const changedElements = [
    before.page.title !== after.page.title ? "Page title" : null,
    before.page.metaDescription !== after.page.metaDescription
      ? "Search description"
      : null,
    before.page.h1s.join("\n") !== after.page.h1s.join("\n")
      ? "Main heading"
      : null,
  ].filter((label): label is string => label !== null);

  const metrics = {
    passed: {
      before: countStatus(before, "pass"),
      after: countStatus(after, "pass"),
    },
    needChanges: {
      before: countStatus(before, "improve"),
      after: countStatus(after, "improve"),
    },
    visibleWords: {
      before: before.page.wordCount,
      after: after.page.wordCount,
    },
    keywordUses: {
      before: before.page.keywordOccurrences,
      after: after.page.keywordOccurrences,
    },
  };
  const metricChanged = Object.values(metrics).some(
    (metric) => metric.before !== metric.after,
  );

  return {
    improvedChecks,
    regressedChecks,
    changedElements,
    metrics,
    hasChanges:
      improvedChecks.length > 0 ||
      regressedChecks.length > 0 ||
      changedElements.length > 0 ||
      metricChanged,
  };
}
