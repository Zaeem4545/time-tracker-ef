# Environment Configuration

This project supports two environments:
1. **Local Development** - Uses default values
2. **Production/Docker** - Uses environment variables

## Quick Start

### Local Development

**Frontend:**
```bash
ng serve
# Uses: http://localhost:3000
```

**Backend:**
```bash
cd backend
npm install
# Create .env file (optional - uses defaults)
cp .env.example .env
npm start
# Uses: localhost:3306 MySQL, port 3000
```

### Docker Production

```bash
# Option 1: Use defaults
docker-compose up -d --build

# Option 2: Use .env file
cp .env.example .env
# Edit .env with your values
docker-compose up -d --build

# Option 3: Override specific values
FRONTEND_URL=https://projects.expertflow.com docker-compose up -d --build
```

## Environment Variables

### Frontend (Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE` | `/api` | API base URL |
| `PRODUCTION` | `true` | Production mode flag |

### Backend (Docker)

| Variable | Default (Docker) | Default (Local) | Description |
|----------|------------------|-----------------|-------------|
| `PORT` | `3000` | `3000` | Server port |
| `NODE_ENV` | `production` | `development` | Node environment |
| `DB_HOST` | `db` | `localhost` | Database host |
| `DB_USER` | `tt_user` | `root` | Database user |
| `DB_PASSWORD` | `tt_password` | `` (empty) | Database password |
| `DB_NAME` | `time_tracking` | `time_tracking` | Database name |
| `DB_PORT` | `3306` | `3306` | Database port |
| `FRONTEND_URL` | - | - | Frontend URL for CORS (e.g., `https://projects.expertflow.com`) |
| `CORS_ORIGINS` | - | - | Comma-separated CORS origins (optional) |
| `JWT_SECRET` | `your-secret-key...` | `your-secret-key...` | JWT secret key |
| `MAX_FILE_SIZE` | `10mb` | `10mb` | Max upload file size |

### Database (Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | MySQL root password |
| `MYSQL_DATABASE` | `time_tracking` | Database name |
| `MYSQL_USER` | `tt_user` | Database user |
| `MYSQL_PASSWORD` | `tt_password` | Database password |

## Examples

### Example 1: Local Development

**Frontend:**
```bash
ng serve
# API calls go to: http://localhost:3000
```

**Backend:**
```bash
cd backend
# Create .env (optional)
echo "DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=time_tracking" > .env

npm start
# Server runs on: http://localhost:3000
# Connects to: localhost:3306
```

### Example 2: Docker with Custom FQDN

**docker-compose.yml:**
```yaml
services:
  frontend:
    environment:
      API_BASE: "/api"
      PRODUCTION: "true"
  
  backend:
    environment:
      FRONTEND_URL: "https://projects.expertflow.com"
      DB_PASSWORD: "secure_password"
      JWT_SECRET: "your-secure-jwt-secret"
```

### Example 3: Using .env File

**Create `.env` in project root:**
```env
# Frontend
API_BASE=/api
PRODUCTION=true

# Backend
FRONTEND_URL=https://projects.expertflow.com
DB_PASSWORD=secure_password
JWT_SECRET=your-secure-jwt-secret

# Database
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_PASSWORD=secure_password
```

**Run:**
```bash
docker-compose up -d --build
```

## Verification

**Check Frontend Config:**
```bash
docker exec time-tracking-frontend cat /usr/share/nginx/html/assets/config.json
```

**Check Backend Config:**
```bash
docker logs time-tracking-backend | grep "CORS Configuration"
docker logs time-tracking-backend | grep "Database configuration"
```

## Troubleshooting

### Backend can't connect to database
- Check `DB_HOST` matches database service name in docker-compose
- Verify database credentials match
- Ensure database container is running: `docker ps`

### CORS errors
- Set `FRONTEND_URL` environment variable
- Check backend logs for CORS configuration
- Verify frontend URL matches exactly (including protocol)

### Frontend can't reach backend
- Check `API_BASE` is correct
- Verify nginx proxy configuration
- Check backend is running: `docker logs time-tracking-backend`

