# FQDN Configuration Guide

## Overview
Your application is now configured to work with the FQDN: **https://projects.expertflow.com/**

## Configuration Summary

### 1. Frontend Configuration
- **Production Environment** (`src/environments/environment.prod.ts`):
  - Uses relative path `/api` for API calls
  - This works seamlessly with the nginx reverse proxy

### 2. Backend Configuration
- **CORS Settings** (`backend/server.js`):
  - ✅ `https://projects.expertflow.com` (HTTPS)
  - ✅ `http://projects.expertflow.com` (HTTP fallback)
  - ✅ Regex pattern `/projects\.expertflow\.com/` for any subdomain variants
  - ✅ Direct IP access: `http://192.168.2.60:4200` (for testing)

### 3. Nginx Configuration
- **Server Name**: `projects.expertflow.com`
- **SSL**: Configured for HTTPS on port 443
- **HTTP Redirect**: Automatically redirects HTTP to HTTPS
- **API Proxy**: `/api/` requests are proxied to `backend:3000`
- **Frontend**: Serves Angular app from `/usr/share/nginx/html`

## Deployment Steps

### 1. DNS Configuration (IT Team)
Ensure DNS A record points to your server IP:
```
projects.expertflow.com → 192.168.2.60
```

### 2. SSL Certificates
Place SSL certificates in the nginx container:
- Certificate: `/etc/nginx/ssl/projects.expertflow.com.crt`
- Private Key: `/etc/nginx/ssl/projects.expertflow.com.key`

### 3. Build and Deploy
```bash
# Build production frontend
docker-compose build frontend

# Start all services
docker-compose up -d
```

### 4. Verify Deployment
- Frontend: https://projects.expertflow.com/
- API Test: https://projects.expertflow.com/api/test
- Backend Health: Check Docker logs

## Access Methods

### Production (FQDN)
- **URL**: https://projects.expertflow.com/
- **API**: https://projects.expertflow.com/api/*

### Direct IP (Testing)
- **URL**: http://192.168.2.60:4200/
- **API**: http://192.168.2.60:3000/api/*

## Troubleshooting

### CORS Errors
If you see CORS errors, verify:
1. Backend CORS includes the FQDN (already configured)
2. Nginx proxy headers are set correctly (already configured)
3. SSL certificates are valid

### API Not Working
1. Check nginx logs: `docker logs time-tracking-frontend`
2. Check backend logs: `docker logs time-tracking-backend`
3. Verify API proxy: `curl https://projects.expertflow.com/api/test`

### SSL Certificate Issues
1. Ensure certificates are mounted in nginx container
2. Check certificate paths in `nginx.conf`
3. Verify certificate validity and expiration

## Notes
- The frontend uses relative API paths (`/api`), so it works with any domain
- Backend CORS is configured to accept requests from the FQDN
- Nginx handles SSL termination and API proxying
- Direct IP access is still available for testing purposes

