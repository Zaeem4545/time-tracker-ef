-- Add start_date and end_date columns to projects table
-- Run this SQL script to update your database schema

ALTER TABLE projects 
ADD COLUMN start_date DATE NULL AFTER description,
ADD COLUMN end_date DATE NULL AFTER start_date;

-- If the columns already exist, you can use this instead:
-- ALTER TABLE projects MODIFY COLUMN start_date DATE NULL;
-- ALTER TABLE projects MODIFY COLUMN end_date DATE NULL;

