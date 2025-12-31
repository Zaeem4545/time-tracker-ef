-- Add custom_fields column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields TEXT;

