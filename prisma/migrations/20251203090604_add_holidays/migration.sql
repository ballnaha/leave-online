-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `nameTh` VARCHAR(200) NOT NULL,
    `nameEn` VARCHAR(200) NOT NULL,
    `nameMy` VARCHAR(200) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'company',
    `companyId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `holidays_date_idx`(`date`),
    INDEX `holidays_companyId_idx`(`companyId`),
    UNIQUE INDEX `holidays_date_companyId_key`(`date`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
