-- Migration to add created_by column to projects table
-- This column will store the ID of the user who created the project.

-- Check if the column 'created_by' already exists in the 'projects' table
SELECT COUNT(*)
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'projects'
  AND COLUMN_NAME = 'created_by';

-- If the count is 0, the column does not exist, so add it
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'created_by') = 0,
    'ALTER TABLE projects ADD COLUMN created_by INT NULL AFTER assigned_to;',
    'SELECT "Column created_by already exists in projects table. Skipping migration." AS Message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add a foreign key constraint to the users table
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND CONSTRAINT_NAME = 'fk_projects_created_by') = 0,
    'ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;',
    'SELECT "Foreign key fk_projects_created_by already exists. Skipping." AS Message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

