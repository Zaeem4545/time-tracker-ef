-- Add contact_number column to users table
-- Run this SQL script to update your database schema

ALTER TABLE users 
ADD COLUMN contact_number VARCHAR(20) NULL AFTER role;

-- This allows storing contact numbers for users (managers, employees, etc.)


