import { PageOptimizerHistoryRepository } from "@/server/features/page-optimizer/repositories/PageOptimizerHistoryRepository";
import {
  normalizePageOptimizerUrl,
  pageOptimizerKeywordKey,
} from "@/server/features/page-optimizer/services/pageOptimizerKeys";
import type {
  PageOptimizerHistoryEntry,
  PageOptimizerSuccess,
} from "@/shared/page-optimizer";

const HISTORY_LIMIT = 10;
const RECENT_TARGET_LIMIT = 12;
const PROJECT_RUN_CAP = 200;

async function recordRun(params: {
  projectId: string;
  createdByUserId: string;
  requestedUrl: string;
  result: PageOptimizerSuccess;
}): Promise<void> {
  const checks = params.result.checks;
  const entry: PageOptimizerHistoryEntry = {
    id: crypto.randomUUID(),
    url: normalizePageOptimizerUrl(params.requestedUrl),
    targetKeyword: params.result.targetKeyword,
    title: params.result.page.title,
    primaryH1: params.result.page.h1s[0] ?? null,
    passedCount: checks.filter((check) => check.status === "pass").length,
    improveCount: checks.filter((check) => check.status === "improve").length,
    reviewCount: checks.filter((check) => check.status === "review").length,
    wordCount: params.result.page.wordCount,
    keywordOccurrences: params.result.page.keywordOccurrences,
    createdAt: new Date().toISOString(),
  };

  await PageOptimizerHistoryRepository.insertRun({
    ...entry,
    projectId: params.projectId,
    createdByUserId: params.createdByUserId,
    keywordKey: pageOptimizerKeywordKey(params.result.targetKeyword),
  });
  await PageOptimizerHistoryRepository.pruneProjectRuns(
    params.projectId,
    PROJECT_RUN_CAP,
  );
}

async function listHistory(params: {
  projectId: string;
  url: string;
  targetKeyword: string;
}): Promise<PageOptimizerHistoryEntry[]> {
  return PageOptimizerHistoryRepository.listRuns({
    projectId: params.projectId,
    url: normalizePageOptimizerUrl(params.url),
    keywordKey: pageOptimizerKeywordKey(params.targetKeyword),
    limit: HISTORY_LIMIT,
  });
}

async function listRecentTargets(
  projectId: string,
): Promise<PageOptimizerHistoryEntry[]> {
  const runs = await PageOptimizerHistoryRepository.listRecentProjectRuns(
    projectId,
    PROJECT_RUN_CAP,
  );
  const seen = new Set<string>();
  const targets: PageOptimizerHistoryEntry[] = [];

  for (const run of runs) {
    const key = `${run.url}\n${pageOptimizerKeywordKey(run.targetKeyword)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(run);
    if (targets.length === RECENT_TARGET_LIMIT) break;
  }
  return targets;
}

export const PageOptimizerHistoryService = {
  recordRun,
  listHistory,
  listRecentTargets,
} as const;
