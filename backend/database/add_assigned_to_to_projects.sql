-- Add assigned_to column to projects table if it doesn't exist
-- This column stores the user ID of the person assigned to the project

-- Check if column exists and add if it doesn't
SET @dbname = DATABASE();
SET @tablename = 'projects';
SET @columnname = 'assigned_to';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL, ADD FOREIGN KEY (', @columnname, ') REFERENCES users(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

