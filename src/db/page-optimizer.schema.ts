import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// Immutable summaries of page-optimizer runs. The live result remains the
// detailed source of truth; these rows make progress visible across sessions
// without storing a large HTML or JSON snapshot.
export const pageOptimizerRuns = sqliteTable(
  "page_optimizer_runs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").notNull(),
    url: text("url").notNull(),
    targetKeyword: text("target_keyword").notNull(),
    keywordKey: text("keyword_key").notNull(),
    title: text("title").notNull(),
    primaryH1: text("primary_h1"),
    passedCount: integer("passed_count").notNull(),
    improveCount: integer("improve_count").notNull(),
    reviewCount: integer("review_count").notNull(),
    wordCount: integer("word_count").notNull(),
    keywordOccurrences: integer("keyword_occurrences").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    index("page_optimizer_runs_project_page_created_idx").on(
      table.projectId,
      table.url,
      table.keywordKey,
      table.createdAt,
    ),
    index("page_optimizer_runs_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const pageOptimizerTaskStatuses = sqliteTable(
  "page_optimizer_task_statuses",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    keywordKey: text("keyword_key").notNull(),
    targetKeyword: text("target_keyword").notNull().default(""),
    taskId: text("task_id").notNull(),
    taskTitle: text("task_title").notNull().default(""),
    status: text("status", { enum: ["todo", "in_progress", "done"] })
      .notNull()
      .default("todo"),
    updatedByUserId: text("updated_by_user_id").notNull(),
    completedAt: text("completed_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    uniqueIndex("page_optimizer_task_statuses_target_task_uidx").on(
      table.projectId,
      table.url,
      table.keywordKey,
      table.taskId,
    ),
  ],
);
