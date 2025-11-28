/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `leave_requests` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedBy` on the `leave_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `leave_requests` DROP COLUMN `approvedAt`,
    DROP COLUMN `approvedBy`,
    DROP COLUMN `rejectedAt`,
    DROP COLUMN `rejectedBy`,
    ADD COLUMN `currentLevel` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `escalationDeadline` DATETIME(3) NULL,
    ADD COLUMN `finalApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `finalApprovedBy` INTEGER NULL,
    ADD COLUMN `finalRejectedAt` DATETIME(3) NULL,
    ADD COLUMN `finalRejectedBy` INTEGER NULL,
    ADD COLUMN `isEscalated` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` MODIFY `role` VARCHAR(191) NOT NULL DEFAULT 'employee';

-- CreateTable
CREATE TABLE `user_approval_flows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `approverId` INTEGER NOT NULL,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_approval_flows_userId_level_key`(`userId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leaveRequestId` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `approverId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `comment` TEXT NULL,
    `actionAt` DATETIME(3) NULL,
    `notifiedAt` DATETIME(3) NULL,
    `reminderCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_approvals_leaveRequestId_level_key`(`leaveRequestId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `deviceType` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_devices_playerId_key`(`playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON NULL,
    `oneSignalId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_approval_flows` ADD CONSTRAINT `user_approval_flows_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_approval_flows` ADD CONSTRAINT `user_approval_flows_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_devices` ADD CONSTRAINT `user_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
