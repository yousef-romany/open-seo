ALTER TABLE `page_optimizer_task_statuses` ADD `target_keyword` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `page_optimizer_task_statuses` ADD `task_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `page_optimizer_task_statuses` ADD `completed_at` text;--> statement-breakpoint
UPDATE `page_optimizer_task_statuses`
SET `target_keyword` = `keyword_key`,
    `task_title` = `task_id`,
    `completed_at` = CASE WHEN `status` = 'done' THEN `updated_at` ELSE NULL END;
