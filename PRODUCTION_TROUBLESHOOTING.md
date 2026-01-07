# Production Troubleshooting Guide

## Common Issues and Solutions

### 1. Database Connection Failed: Access Denied

**Error:**
```
❌ Database connection failed: Access denied for user 'root'@'172.18.0.3' (using password: YES)
```

**Cause:**
The backend is trying to connect with incorrect database credentials. In Docker, the default database user is `tt_user`, not `root`.

**Solution:**

Ensure your environment variables match the database configuration:

1. **Check your `.env` file or docker-compose.yml:**
   ```env
   # Database credentials must match
   DB_USER=tt_user
   DB_PASSWORD=tt_password
   MYSQL_USER=tt_user
   MYSQL_PASSWORD=tt_password
   ```

2. **Or if using custom credentials, ensure they match:**
   ```env
   DB_USER=your_custom_user
   DB_PASSWORD=your_custom_password
   MYSQL_USER=your_custom_user
   MYSQL_PASSWORD=your_custom_password
   ```

3. **Verify the backend service has the correct environment variables:**
   ```bash
   docker exec time-tracking-backend env | grep DB_
   ```

4. **Restart the services:**
   ```bash
   docker-compose down
   docker-compose up -d --build
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

