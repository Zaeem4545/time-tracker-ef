-- Allow NULL values for assigned_to column in tasks table
-- First, drop foreign key constraint if it exists
SET @constraint_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tasks' 
    AND COLUMN_NAME = 'assigned_to' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql = IF(@constraint_name IS NOT NULL, 
  CONCAT('ALTER TABLE tasks DROP FOREIGN KEY ', @constraint_name), 
  'SELECT "No foreign key constraint found" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify the column to allow NULL
ALTER TABLE tasks MODIFY COLUMN assigned_to INT NULL;

