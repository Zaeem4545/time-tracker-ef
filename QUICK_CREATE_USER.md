# Quick Guide: Create MySQL User in Container

## 🚀 Quick Method (Recommended)

### For New Database (First Time)

The user will be created automatically! Just start the containers:

```bash
docker-compose up -d
```

The initialization scripts run automatically on first startup.

### For Existing Database (User Missing)

**Option 1: Run the fix script (Easiest)**
```bash
docker exec time-tracking-backend node /app/scripts/fix-db-user.js
```

**Option 2: Manual SQL (One command)**
```bash
docker exec -i time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} <<EOF
CREATE USER IF NOT EXISTS 'tt_user'@'%' IDENTIFIED BY 'tt_password';
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';
FLUSH PRIVILEGES;
EOF
```

**Note**: MySQL 5.7 doesn't support `IF NOT EXISTS` for `CREATE USER`, so if user exists, you'll get an error (safe to ignore) or use the shell script version.

**Option 3: Interactive MySQL**
```bash
# Connect
docker exec -it time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword}

# Then run:
CREATE USER 'tt_user'@'%' IDENTIFIED BY 'tt_password';
GRANT ALL PRIVILEGES ON time_tracking.* TO 'tt_user'@'%';
GRANT SELECT ON INFORMATION_SCHEMA.* TO 'tt_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

## ✅ Verify User Created

```bash
# Check user exists
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} \
  -e "SELECT User, Host FROM mysql.user WHERE User = 'tt_user';"

# Test connection
docker exec time-tracking-db mysql -u tt_user -ptt_password \
  -e "SELECT 1 as test;"
```

## 🔧 What Gets Created

- **User**: `tt_user@'%'` (allows connections from any IP, including Docker network)
- **Password**: `tt_password`
- **Privileges**: 
  - Full access to `time_tracking` database
  - Read access to `INFORMATION_SCHEMA` (for metadata queries)

## 📝 Files Created

1. **`backend/database/init-user.sql`** - SQL script (runs on first startup)
2. **`backend/database/init-user.sh`** - Shell script (handles existing users)
3. **`docker-compose.yml`** - Configured to mount these scripts

## 🎯 Summary

- **New database**: User created automatically ✅
- **Existing database**: Run fix script or manual SQL ✅
- **Data safe**: Only creates user, never touches your data ✅

See `CREATE_MYSQL_USER.md` for detailed documentation.

