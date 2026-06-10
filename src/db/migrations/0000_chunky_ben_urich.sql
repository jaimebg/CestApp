CREATE TABLE IF NOT EXISTS `stores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`logo_url` text,
	`address` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_id` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`parent_id` integer,
	`keywords` text,
	`is_default` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`sync_id` text,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer,
	`date_time` integer NOT NULL,
	`total_amount` integer NOT NULL,
	`subtotal` integer,
	`tax_amount` integer,
	`discount_amount` integer,
	`payment_method` text,
	`image_path` text,
	`pdf_path` text,
	`raw_text` text,
	`processing_status` text DEFAULT 'pending' NOT NULL,
	`confidence` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sync_id` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_receipts_date` ON `receipts` (`date_time`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_receipts_store` ON `receipts` (`store_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text,
	`price` integer NOT NULL,
	`quantity` integer DEFAULT 1,
	`unit_price` integer,
	`unit` text,
	`category_id` integer,
	`confidence` integer,
	`is_manually_edited` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`sync_id` text,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_items_receipt` ON `items` (`receipt_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_items_category` ON `items` (`category_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_learned_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`normalized_name` text NOT NULL,
	`category_id` integer NOT NULL,
	`store_id` integer,
	`correction_count` integer DEFAULT 1 NOT NULL,
	`last_used_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_learned_items_unique_idx` ON `user_learned_items` (`normalized_name`,`store_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_parsing_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer NOT NULL,
	`zones` text NOT NULL,
	`parsing_hints` text,
	`sample_image_path` text,
	`template_image_dimensions` text,
	`fingerprint` text,
	`confidence` integer DEFAULT 50 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `store_parsing_templates_store_id_unique` ON `store_parsing_templates` (`store_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parsing_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer,
	`store_id` integer,
	`field_type` text NOT NULL,
	`original_value` text,
	`corrected_value` text,
	`item_index` integer,
	`ocr_context` text,
	`position_y` integer,
	`original_confidence` integer,
	`was_processed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
