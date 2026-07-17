CREATE TABLE `erp_chats` (
    `id` VARCHAR(36) NOT NULL,
    `subject` VARCHAR(191),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `erp_chat_participants` (
    `id` VARCHAR(36) NOT NULL,
    `chat_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_read_at` DATETIME(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `erp_chat_participants_chat_id_user_id_key`(`chat_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `erp_chat_messages` (
    `id` VARCHAR(36) NOT NULL,
    `chat_id` VARCHAR(36) NOT NULL,
    `sender_id` VARCHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `erp_chat_participants` ADD CONSTRAINT `erp_chat_participants_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `erp_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `erp_chat_participants` ADD CONSTRAINT `erp_chat_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `erp_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `erp_chat_messages` ADD CONSTRAINT `erp_chat_messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `erp_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `erp_chat_messages` ADD CONSTRAINT `erp_chat_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `erp_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
