# Production Deployment Checklist

Use this checklist to ensure your production deployment is properly configured and secure.

## Pre-Deployment Checklist

### ✅ Environment Variables

- [ ] **Database Credentials**
  - [ ] `DB_USER` is set to `tt_user` (or matches `MYSQL_USER`)
  - [ ] `DB_PASSWORD` is set and matches `MYSQL_PASSWORD`
  - [ ] `DB_HOST` is set to `db` (Docker service name)
  - [ ] `DB_NAME` is set to `time_tracking` (or your custom name)
  - [ ] `MYSQL_USER` and `MYSQL_PASSWORD` match `DB_USER` and `DB_PASSWORD`

- [ ] **CORS Configuration**
  - [ ] `FRONTEND_URL` is set to your production frontend URL (e.g., `https://yourdomain.com`)
  - [ ] Or `CORS_ORIGINS` is set with comma-separated allowed origins
  - [ ] URL includes protocol (`https://` or `http://`)

- [ ] **Security**
  - [ ] `JWT_SECRET` is set to a strong, random string (NOT the default)
  - [ ] `MYSQL_ROOT_PASSWORD` is set to a strong password
  - [ ] All passwords are strong and unique

- [ ] **Optional Configuration**
  - [ ] `NODE_ENV` is set to `production`
  - [ ] `PORT` is set if you need a custom port (default: 3000)
  - [ ] `MAX_FILE_SIZE` is set if you need custom upload limits

### ✅ Docker Configuration

- [ ] `docker-compose.yml` is configured correctly
- [ ] All services have `restart: unless-stopped`
- [ ] Database volume is properly configured
- [ ] Network is properly configured

### ✅ Security Review

- [ ] No default passwords in production
- [ ] JWT secret is strong and unique
- [ ] Database user has minimal required permissions
- [ ] CORS is properly configured (not too permissive)
- [ ] `.env` file is not committed to version control
- [ ] Sensitive data is not logged

## Deployment Steps

1. **Create `.env` file** (if not using environment variables directly):
   ```env
   # Database
   DB_USER=tt_user
   DB_PASSWORD=your_secure_password_here
   MYSQL_USER=tt_user
   MYSQL_PASSWORD=your_secure_password_here
   MYSQL_ROOT_PASSWORD=your_secure_root_password_here
   
   # CORS (REQUIRED)
   FRONTEND_URL=https://yourdomain.com
   
   # Security (REQUIRED)
   JWT_SECRET=your_secure_jwt_secret_here
   
   # Optional
   NODE_ENV=production
   ```

2. **Build and start services**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Verify deployment**:
   ```bash
   # Check all services are running
   docker ps
   
   # Check backend logs
   docker logs time-tracking-backend
   
   # Check database connection
   docker logs time-tracking-backend | grep "Database connected"
   
   # Check CORS configuration
   docker logs time-tracking-backend | grep "CORS Configuration"
   ```

4. **Test the API**:
   ```bash
   # Test health endpoint
   curl http://localhost:3000/api/test
   
   # Test from frontend domain (should work)
   curl -H "Origin: https://yourdomain.com" http://localhost:3000/api/test
   ```

## Post-Deployment Verification

### ✅ Functionality Checks

- [ ] Backend server starts without errors
- [ ] Database connection is successful
- [ ] API endpoints are accessible
- [ ] CORS allows requests from frontend domain
- [ ] Authentication works correctly
- [ ] File uploads work (if applicable)

### ✅ Security Checks

- [ ] No warnings about default JWT_SECRET
- [ ] No warnings about default database password
- [ ] No warnings about missing FRONTEND_URL
- [ ] Database user is not 'root' in production
- [ ] CORS only allows intended origins

### ✅ Monitoring

- [ ] Set up log monitoring
- [ ] Set up database backup strategy
- [ ] Set up health check endpoints
- [ ] Monitor disk space for database volume
- [ ] Set up alerts for service failures

## Common Issues and Solutions

### Issue: Database Connection Failed

**Symptoms:**
- Error: `Access denied for user 'root'@'...'`
- Backend can't connect to database

**Solution:**
1. Verify `DB_USER` matches `MYSQL_USER`
2. Verify `DB_PASSWORD` matches `MYSQL_PASSWORD`
3. Check if database container is running: `docker ps`
4. Check database logs: `docker logs time-tracking-db`
5. Restart services: `docker-compose restart`

### Issue: CORS Errors

**Symptoms:**
- Frontend can't make API requests
- Error: `Not allowed by CORS`

**Solution:**
1. Set `FRONTEND_URL` environment variable to your frontend domain
2. Ensure URL includes protocol: `https://yourdomain.com`
3. Restart backend: `docker-compose restart backend`
4. Check logs: `docker logs time-tracking-backend | grep CORS`

### Issue: Using Default Secrets

**Symptoms:**
- Warnings in logs about default JWT_SECRET or passwords

**Solution:**
1. Generate strong secrets:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   
   # Generate database password
   openssl rand -base64 24
   ```
2. Update `.env` file with new secrets
3. Restart services: `docker-compose down && docker-compose up -d`

## Production Best Practices

1. **Use Environment Variables**: Never hardcode secrets in code
2. **Regular Backups**: Set up automated database backups
3. **Monitor Logs**: Regularly check application logs for errors
4. **Update Regularly**: Keep Docker images and dependencies updated
5. **Use HTTPS**: Always use HTTPS in production (configure reverse proxy)
6. **Limit Resources**: Set resource limits in docker-compose.yml
7. **Health Checks**: Use health check endpoints for monitoring
8. **Separate Environments**: Use different configurations for dev/staging/prod

## Quick Health Check Script

Run this to quickly verify your production deployment:

```bash
# Check services
echo "=== Services Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check backend health
echo -e "\n=== Backend Health ==="
curl -s http://localhost:3000/api/test | jq .

# Check database connection
echo -e "\n=== Database Connection ==="
docker logs time-tracking-backend 2>&1 | grep -E "(Database connected|Database connection failed)" | tail -1

# Check CORS config
echo -e "\n=== CORS Configuration ==="
docker logs time-tracking-backend 2>&1 | grep -A 2 "CORS Configuration" | tail -3

# Check for warnings
echo -e "\n=== Warnings ==="
docker logs time-tracking-backend 2>&1 | grep -i "warning" | tail -5
```

## Support

If you encounter issues:
1. Check `PRODUCTION_TROUBLESHOOTING.md` for detailed solutions
2. Review application logs: `docker logs time-tracking-backend`
3. Verify environment variables: `docker exec time-tracking-backend env | grep -E "(DB_|FRONTEND_URL|JWT_SECRET)"`
4. Run diagnostic script: `.\check-db-config.ps1` (Windows) or `./check-db-config.sh` (Linux)

