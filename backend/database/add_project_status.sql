-- Add status column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'on-track';

-- Update existing projects to have default status
UPDATE projects SET status = 'on-track' WHERE status IS NULL;

