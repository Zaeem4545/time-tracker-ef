# Environment Configuration Guide

This project supports two environments:
1. **Local Development** - Uses default values from configuration files
2. **Production/Docker** - Uses environment variables from Docker

## Frontend Configuration

### Local Development

For local development, simply run:
```bash
ng serve
```

The app will use default values from `src/environments/environment.ts`:
- API Base: `http://localhost:3000`
- Production: `false`

### Production/Docker Deployment

1. **Set environment variables** in `docker-compose.yml` or `.env`:
```yaml
environment:
  API_BASE: "/api"           # API base URL (default: /api)
  PRODUCTION: "true"          # Production mode (default: true)
```

2. **Build and run**:
```bash
docker-compose up -d --build
```

### Frontend Environment Variables

- `API_BASE`: API base URL (default: `/api`)
- `PRODUCTION`: Production mode flag (default: `true`)

## Backend Configuration

### Local Development

1. **Create `.env` file** in `backend/` directory:
```bash
cd backend
cp .env.example .env
# Edit .env with your local database credentials
```

2. **Run backend**:
```bash
npm install
npm start
# or
node server.js
```

The backend will use values from `.env` or defaults:
- Port: `3000`
- DB Host: `localhost`
- DB User: `root`
- DB Password: `` (empty)
- DB Name: `time_tracking`
- DB Port: `3306`

### Production/Docker Deployment

1. **Set environment variables** in `docker-compose.yml` or `.env`:
```yaml
environment:
  # Database
  DB_HOST: "db"
  DB_USER: "tt_user"
  DB_PASSWORD: "tt_password"
  DB_NAME: "time_tracking"
  DB_PORT: "3306"
  
  # Server
  PORT: "3000"
  NODE_ENV: "production"
  
  # CORS
  FRONTEND_URL: "https://projects.expertflow.com"
  
  # JWT (optional)
  JWT_SECRET: "your-secret-key"
```

2. **Build and run**:
```bash
docker-compose up -d --build
```

### Backend Environment Variables

**Database Configuration:**
- `DB_HOST`: Database host (default: `db` in Docker, `localhost` locally)
- `DB_USER`: Database user (default: `tt_user` in Docker, `root` locally)
- `DB_PASSWORD`: Database password (default: `tt_password` in Docker, empty locally)
- `DB_NAME`: Database name (default: `time_tracking`)
- `DB_PORT`: Database port (default: `3306`)

**Server Configuration:**
- `PORT`: Server port (default: `3000`)
- `NODE_ENV`: Node environment (default: `production` in Docker, `development` locally)

**CORS Configuration:**
- `FRONTEND_URL`: Frontend URL for CORS (e.g., `https://projects.expertflow.com`)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (optional, overrides defaults)

**Security:**
- `JWT_SECRET`: JWT secret key (default: `your-secret-key-change-in-production`)
- `JWT_EXPIRES_IN`: JWT expiration time (default: `24h`)

**File Upload:**
- `MAX_FILE_SIZE`: Maximum file size (default: `10mb`)
- `UPLOAD_DIR`: Upload directory (default: `./uploads`)

## Local Development

For local development, simply run:
```bash
ng serve
```

The app will use default values from `src/environments/environment.ts`:
- API Base: `http://localhost:3000`
- Production: `false`

## Production/Docker Deployment

### Using Docker Compose

1. **Create `.env` file** (optional - uses defaults if not provided):
```bash
cp .env.example .env
# Edit .env with your values
```

2. **Set environment variables** in `docker-compose.yml` or `.env`:
```yaml
environment:
  API_BASE: "/api"           # API base URL (default: /api)
  PRODUCTION: "true"          # Production mode (default: true)
```

3. **Build and run**:
```bash
docker-compose up -d --build
```

### Environment Variables

The following environment variables can be set for the frontend:

- `API_BASE`: API base URL (default: `/api`)
  - Example: `/api`, `https://api.example.com/api`, etc.
- `PRODUCTION`: Production mode flag (default: `true`)
  - Set to `true` for production, `false` for development

### How It Works

1. **Build Time**: Angular app is built with production configuration
2. **Runtime**: When the container starts, `docker-entrypoint-frontend.sh`:
   - Reads environment variables (`API_BASE`, `PRODUCTION`)
   - Generates `/usr/share/nginx/html/assets/config.json`
   - Starts nginx

3. **App Initialization**: Angular app:
   - Loads `config.json` via `APP_INITIALIZER`
   - Updates environment configuration at runtime
   - All services use the updated configuration

### Custom Configuration

To override default values, set environment variables:

```bash
# Using docker-compose
docker-compose up -d -e API_BASE=/custom/api

# Or in docker-compose.yml
environment:
  API_BASE: "/custom/api"
  PRODUCTION: "true"
```

### Verification

After deployment, check the generated config:
```bash
docker exec time-tracking-frontend cat /usr/share/nginx/html/assets/config.json
```

Expected output:
```json
{
  "apiBase": "/api",
  "production": true
}
```

