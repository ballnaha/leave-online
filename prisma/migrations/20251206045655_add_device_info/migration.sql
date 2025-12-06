/*
  Warnings:

  - You are about to drop the column `nameEn` on the `holidays` table. All the data in the column will be lost.
  - You are about to drop the column `nameMy` on the `holidays` table. All the data in the column will be lost.
  - You are about to drop the column `nameTh` on the `holidays` table. All the data in the column will be lost.
  - Added the required column `name` to the `holidays` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `holidays` DROP COLUMN `nameEn`,
    DROP COLUMN `nameMy`,
    DROP COLUMN `nameTh`,
    ADD COLUMN `name` VARCHAR(200) NOT NULL;

-- AlterTable
ALTER TABLE `notification_logs` ADD COLUMN `isRead` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `readAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_devices` ADD COLUMN `browser` VARCHAR(191) NULL,
    ADD COLUMN `browserVersion` VARCHAR(191) NULL,
    ADD COLUMN `os` VARCHAR(191) NULL,
    ADD COLUMN `osVersion` VARCHAR(191) NULL,
    ADD COLUMN `platform` VARCHAR(191) NULL,
    ADD COLUMN `userAgent` TEXT NULL;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
