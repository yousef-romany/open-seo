import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seoActionStatuses } from "@/db/schema";
import type { SeoActionStatus } from "@/shared/action-center";

async function listStatuses(projectId: string) {
  return db
    .select({
      actionKey: seoActionStatuses.actionKey,
      status: seoActionStatuses.status,
      updatedAt: seoActionStatuses.updatedAt,
    })
    .from(seoActionStatuses)
    .where(eq(seoActionStatuses.projectId, projectId));
}

async function upsertStatus(input: {
  id: string;
  projectId: string;
  actionKey: string;
  status: SeoActionStatus;
  updatedByUserId: string;
  updatedAt: string;
}) {
  await db
    .insert(seoActionStatuses)
    .values(input)
    .onConflictDoUpdate({
      target: [seoActionStatuses.projectId, seoActionStatuses.actionKey],
      set: {
        status: input.status,
        updatedByUserId: input.updatedByUserId,
        updatedAt: input.updatedAt,
      },
    });
}

export const ActionCenterRepository = { listStatuses, upsertStatus } as const;
