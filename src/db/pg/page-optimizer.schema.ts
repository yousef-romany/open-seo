import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const pageOptimizerRuns = pgTable(
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
    createdAt: text("created_at").notNull().default(isoNow),
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

export const pageOptimizerTaskStatuses = pgTable(
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
    updatedAt: text("updated_at").notNull().default(isoNow),
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
