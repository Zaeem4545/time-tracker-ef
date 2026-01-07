# Database Safety & Data Protection

## ✅ Data Safety Guarantee

**All scripts and fixes are designed to be 100% data-safe:**

1. **User Permission Scripts**: Only modify MySQL user accounts and permissions
   - No data tables are modified
   - No data is deleted
   - No data is altered
   - Only `mysql.user` table and privileges are changed

2. **What Gets Modified**:
   - User creation/updates (if user doesn't exist or has wrong password)
   - Password updates (for authentication)
   - Privilege grants (for access permissions)
   - **Nothing else!**

3. **What Stays Safe**:
   - All your application data
   - All tables and records
   - All database structure
   - All relationships and constraints

## 🔒 Safety Features

### Automatic Safety Checks

The `fix-db-user.js` script includes:
- ✅ Database existence verification
- ✅ Table count verification (before and after)
- ✅ Connection testing without data modification
- ✅ Clear logging of what's being changed

### What the Script Does

```javascript
// 1. Connects as root (has permission to create users)
// 2. Checks if database exists (creates if needed, but empty)
// 3. Checks if user exists
// 4. Creates/updates user (ONLY user account, not data)
// 5. Grants privileges (ONLY permissions, not data)
// 6. Tests connection
// 7. Verifies table count (ensures data is still there)
```

## 📦 Backup Before Changes (Recommended)

While the scripts are safe, it's always good practice to backup:

### Option 1: Automatic Backup Script

```bash
# Run backup script
docker exec time-tracking-backend sh /app/scripts/backup-database.sh
```

### Option 2: Manual Backup

```bash
# Backup using mysqldump
docker exec time-tracking-db mysqldump -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  --single-transaction \
  --routines \
  --triggers \
  time_tracking > backup_$(date +%Y%m%d_%H%M%S).sql

# Or compress it
docker exec time-tracking-db mysqldump -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  --single-transaction time_tracking | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Option 3: Docker Volume Backup

```bash
# Backup the entire database volume
docker run --rm \
  -v time-tracking_db_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/db_volume_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

## 🔄 Restore from Backup

If you ever need to restore:

```bash
# Restore from SQL backup
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  time_tracking < backup_YYYYMMDD_HHMMSS.sql

# Or from compressed backup
gunzip < backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} time_tracking
```

## ⚠️ What Will NOT Cause Data Loss

These operations are **100% safe**:
- ✅ Running `fix-db-user.js` script
- ✅ Creating/updating database users
- ✅ Granting/revoking privileges
- ✅ Changing user passwords
- ✅ Restarting containers
- ✅ Running migrations (they only add/modify structure, not delete data)

## ❌ What COULD Cause Data Loss

These operations **WILL** cause data loss (avoid unless necessary):
- ❌ `docker volume rm time-tracking_db_data` (deletes entire database)
- ❌ `DROP DATABASE time_tracking` (deletes database)
- ❌ `TRUNCATE TABLE` or `DELETE FROM` commands
- ❌ `DROP TABLE` commands

## 🛡️ Protection Measures

### 1. Automatic Verification

The fix script verifies:
- Database exists before operations
- Table count before operations
- Table count after operations (ensures nothing was deleted)
- Connection works after changes

### 2. Transaction Safety

All operations use MySQL transactions where possible to ensure atomicity.

### 3. Read-Only Operations for Verification

The script only reads data to verify, never modifies application data.

## 📊 Verify Data Safety

After running any script, verify your data:

```bash
# Check table counts
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='time_tracking';"

# Check specific table
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  -e "SELECT COUNT(*) as count FROM time_tracking.users;"
```

## 🚨 If Something Goes Wrong

1. **Stop the containers immediately:**
   ```bash
   docker-compose stop
   ```

2. **Restore from backup** (see restore section above)

3. **Check logs:**
   ```bash
   docker logs time-tracking-backend
   docker logs time-tracking-db
   ```

4. **Verify data:**
   ```bash
   docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
     -e "SHOW TABLES FROM time_tracking;"
   ```

## ✅ Summary

- **User permission scripts are 100% data-safe**
- **Only user accounts and permissions are modified**
- **No application data is ever touched**
- **Automatic verification ensures data integrity**
- **Always backup before major changes (best practice)**

The `fix-db-user.js` script has been designed with data safety as the top priority. It will never modify, delete, or alter any of your application data.

