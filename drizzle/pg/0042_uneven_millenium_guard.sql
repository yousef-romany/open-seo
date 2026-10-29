CREATE TABLE "page_optimizer_task_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"url" text NOT NULL,
	"keyword_key" text NOT NULL,
	"task_id" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_optimizer_task_statuses" ADD CONSTRAINT "page_optimizer_task_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "page_optimizer_task_statuses_target_task_uidx" ON "page_optimizer_task_statuses" USING btree ("project_id","url","keyword_key","task_id");