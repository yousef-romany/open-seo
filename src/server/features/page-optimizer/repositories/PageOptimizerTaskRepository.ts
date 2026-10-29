import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { pageOptimizerTaskStatuses } from "@/db/schema";
import type {
  PageOptimizerTaskState,
  PageOptimizerTaskStatus,
} from "@/shared/page-optimizer";

async function listTaskStates(params: {
  projectId: string;
  url: string;
  keywordKey: string;
}): Promise<PageOptimizerTaskState[]> {
  return db
    .select({
      taskId: pageOptimizerTaskStatuses.taskId,
      status: pageOptimizerTaskStatuses.status,
      updatedAt: pageOptimizerTaskStatuses.updatedAt,
    })
    .from(pageOptimizerTaskStatuses)
    .where(
      and(
        eq(pageOptimizerTaskStatuses.projectId, params.projectId),
        eq(pageOptimizerTaskStatuses.url, params.url),
        eq(pageOptimizerTaskStatuses.keywordKey, params.keywordKey),
      ),
    );
}

async function upsertTaskState(params: {
  id: string;
  projectId: string;
  url: string;
  keywordKey: string;
  targetKeyword: string;
  taskId: string;
  taskTitle: string;
  status: PageOptimizerTaskStatus;
  updatedByUserId: string;
  completedAt: string | null;
  updatedAt: string;
}): Promise<void> {
  await db
    .insert(pageOptimizerTaskStatuses)
    .values(params)
    .onConflictDoUpdate({
      target: [
        pageOptimizerTaskStatuses.projectId,
        pageOptimizerTaskStatuses.url,
        pageOptimizerTaskStatuses.keywordKey,
        pageOptimizerTaskStatuses.taskId,
      ],
      set: {
        targetKeyword: params.targetKeyword,
        taskTitle: params.taskTitle,
        status: params.status,
        updatedByUserId: params.updatedByUserId,
        completedAt: params.completedAt,
        updatedAt: params.updatedAt,
      },
    });
}

async function listCompletedTasks(projectId: string, limit = 20) {
  return db
    .select({
      taskId: pageOptimizerTaskStatuses.taskId,
      taskTitle: pageOptimizerTaskStatuses.taskTitle,
      url: pageOptimizerTaskStatuses.url,
      keywordKey: pageOptimizerTaskStatuses.keywordKey,
      targetKeyword: pageOptimizerTaskStatuses.targetKeyword,
      completedAt: pageOptimizerTaskStatuses.completedAt,
    })
    .from(pageOptimizerTaskStatuses)
    .where(
      and(
        eq(pageOptimizerTaskStatuses.projectId, projectId),
        eq(pageOptimizerTaskStatuses.status, "done"),
        isNotNull(pageOptimizerTaskStatuses.completedAt),
      ),
    )
    .orderBy(desc(pageOptimizerTaskStatuses.completedAt))
    .limit(limit);
}

export const PageOptimizerTaskRepository = {
  listTaskStates,
  listCompletedTasks,
  upsertTaskState,
} as const;
