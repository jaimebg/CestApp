PRAGMA foreign_keys=OFF;--> statement-breakpoint
DELETE FROM items WHERE receipt_id NOT IN (SELECT id FROM receipts);--> statement-breakpoint
CREATE TABLE `__new_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text,
	`price` integer NOT NULL,
	`quantity` real DEFAULT 1,
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
INSERT INTO `__new_items`("id", "receipt_id", "name", "normalized_name", "price", "quantity", "unit_price", "unit", "category_id", "confidence", "is_manually_edited", "created_at", "sync_id") SELECT "id", "receipt_id", "name", "normalized_name", "price", "quantity", "unit_price", "unit", "category_id", "confidence", "is_manually_edited", "created_at", "sync_id" FROM `items`;--> statement-breakpoint
DROP TABLE `items`;--> statement-breakpoint
ALTER TABLE `__new_items` RENAME TO `items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_items_receipt` ON `items` (`receipt_id`);--> statement-breakpoint
CREATE INDEX `idx_items_category` ON `items` (`category_id`);