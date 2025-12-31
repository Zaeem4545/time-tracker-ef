-- Update role column to accommodate "head manager" (11 characters)
-- Run this SQL script to update your database schema

ALTER TABLE users 
MODIFY COLUMN role VARCHAR(20) NOT NULL;

-- This will allow role values up to 20 characters, which is sufficient for:
-- - admin (5 chars)
-- - manager (7 chars)
-- - employee (8 chars)
-- - head manager (11 chars)

