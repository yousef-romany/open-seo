CREATE TABLE "page_optimizer_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"url" text NOT NULL,
	"target_keyword" text NOT NULL,
	"keyword_key" text NOT NULL,
	"title" text NOT NULL,
	"primary_h1" text,
	"passed_count" integer NOT NULL,
	"improve_count" integer NOT NULL,
	"review_count" integer NOT NULL,
	"word_count" integer NOT NULL,
	"keyword_occurrences" integer NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_optimizer_runs" ADD CONSTRAINT "page_optimizer_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_optimizer_runs_project_page_created_idx" ON "page_optimizer_runs" USING btree ("project_id","url","keyword_key","created_at");--> statement-breakpoint
CREATE INDEX "page_optimizer_runs_project_created_idx" ON "page_optimizer_runs" USING btree ("project_id","created_at");