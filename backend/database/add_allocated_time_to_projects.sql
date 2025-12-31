-- Add allocated_time column to projects table
-- Note: This will fail if the column already exists, which is fine
ALTER TABLE projects 
ADD COLUMN allocated_time VARCHAR(20) DEFAULT NULL COMMENT 'Time allocated for project in HH:MM:SS format';

