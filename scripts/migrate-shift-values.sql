-- Migration script to update shift values from 'day'/'night' to 'shift_a'/'shift_b'
-- Run this script to migrate existing user shift data

-- Update day -> shift_a
UPDATE users SET shift = 'shift_a' WHERE shift = 'day';

-- Update night -> shift_b  
UPDATE users SET shift = 'shift_b' WHERE shift = 'night';

-- Verify the changes
SELECT shift, COUNT(*) as count FROM users WHERE shift IS NOT NULL GROUP BY shift;
