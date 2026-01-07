# How to Create MySQL User in Container

This guide shows multiple ways to ensure the `tt_user` exists with proper credentials in the MySQL container.

## Method 1: Automatic Initialization (Recommended) ✅

MySQL automatically runs SQL scripts in `/docker-entrypoint-initdb.d/` on first startup.

### Setup

1. **The initialization script is already created**: `backend/database/init-user.sql`

2. **docker-compose.yml is configured** to mount this script:
   ```yaml
   volumes:
     - ./backend/database/init-user.sql:/docker-entrypoint-initdb.d/init-user.sql:ro
   ```

3. **On first startup**, MySQL will automatically:
   - Create the `tt_user@'%'` user
   - Set the password to `tt_password`
   - Grant all privileges on `time_tracking` database
   - Grant INFORMATION_SCHEMA access

### Usage

```bash
# If database volume doesn't exist (first time)
docker-compose up -d

# The script runs automatically on first startup
# Check logs to verify:
docker logs time-tracking-db | grep -i "init-user\|tt_user"
```

**Note**: This only runs on first startup. If the volume already exists, use Method 2 or 3.

## Method 2: Manual Creation via MySQL CLI

### Step 1: Connect to MySQL Container

```bash
docker exec -it time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword}
```

### Step 2: Run SQL Commands

```sql
-- Create user with wildcard host (allows Docker network access)
CREATE USER IF NOT EXISTS 'tt_user'@'%' IDENTIFIED BY 'tt_password';

-- Grant privileges on time_tracking database
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';

-- Grant INFORMATION_SCHEMA access (for metadata queries)
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify user was created
SELECT User, Host FROM mysql.user WHERE User = 'tt_user';

-- Test connection (should return 1)
SELECT 1;
```

### Step 3: Exit MySQL

```sql
EXIT;
```

## Method 3: One-Line Command

```bash
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} <<EOF
CREATE USER IF NOT EXISTS 'tt_user'@'%' IDENTIFIED BY 'tt_password';
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User = 'tt_user';
EOF
```

## Method 4: Using the Fix Script

The fix script automatically creates/updates the user:

```bash
# Run the fix script
docker exec time-tracking-backend node /app/scripts/fix-db-user.js
```

This script:
- Checks if user exists
- Creates user if it doesn't exist
- Updates password if it's wrong
- Grants all necessary privileges
- Verifies the connection

## Method 5: Reset Database (If Volume Already Exists)

If the database volume was created before the init script, reset it:

```bash
# ⚠️ WARNING: This deletes all data!
docker-compose down
docker volume rm time-tracking_db_data
docker-compose up -d --build
```

The init script will run automatically on the fresh database.

## Verify User Exists

### Check User in MySQL

```bash
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  -e "SELECT User, Host FROM mysql.user WHERE User = 'tt_user';"
```

Expected output:
```
+---------+------+
| User    | Host |
+---------+------+
| tt_user | %    |
+---------+------+
```

### Test Connection

```bash
docker exec time-tracking-db mysql -u tt_user -ptt_password \
  -e "SELECT 1 as test;"
```

Should return:
```
+------+
| test |
+------+
|    1 |
+------+
```

### Test from Backend Container

```bash
docker exec time-tracking-backend node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'db',
  user: 'tt_user',
  password: 'tt_password',
  database: 'time_tracking'
});
conn.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    conn.end();
  }
});
"
```

## Custom Credentials

If you're using custom credentials, update the init script:

**Edit `backend/database/init-user.sql`:**

```sql
-- Use environment variables (MySQL doesn't support this directly)
-- So you need to use the actual values or use a script

CREATE USER IF NOT EXISTS 'your_custom_user'@'%' IDENTIFIED BY 'your_custom_password';
GRANT ALL PRIVILEGES ON time_tracking.* TO 'your_custom_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'your_custom_user'@'%';
FLUSH PRIVILEGES;
```

Or use the fix script with environment variables:

```bash
# Set environment variables
export MYSQL_USER=your_custom_user
export MYSQL_PASSWORD=your_custom_password

# Run fix script
docker exec -e MYSQL_USER=$MYSQL_USER -e MYSQL_PASSWORD=$MYSQL_PASSWORD \
  time-tracking-backend node /app/scripts/fix-db-user.js
```

## Troubleshooting

### User Exists but Can't Connect

```bash
# Check user hosts
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  -e "SELECT User, Host FROM mysql.user WHERE User = 'tt_user';"

# If only 'localhost' exists, create '%' host:
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} <<EOF
CREATE USER IF NOT EXISTS 'tt_user'@'%' IDENTIFIED BY 'tt_password';
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
FLUSH PRIVILEGES;
EOF
```

### Wrong Password

```bash
# Update password
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} <<EOF
ALTER USER 'tt_user'@'%' IDENTIFIED BY 'tt_password';
FLUSH PRIVILEGES;
EOF
```

### User Doesn't Have Permissions

```bash
# Grant all privileges
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} <<EOF
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';
FLUSH PRIVILEGES;
EOF
```

## Best Practice

**Recommended approach:**
1. Use Method 1 (automatic initialization) for new deployments
2. Use Method 4 (fix script) for existing deployments
3. Use Method 2 (manual) for troubleshooting

The automatic initialization ensures the user is created correctly from the start, preventing access issues.

