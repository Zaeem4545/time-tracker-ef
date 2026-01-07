# Fix: Database Access Denied for tt_user

## Problem
```
Access denied for user 'tt_user'@'172.18.0.3' (using password: YES)
```

This happens when:
1. The database volume was created with different credentials
2. The `tt_user` doesn't exist or has wrong password
3. `DB_PASSWORD` doesn't match `MYSQL_PASSWORD`
4. User doesn't have proper permissions

## Quick Fix (Recommended)

### Option 1: Run the Fix Script (Easiest)

```bash
# Run the fix script inside the backend container
docker exec time-tracking-backend node /app/scripts/fix-db-user.js
```

This script will:
- Check if `tt_user` exists
- Create the user if it doesn't exist
- Update the password to match your environment variables
- Grant all necessary permissions
- Test the connection

### Option 2: Reset Database Volume (If Option 1 doesn't work)

**⚠️ WARNING: This will delete all data!**

```bash
# Stop containers
docker-compose down

# Remove database volume
docker volume rm time-tracking_db_data

# Start fresh
docker-compose up -d --build
```

### Option 3: Manual Fix via MySQL

```bash
# Connect to database as root
docker exec -it time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword}

# Then run these SQL commands:
```

```sql
-- Check if user exists
SELECT User, Host FROM mysql.user WHERE User = 'tt_user';

-- If user doesn't exist, create it
CREATE USER 'tt_user'@'%' IDENTIFIED BY 'tt_password';

-- If user exists, update password
ALTER USER 'tt_user'@'%' IDENTIFIED BY 'tt_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Test (should return 1)
SELECT 1;
```

## Verify Credentials Match

Ensure these environment variables match:

```bash
# Check backend environment
docker exec time-tracking-backend env | grep -E "(DB_USER|DB_PASSWORD|MYSQL_)"

# Check database environment  
docker exec time-tracking-db env | grep -E "(MYSQL_USER|MYSQL_PASSWORD)"
```

They should show:
- `DB_USER=tt_user` (backend)
- `DB_PASSWORD=tt_password` (backend)
- `MYSQL_USER=tt_user` (database)
- `MYSQL_PASSWORD=tt_password` (database)

## If Using Custom Passwords

If you're using custom passwords, ensure they match:

**In your `.env` file or docker-compose.yml:**
```env
# These MUST match
DB_PASSWORD=your_custom_password
MYSQL_PASSWORD=your_custom_password
```

Then restart:
```bash
docker-compose down
docker-compose up -d --build
```

## Verify the Fix

After running the fix:

```bash
# 1. Check backend logs
docker logs time-tracking-backend | grep -E "(Database connected|connection failed)"

# 2. Test API
curl http://localhost:3000/api/test

# 3. Check database connection from backend
docker exec time-tracking-backend node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'tt_user',
  password: process.env.DB_PASSWORD || 'tt_password',
  database: process.env.DB_NAME || 'time_tracking'
});
conn.connect((err) => {
  if (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    conn.end();
  }
});
"
```

## Prevention

To prevent this in the future:

1. **Always match passwords**: Ensure `DB_PASSWORD` = `MYSQL_PASSWORD`
2. **Use environment variables**: Don't hardcode credentials
3. **Run fix script on first deploy**: Include it in your deployment process
4. **Document credentials**: Keep track of what passwords are used

## Automated Fix in docker-entrypoint.sh

You can add the fix script to run automatically on startup (optional):

```bash
# Add to backend/docker-entrypoint.sh before "Starting backend server"
echo "🔧 Fixing database user if needed..."
node /app/scripts/fix-db-user.js || echo "Fix script failed, continuing..."
```

## Still Having Issues?

1. **Check database logs:**
   ```bash
   docker logs time-tracking-db | tail -50
   ```

2. **Verify network connectivity:**
   ```bash
   docker exec time-tracking-backend ping -c 1 db
   ```

3. **Check if database is ready:**
   ```bash
   docker exec time-tracking-db mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword}
   ```

4. **View all database users:**
   ```bash
   docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -e "SELECT User, Host FROM mysql.user;"
   ```

