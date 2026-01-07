#!/bin/bash
# MySQL initialization script (shell version)
# This handles MySQL 5.7 compatibility and checks if user exists
# Runs automatically when MySQL container starts for the first time
# Also safe to run on existing databases (checks before creating)

set -e

ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpassword}"
DB_USER="${MYSQL_USER:-tt_user}"
DB_PASSWORD="${MYSQL_PASSWORD:-tt_password}"
DB_NAME="${MYSQL_DATABASE:-time_tracking}"

echo "🔧 Initializing MySQL user: $DB_USER"

mysql -u root -p"$ROOT_PASSWORD" <<EOF
-- Check if user exists
SET @user_exists = (SELECT COUNT(*) FROM mysql.user WHERE User = '$DB_USER' AND Host = '%');

-- Create user only if it doesn't exist
SET @sql = IF(@user_exists = 0,
    CONCAT('CREATE USER ''$DB_USER''@''%'' IDENTIFIED BY ''$DB_PASSWORD'';'),
    'SELECT CONCAT("User $DB_USER@% already exists, skipping creation") AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Always grant privileges (safe to run multiple times)
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '$DB_USER'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO '$DB_USER'@'%';

-- Apply privileges
FLUSH PRIVILEGES;

-- Verify user
SELECT User, Host FROM mysql.user WHERE User = '$DB_USER';
EOF

echo "✅ User initialization complete"
