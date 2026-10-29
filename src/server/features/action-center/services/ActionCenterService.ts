import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { ContentRefreshService } from "@/server/features/gsc/services/ContentRefreshService";
import {
  GscNotConnectedError,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import { KeywordCannibalizationService } from "@/server/features/gsc/services/KeywordCannibalizationService";
import { ActionCenterRepository } from "@/server/features/action-center/repositories/ActionCenterRepository";
import {
  buildActionCenterTasks,
  type AuditOpportunity,
} from "@/server/features/action-center/actionCenterTasks";
import { getIssueDescriptor } from "@/shared/audit-issues";
import type {
  SeoActionCenterReport,
  SeoActionStatus,
} from "@/shared/action-center";

async function loadAuditOpportunities(projectId: string): Promise<{
  available: boolean;
  opportunities: AuditOpportunity[];
}> {
  const audit =
    await AuditRepository.getLatestCompletedAuditForProject(projectId);
  if (!audit) return { available: false, opportunities: [] };
  const issues = await AuditRepository.getIssuesForAudit(audit.id, {});
  const grouped = new Map<string, AuditOpportunity>();
  for (const issue of issues) {
    const descriptor = getIssueDescriptor(issue.issueType);
    if (!descriptor) continue;
    const existing = grouped.get(issue.issueType);
    if (existing) {
      existing.affectedPages += 1;
      continue;
    }
    grouped.set(issue.issueType, {
      issueType: issue.issueType,
      title: descriptor.title,
      explanation: descriptor.explanation,
      howToFix: descriptor.howToFix,
      severity: issue.severity,
      affectedPages: 1,
      exampleUrl: issue.pageUrl,
    });
  }
  return { available: true, opportunities: Array.from(grouped.values()) };
}

async function loadGscOpportunities(projectId: string) {
  try {
    const [refresh, cannibalization] = await Promise.all([
      ContentRefreshService.getReport(projectId),
      KeywordCannibalizationService.getReport(projectId),
    ]);
    return {
      connected: true,
      refreshOpportunities: refresh.opportunities,
      cannibalizationConflicts: cannibalization.conflicts,
    };
  } catch (error) {
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return {
        connected: false,
        refreshOpportunities: [],
        cannibalizationConflicts: [],
      };
    }
    throw error;
  }
}

async function getReport(projectId: string): Promise<SeoActionCenterReport> {
  const [statuses, audit, gsc] = await Promise.all([
    ActionCenterRepository.listStatuses(projectId),
    loadAuditOpportunities(projectId),
    loadGscOpportunities(projectId),
  ]);
  const actions = buildActionCenterTasks({
    refreshOpportunities: gsc.refreshOpportunities,
    cannibalizationConflicts: gsc.cannibalizationConflicts,
    auditOpportunities: audit.opportunities,
    statuses,
  });
  const open = actions.filter((action) => action.status !== "done");
  return {
    generatedAt: new Date().toISOString(),
    actions,
    startHere: open.slice(0, 3),
    weeklyPlan: open.slice(0, 7),
    sources: {
      gscConnected: gsc.connected,
      auditAvailable: audit.available,
    },
    summary: {
      total: actions.length,
      todo: actions.filter((action) => action.status === "todo").length,
      inProgress: actions.filter((action) => action.status === "in_progress")
        .length,
      done: actions.filter((action) => action.status === "done").length,
      highImpact: open.filter((action) => action.impact === "high").length,
    },
  };
}

async function updateStatus(input: {
  projectId: string;
  userId: string;
  actionKey: string;
  status: SeoActionStatus;
}) {
  const updatedAt = new Date().toISOString();
  await ActionCenterRepository.upsertStatus({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    actionKey: input.actionKey,
    status: input.status,
    updatedByUserId: input.userId,
    updatedAt,
  });
  return { actionKey: input.actionKey, status: input.status, updatedAt };
}

export const ActionCenterService = { getReport, updateStatus } as const;
