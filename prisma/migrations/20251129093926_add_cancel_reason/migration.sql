-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `cancelReason` TEXT NULL,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL;
