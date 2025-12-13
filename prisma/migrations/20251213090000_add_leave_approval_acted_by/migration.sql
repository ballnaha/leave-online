-- Add actedById to track who actually performed an approval action (e.g., admin acting on behalf)

ALTER TABLE `leave_approvals`
  ADD COLUMN `actedById` INT NULL;

ALTER TABLE `leave_approvals`
  ADD INDEX `leave_approvals_actedById_fkey` (`actedById`);

ALTER TABLE `leave_approvals`
  ADD CONSTRAINT `leave_approvals_actedById_fkey`
  FOREIGN KEY (`actedById`) REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
