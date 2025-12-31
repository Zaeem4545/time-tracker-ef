-- Add custom_fields column to customers table if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields TEXT;

