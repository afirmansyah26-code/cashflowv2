-- Preserve historical transactions when their category is deleted.
ALTER TABLE `transactions`
    DROP FOREIGN KEY `fk_transactions_category`;

ALTER TABLE `transactions`
    ADD CONSTRAINT `fk_transactions_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT;
