import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

export const seoActionStatuses = sqliteTable(
  "seo_action_statuses",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actionKey: text("action_key").notNull(),
    status: text("status", { enum: ["todo", "in_progress", "done"] })
      .notNull()
      .default("todo"),
    updatedByUserId: text("updated_by_user_id").notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => [
    uniqueIndex("seo_action_statuses_project_action_uidx").on(
      table.projectId,
      table.actionKey,
    ),
  ],
);
