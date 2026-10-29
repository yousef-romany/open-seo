CREATE TABLE `seo_action_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`action_key` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seo_action_statuses_project_action_uidx` ON `seo_action_statuses` (`project_id`,`action_key`);