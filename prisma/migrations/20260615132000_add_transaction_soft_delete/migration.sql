ALTER TABLE `transactions` 
ADD COLUMN `deleted_at` TIMESTAMP(0) NULL,
ADD COLUMN `deleted_by` INTEGER NULL;

CREATE INDEX `fk_transactions_deleted_by` ON `transactions`(`deleted_by`);

ALTER TABLE `transactions` 
ADD CONSTRAINT `fk_transactions_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
