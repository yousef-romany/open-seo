CREATE TABLE `page_optimizer_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`url` text NOT NULL,
	`target_keyword` text NOT NULL,
	`keyword_key` text NOT NULL,
	`title` text NOT NULL,
	`primary_h1` text,
	`passed_count` integer NOT NULL,
	`improve_count` integer NOT NULL,
	`review_count` integer NOT NULL,
	`word_count` integer NOT NULL,
	`keyword_occurrences` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_optimizer_runs_project_page_created_idx` ON `page_optimizer_runs` (`project_id`,`url`,`keyword_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `page_optimizer_runs_project_created_idx` ON `page_optimizer_runs` (`project_id`,`created_at`);