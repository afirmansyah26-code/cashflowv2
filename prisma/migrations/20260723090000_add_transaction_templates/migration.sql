CREATE TABLE `transaction_templates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category_id` INTEGER NULL,
  `amount` DECIMAL(14, 2) NULL,
  `note` TEXT NULL,
  `admin_notes` TEXT NULL,
  `is_global` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP(0) NULL,

  INDEX `idx_transaction_templates_user` (`user_id`),
  INDEX `idx_transaction_templates_category` (`category_id`),
  INDEX `idx_transaction_templates_access` (`is_global`, `is_active`, `deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `transaction_templates`
  ADD CONSTRAINT `fk_transaction_templates_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_transaction_templates_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;
