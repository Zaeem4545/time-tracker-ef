-- Add manager_id column to users table if it doesn't exist
-- This allows employees to be assigned to managers

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS manager_id INT NULL AFTER contact_number,
ADD FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- This creates a relationship where:
-- - manager_id can be NULL (employee not assigned to a manager yet)
-- - If a manager is deleted, their employees are unassigned (SET NULL)

