-- Add attachment column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS attachment VARCHAR(500) NULL AFTER allocated_time;

