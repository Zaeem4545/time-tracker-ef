-- Add allocated_time column to tasks table
ALTER TABLE tasks 
ADD COLUMN allocated_time VARCHAR(20) DEFAULT NULL COMMENT 'Time allocated for task in HH:MM:SS format';

