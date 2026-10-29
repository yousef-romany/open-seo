import { and, eq } from "drizzle-orm";
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
  taskId: string;
  status: PageOptimizerTaskStatus;
  updatedByUserId: string;
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
        status: params.status,
        updatedByUserId: params.updatedByUserId,
        updatedAt: params.updatedAt,
      },
    });
}

export const PageOptimizerTaskRepository = {
  listTaskStates,
  upsertTaskState,
} as const;
