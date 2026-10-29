CREATE TABLE `page_optimizer_task_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`url` text NOT NULL,
	`keyword_key` text NOT NULL,
	`task_id` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_optimizer_task_statuses_target_task_uidx` ON `page_optimizer_task_statuses` (`project_id`,`url`,`keyword_key`,`task_id`);