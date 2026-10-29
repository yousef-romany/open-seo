import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pageOptimizerRuns } from "@/db/schema";
import type { PageOptimizerHistoryEntry } from "@/shared/page-optimizer";

const columns = {
  id: pageOptimizerRuns.id,
  url: pageOptimizerRuns.url,
  targetKeyword: pageOptimizerRuns.targetKeyword,
  title: pageOptimizerRuns.title,
  primaryH1: pageOptimizerRuns.primaryH1,
  passedCount: pageOptimizerRuns.passedCount,
  improveCount: pageOptimizerRuns.improveCount,
  reviewCount: pageOptimizerRuns.reviewCount,
  wordCount: pageOptimizerRuns.wordCount,
  keywordOccurrences: pageOptimizerRuns.keywordOccurrences,
  createdAt: pageOptimizerRuns.createdAt,
};

type InsertRun = PageOptimizerHistoryEntry & {
  projectId: string;
  createdByUserId: string;
  keywordKey: string;
};

async function insertRun(run: InsertRun): Promise<void> {
  await db.insert(pageOptimizerRuns).values(run);
}

async function listRuns(params: {
  projectId: string;
  url: string;
  keywordKey: string;
  limit: number;
}): Promise<PageOptimizerHistoryEntry[]> {
  return db
    .select(columns)
    .from(pageOptimizerRuns)
    .where(
      and(
        eq(pageOptimizerRuns.projectId, params.projectId),
        eq(pageOptimizerRuns.url, params.url),
        eq(pageOptimizerRuns.keywordKey, params.keywordKey),
      ),
    )
    .orderBy(desc(pageOptimizerRuns.createdAt), desc(pageOptimizerRuns.id))
    .limit(params.limit);
}

async function listRecentProjectRuns(
  projectId: string,
  limit: number,
): Promise<PageOptimizerHistoryEntry[]> {
  return db
    .select(columns)
    .from(pageOptimizerRuns)
    .where(eq(pageOptimizerRuns.projectId, projectId))
    .orderBy(desc(pageOptimizerRuns.createdAt), desc(pageOptimizerRuns.id))
    .limit(limit);
}

async function pruneProjectRuns(
  projectId: string,
  keepCount: number,
): Promise<void> {
  const staleRows = await db
    .select({ id: pageOptimizerRuns.id })
    .from(pageOptimizerRuns)
    .where(eq(pageOptimizerRuns.projectId, projectId))
    .orderBy(desc(pageOptimizerRuns.createdAt), desc(pageOptimizerRuns.id))
    .limit(1_000)
    .offset(keepCount);
  if (staleRows.length === 0) return;

  await db.delete(pageOptimizerRuns).where(
    and(
      eq(pageOptimizerRuns.projectId, projectId),
      inArray(
        pageOptimizerRuns.id,
        staleRows.map((row) => row.id),
      ),
    ),
  );
}

export const PageOptimizerHistoryRepository = {
  insertRun,
  listRuns,
  listRecentProjectRuns,
  pruneProjectRuns,
} as const;
