CREATE TABLE "seo_action_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"action_key" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_action_statuses" ADD CONSTRAINT "seo_action_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seo_action_statuses_project_action_uidx" ON "seo_action_statuses" USING btree ("project_id","action_key");