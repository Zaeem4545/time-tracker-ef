-- Add region column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS region VARCHAR(255) NULL;

