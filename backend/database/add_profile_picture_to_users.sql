-- Add profile_picture column to users table
-- This allows each user to have their own profile picture stored in the database

ALTER TABLE users 
ADD COLUMN profile_picture VARCHAR(500) NULL AFTER contact_number;

-- This column stores the path or URL to the user's profile picture
-- Each user can set their own profile picture, and it persists in the database
