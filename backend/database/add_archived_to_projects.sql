-- Add archived column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived TINYINT(1) DEFAULT 0;

-- Update existing projects to have default archived status (0 = not archived)
UPDATE projects SET archived = 0 WHERE archived IS NULL;

