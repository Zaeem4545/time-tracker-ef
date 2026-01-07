-- MySQL initialization script
-- This script runs automatically when MySQL container starts for the first time
-- It creates the tt_user with proper permissions
-- Note: This runs on FIRST startup only (when database volume is empty)

-- Create user for Docker network access (using % allows connections from any IP)
-- On first startup, user won't exist, so this will succeed
CREATE USER 'tt_user'@'%' IDENTIFIED BY 'tt_password';

-- Grant all privileges on the time_tracking database
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';

-- Grant SELECT on INFORMATION_SCHEMA for metadata queries (used by customer.model.js)
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';

-- Apply privileges
FLUSH PRIVILEGES;

-- Verify user was created
SELECT User, Host FROM mysql.user WHERE User = 'tt_user';

