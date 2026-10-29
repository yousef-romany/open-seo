import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { PageOptimizerTaskRepository } from "@/server/features/page-optimizer/repositories/PageOptimizerTaskRepository";
import {
  normalizePageOptimizerUrl,
  pageOptimizerKeywordKey,
} from "@/server/features/page-optimizer/services/pageOptimizerKeys";
import { getIssueDescriptor } from "@/shared/audit-issues";
import type {
  PageOptimizerAuditTask,
  PageOptimizerTaskState,
  PageOptimizerTaskStatus,
} from "@/shared/page-optimizer";

function comparablePageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const pathname =
      url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/u, "");
    return `${url.origin.toLocaleLowerCase()}${pathname}`;
  } catch {
    return null;
  }
}

async function listTaskStates(params: {
  projectId: string;
  url: string;
  targetKeyword: string;
}): Promise<PageOptimizerTaskState[]> {
  return PageOptimizerTaskRepository.listTaskStates({
    projectId: params.projectId,
    url: normalizePageOptimizerUrl(params.url),
    keywordKey: pageOptimizerKeywordKey(params.targetKeyword),
  });
}

async function updateTaskStatus(params: {
  projectId: string;
  userId: string;
  url: string;
  targetKeyword: string;
  taskId: string;
  taskTitle?: string;
  status: PageOptimizerTaskStatus;
}): Promise<PageOptimizerTaskState> {
  const updatedAt = new Date().toISOString();
  const existing = (
    await PageOptimizerTaskRepository.listTaskStates({
      projectId: params.projectId,
      url: normalizePageOptimizerUrl(params.url),
      keywordKey: pageOptimizerKeywordKey(params.targetKeyword),
    })
  ).find((state) => state.taskId === params.taskId);
  const completedAt =
    params.status === "done"
      ? existing?.status === "done"
        ? existing.updatedAt
        : updatedAt
      : null;
  await PageOptimizerTaskRepository.upsertTaskState({
    id: crypto.randomUUID(),
    projectId: params.projectId,
    url: normalizePageOptimizerUrl(params.url),
    keywordKey: pageOptimizerKeywordKey(params.targetKeyword),
    targetKeyword: params.targetKeyword.trim(),
    taskId: params.taskId,
    taskTitle: params.taskTitle?.trim() || params.taskId,
    status: params.status,
    updatedByUserId: params.userId,
    completedAt,
    updatedAt,
  });
  return { taskId: params.taskId, status: params.status, updatedAt };
}

async function listAuditTasks(params: {
  projectId: string;
  url: string;
}): Promise<PageOptimizerAuditTask[]> {
  const audit = await AuditRepository.getLatestCompletedAuditForProject(
    params.projectId,
  );
  if (!audit) return [];

  const issues = await AuditRepository.getIssuesForAudit(audit.id, {});
  const targetUrl = comparablePageUrl(params.url);
  const seen = new Set<string>();
  return issues.flatMap((issue) => {
    if (
      comparablePageUrl(issue.pageUrl) !== targetUrl ||
      seen.has(issue.issueType)
    ) {
      return [];
    }
    const descriptor = getIssueDescriptor(issue.issueType);
    if (!descriptor) return [];
    seen.add(issue.issueType);
    return [
      {
        issueType: issue.issueType,
        severity: issue.severity,
        title: descriptor.title,
        explanation: descriptor.explanation,
        action: descriptor.howToFix,
      },
    ];
  });
}

export const PageOptimizerActionPlanService = {
  listTaskStates,
  updateTaskStatus,
  listAuditTasks,
} as const;
