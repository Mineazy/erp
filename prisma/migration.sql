-- POS Sessions
CREATE TABLE IF NOT EXISTS `erp_pos_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `session_number` VARCHAR(191) NOT NULL,
    `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `opened_by` VARCHAR(191) NOT NULL,
    `closed_by` VARCHAR(191) NULL,
    `opening_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `closing_balance` DECIMAL(15, 2) NULL,
    `total_sales` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total_refunds` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `erp_pos_sessions_session_number_key`(`session_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- POS Transactions
CREATE TABLE IF NOT EXISTS `erp_pos_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_number` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `customer_name` VARCHAR(191) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL,
    `paid_amount` DECIMAL(15, 2) NOT NULL,
    `change_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'cash',
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `notes` VARCHAR(191) NULL,
    `posted_to_journal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `erp_pos_transactions_transaction_number_key`(`transaction_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- POS Transaction Lines
CREATE TABLE IF NOT EXISTS `erp_pos_transaction_lines` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `product_name` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL,
    `unit_price` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- POS Payments
CREATE TABLE IF NOT EXISTS `erp_pos_payments` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign Keys (run after tables exist)
-- ALTER TABLE `erp_pos_transactions` ADD CONSTRAINT IF NOT EXISTS `erp_pos_transactions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `erp_pos_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- ALTER TABLE `erp_pos_transaction_lines` ADD CONSTRAINT IF NOT EXISTS `erp_pos_transaction_lines_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `erp_pos_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE `erp_pos_payments` ADD CONSTRAINT IF NOT EXISTS `erp_pos_payments_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `erp_pos_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
