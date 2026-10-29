import { PageOptimizerTaskRepository } from "@/server/features/page-optimizer/repositories/PageOptimizerTaskRepository";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { sumSearchTotals } from "@/server/features/gsc/searchPerformanceReport";
import { GscService } from "@/server/features/gsc/services/GscService";
import type {
  SeoResultMetrics,
  SeoResultTracker,
  SeoResultsReport,
} from "@/shared/page-optimizer";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MEASUREMENT_DAYS = 7;
const MAX_MEASUREMENT_DAYS = 28;

function dateMs(value: string): number {
  return Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
}

function formatDate(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function percentChange(current: number, baseline: number): number | null {
  if (baseline === 0) return current === 0 ? 0 : null;
  return (current - baseline) / baseline;
}

function classify(
  baseline: SeoResultMetrics,
  current: SeoResultMetrics,
): SeoResultTracker["status"] {
  const baselineClicksPerDay = baseline.clicks / baseline.days;
  const currentClicksPerDay = current.clicks / current.days;
  const clicksChange = percentChange(currentClicksPerDay, baselineClicksPerDay);
  const positionChange = baseline.position - current.position;

  if (
    (clicksChange !== null && clicksChange >= 0.1) ||
    current.ctr - baseline.ctr >= 0.01 ||
    (current.impressions >= 20 && positionChange >= 1)
  ) {
    return "improving";
  }
  if (
    current.days >= 14 &&
    ((clicksChange !== null && clicksChange <= -0.2) ||
      (current.impressions >= 20 && positionChange <= -2))
  ) {
    return "needs_attention";
  }
  return "steady";
}

async function loadMetrics(input: {
  projectId: string;
  url: string;
  targetKeyword: string;
  startDate: string;
  endDate: string;
  days: number;
}): Promise<SeoResultMetrics> {
  const result = await GscService.getPerformance({
    projectId: input.projectId,
    dimensions: ["date"],
    startDate: input.startDate,
    endDate: input.endDate,
    filters: [
      { dimension: "page", operator: "equals", expression: input.url },
      {
        dimension: "query",
        operator: "equals",
        expression: input.targetKeyword,
      },
    ],
    rowLimit: 40,
  });
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    days: input.days,
    ...sumSearchTotals(result.rows),
  };
}

async function buildTracker(
  projectId: string,
  task: Awaited<
    ReturnType<typeof PageOptimizerTaskRepository.listCompletedTasks>
  >[number],
  latestDataDate: string,
): Promise<SeoResultTracker> {
  const completedDate = task.completedAt!.slice(0, 10);
  const measurementStartMs = dateMs(completedDate) + DAY_MS;
  const availableDays = Math.max(
    0,
    Math.floor((dateMs(latestDataDate) - measurementStartMs) / DAY_MS) + 1,
  );
  const daysMeasured = Math.min(availableDays, MAX_MEASUREMENT_DAYS);
  const base = {
    taskId: task.taskId,
    taskTitle: task.taskTitle || task.taskId,
    url: task.url,
    targetKeyword: task.targetKeyword || task.keywordKey,
    completedAt: task.completedAt!,
    daysMeasured,
  };

  if (daysMeasured < MIN_MEASUREMENT_DAYS) {
    return {
      ...base,
      status: "waiting",
      baseline: null,
      current: null,
      changes: {
        clicksPerDay: null,
        impressionsPerDay: null,
        ctr: null,
        position: null,
      },
    };
  }

  const currentStartDate = formatDate(measurementStartMs);
  const currentEndDate = formatDate(
    measurementStartMs + (daysMeasured - 1) * DAY_MS,
  );
  const baselineEndMs = dateMs(completedDate) - DAY_MS;
  const baselineStartDate = formatDate(
    baselineEndMs - (daysMeasured - 1) * DAY_MS,
  );
  const baselineEndDate = formatDate(baselineEndMs);
  const metricInput = {
    projectId,
    url: task.url,
    targetKeyword: task.targetKeyword || task.keywordKey,
    days: daysMeasured,
  };
  const [baseline, current] = await Promise.all([
    loadMetrics({
      ...metricInput,
      startDate: baselineStartDate,
      endDate: baselineEndDate,
    }),
    loadMetrics({
      ...metricInput,
      startDate: currentStartDate,
      endDate: currentEndDate,
    }),
  ]);
  return {
    ...base,
    status: classify(baseline, current),
    baseline,
    current,
    changes: {
      clicksPerDay: percentChange(
        current.clicks / current.days,
        baseline.clicks / baseline.days,
      ),
      impressionsPerDay: percentChange(
        current.impressions / current.days,
        baseline.impressions / baseline.days,
      ),
      ctr: current.ctr - baseline.ctr,
      position:
        baseline.impressions > 0 && current.impressions > 0
          ? baseline.position - current.position
          : null,
    },
  };
}

async function getReport(projectId: string): Promise<SeoResultsReport> {
  const tasks = await PageOptimizerTaskRepository.listCompletedTasks(
    projectId,
    10,
  );
  const { endDate } = resolveDateRange({ dateRange: "last_28_days" });
  const trackers = await Promise.all(
    tasks.map((task) => buildTracker(projectId, task, endDate)),
  );
  return {
    generatedAt: new Date().toISOString(),
    trackers,
    summary: {
      total: trackers.length,
      waiting: trackers.filter((item) => item.status === "waiting").length,
      improving: trackers.filter((item) => item.status === "improving").length,
      needsAttention: trackers.filter(
        (item) => item.status === "needs_attention",
      ).length,
    },
  };
}

export const SeoResultsService = { getReport } as const;
