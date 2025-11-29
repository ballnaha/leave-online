/*
  Warnings:

  - A unique constraint covering the columns `[leaveCode]` on the table `leave_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `leaveCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `leave_requests_leaveCode_key` ON `leave_requests`(`leaveCode`);
