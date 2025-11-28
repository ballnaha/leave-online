/*
  Warnings:

  - You are about to alter the column `role` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('employee', 'shift_supervisor', 'section_head', 'dept_manager', 'hr_manager', 'admin', 'hr') NOT NULL DEFAULT 'employee';

-- CreateTable
CREATE TABLE `approval_workflows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `section` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_workflow_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workflowId` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `approverRole` ENUM('employee', 'shift_supervisor', 'section_head', 'dept_manager', 'hr_manager', 'admin', 'hr') NULL,
    `approverId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `approval_workflow_steps` ADD CONSTRAINT `approval_workflow_steps_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `approval_workflows`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
