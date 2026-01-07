# Production Troubleshooting Guide

## Common Issues and Solutions

### 1. Database Connection Failed: Access Denied

**Error:**
```
❌ Database connection failed: Access denied for user 'root'@'172.18.0.3' (using password: YES)
```

**Cause:**
The backend is trying to connect with incorrect database credentials. In Docker, the default database user is `tt_user`, not `root`. This usually happens when:
- `DB_USER=root` is set in a `.env` file or system environment
- The environment variables don't match between backend and database services

**Solution:**

1. **First, check what environment variables are actually set in the backend container:**
   ```bash
   docker exec time-tracking-backend env | grep DB_
   ```
   
   You should see:
   ```
   DB_HOST=db
   DB_USER=tt_user
   DB_PASSWORD=tt_password
   DB_NAME=time_tracking
   ```

2. **If you see `DB_USER=root`, you need to fix it. Check for `.env` files:**
   ```bash
   # In your project root
   cat .env | grep DB_USER
   
   # Or check if there's a .env file
   ls -la .env
   ```

3. **Remove or fix the `DB_USER=root` setting. Options:**
   
   **Option A: Remove DB_USER from .env (let docker-compose use default):**
   ```bash
   # Edit .env file and remove or comment out:
   # DB_USER=root
   ```
   
   **Option B: Set DB_USER to match docker-compose default:**
   ```env
   # In .env file or docker-compose.yml environment section
   DB_USER=tt_user
   DB_PASSWORD=tt_password
   MYSQL_USER=tt_user
   MYSQL_PASSWORD=tt_password
   ```

4. **Verify database credentials match:**
   ```bash
   # Check what user the database was created with
   docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -e "SELECT User, Host FROM mysql.user WHERE User='tt_user' OR User='root';"
   ```

5. **Restart the services:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

6. **Check the backend logs to verify the correct user is being used:**
   ```bash
   docker logs time-tracking-backend | grep "Database configuration"
   ```
   
   You should see:
   ```
   🔹 Database configuration:
     Host: db
     Database: time_tracking
     User: tt_user
     ...
   ```

### 2. CORS Error: Not Allowed by CORS

**Error:**
```
Error: Not allowed by CORS
```

**Cause:**
The frontend URL is not in the allowed CORS origins list. The backend needs to know your frontend domain.

**Solution:**

1. **Set the `FRONTEND_URL` environment variable:**
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```
   
   Or in docker-compose.yml:
   ```yaml
   backend:
     environment:
       FRONTEND_URL: "https://yourdomain.com"
   ```

2. **For multiple origins, use `CORS_ORIGINS`:**
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://localhost:4200
   ```

3. **Restart the backend service:**
   ```bash
   docker-compose restart backend
   ```

4. **Check the CORS configuration in logs:**
   ```bash
   docker logs time-tracking-backend | grep "CORS Configuration"
   ```

### 3. Verify Configuration

**Check Backend Configuration:**
```bash
# View backend logs
docker logs time-tracking-backend

# Check environment variables
docker exec time-tracking-backend env | grep -E "(DB_|FRONTEND_URL|CORS)"
```

**Check Database Configuration:**
```bash
# View database logs
docker logs time-tracking-db

# Test database connection from backend container
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
    console.log('✅ Database connection successful');
    conn.end();
  }
});
"
```

## Quick Fix Checklist

- [ ] Database credentials match between `DB_USER`/`DB_PASSWORD` and `MYSQL_USER`/`MYSQL_PASSWORD`
- [ ] `FRONTEND_URL` is set to your actual frontend domain (e.g., `https://yourdomain.com`)
- [ ] All services are running: `docker ps`
- [ ] Backend can reach database: `docker exec time-tracking-backend ping -c 1 db`
- [ ] Environment variables are loaded: Check logs for configuration output

## Example Production .env File

```env
# Frontend
API_BASE=/api
PRODUCTION=true

# Backend - Database
DB_HOST=db
DB_USER=tt_user
DB_PASSWORD=secure_password_123
DB_NAME=time_tracking
DB_PORT=3306

# Backend - CORS (REQUIRED for production)
FRONTEND_URL=https://yourdomain.com

# Backend - Security
JWT_SECRET=your_secure_jwt_secret_key_here

# Database - Must match DB_USER and DB_PASSWORD above
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_USER=tt_user
MYSQL_PASSWORD=secure_password_123
MYSQL_DATABASE=time_tracking
```

## Still Having Issues?

1. **Check all service logs:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify network connectivity:**
   ```bash
   docker network inspect time-tracking_app-network
   ```

3. **Test from within containers:**
   ```bash
   # Test backend to database
   docker exec time-tracking-backend ping db
   
   # Test database connection
   docker exec time-tracking-db mysql -u tt_user -p -e "SELECT 1"
   ```

