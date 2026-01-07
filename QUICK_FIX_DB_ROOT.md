# Quick Fix: Database Root User Issue

## Immediate Diagnosis

Run these commands to check what's happening in your container:

```bash
# 1. Check what DB_USER is actually set to in the container
docker exec time-tracking-backend env | grep DB_USER

# 2. Check all database-related environment variables
docker exec time-tracking-backend env | grep -E "^DB_"

# 3. Check if there's a .env file being loaded
docker exec time-tracking-backend ls -la /app/.env 2>/dev/null || echo "No .env file found"

# 4. Check the actual configuration being used
docker logs time-tracking-backend | grep -A 5 "Environment Detection"

# 5. Run the diagnostic script (if available)
docker exec time-tracking-backend node /app/scripts/check-env.js 2>/dev/null || echo "Script not found"
```

## Quick Fix Options

### Option 1: Remove DB_USER from environment (Recommended)

If `DB_USER=root` is set somewhere, remove it:

```bash
# Check your .env file (if exists in project root)
cat .env | grep DB_USER

# If it shows DB_USER=root, either:
# A) Remove the line
# B) Change it to: DB_USER=tt_user
# C) Comment it out: # DB_USER=root
```

Then restart:
```bash
docker-compose down
docker-compose up -d --build
```

### Option 2: Explicitly set DB_USER=tt_user

Add to your `.env` file or docker-compose.yml:

```env
DB_USER=tt_user
DB_PASSWORD=tt_password
```

Or in docker-compose.yml, ensure the backend service has:
```yaml
backend:
  environment:
    DB_USER: "${DB_USER:-tt_user}"  # This should already be there
```

### Option 3: Use the automatic override (Already implemented)

The code now automatically overrides `DB_USER=root` to `tt_user` in Docker environments. 

**Check if it's working:**
```bash
docker logs time-tracking-backend | grep -i "overriding\|final db user"
```

You should see:
```
⚠️  DB_USER=root detected in Docker. Overriding to tt_user for compatibility.
  Final DB User: tt_user
```

## Verify the Fix

After applying the fix, verify:

```bash
# 1. Check backend logs for successful connection
docker logs time-tracking-backend | grep -E "(Database connected|Database connection failed)"

# 2. Check the configuration being used
docker logs time-tracking-backend | grep "Final DB User"

# 3. Test the API
curl http://localhost:3000/api/test
```

## Expected Output

After the fix, you should see in logs:
```
🔹 Environment Detection:
  NODE_ENV: production
  DB_HOST: db
  DB_USER (env): root (or not set)
  Detected as Docker: true
  Final DB User: tt_user
  Final DB Host: db

✅ Database connected successfully
```

## If Still Not Working

1. **Check database container:**
   ```bash
   docker logs time-tracking-db | tail -20
   ```

2. **Verify database user exists:**
   ```bash
   docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -e "SELECT User, Host FROM mysql.user WHERE User='tt_user';"
   ```

3. **Check network connectivity:**
   ```bash
   docker exec time-tracking-backend ping -c 1 db
   ```

4. **Restart all services:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Root Cause

The issue occurs when:
- A `.env` file has `DB_USER=root`
- System environment variable `DB_USER=root` is set
- Docker environment variable `DB_USER=root` is explicitly set

The fix automatically detects and overrides this in Docker environments, but it's better to fix the source.

