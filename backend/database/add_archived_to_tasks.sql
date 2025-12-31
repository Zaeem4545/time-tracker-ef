-- Add archived column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived TINYINT(1) DEFAULT 0;

-- Update existing tasks to have default archived status (0 = not archived)
UPDATE tasks SET archived = 0 WHERE archived IS NULL;

