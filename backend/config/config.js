// Backend Configuration
// Supports both local development and Docker production environments
// Load .env file if it exists (but Docker environment variables take precedence)
const dotenvResult = require('dotenv').config();

// Log if .env file was loaded (for debugging)
if (dotenvResult.error && dotenvResult.error.code !== 'ENOENT') {
  console.warn('⚠️  Warning loading .env file:', dotenvResult.error.message);
} else if (!dotenvResult.error && dotenvResult.parsed) {
  console.log('📄 .env file loaded');
  // Check if .env has problematic values
  if (dotenvResult.parsed.DB_USER === 'root') {
    console.warn('⚠️  WARNING: .env file contains DB_USER=root');
    console.warn('   This will be overridden in Docker environments.');
  }
}

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.DB_HOST === 'db' || isProduction;

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isDocker,
  
  // Database Configuration
  database: (() => {
    // Determine database user
    let dbUser;
    const envDbUser = process.env.DB_USER;
    
    if (isDocker) {
      // In Docker, prefer tt_user unless explicitly overridden
      // If DB_USER is 'root', override it to tt_user (common misconfiguration)
      if (envDbUser === 'root') {
        console.warn('⚠️  DB_USER=root detected in Docker. Overriding to tt_user for compatibility.');
        console.warn('   If you need to use root, ensure the database allows root access from Docker network.');
        dbUser = 'tt_user';
      } else if (envDbUser !== undefined && envDbUser !== '') {
        dbUser = envDbUser;
      } else {
        dbUser = 'tt_user'; // Default for Docker
      }
    } else {
      // Local development
      dbUser = (envDbUser !== undefined && envDbUser !== '') ? envDbUser : 'root';
    }
    
    // Determine database password
    let dbPassword;
    const envDbPassword = process.env.DB_PASSWORD;
    
    if (isDocker) {
      // In Docker, if using tt_user and password not set, use default
      if (dbUser === 'tt_user' && (envDbPassword === undefined || envDbPassword === '')) {
        dbPassword = 'tt_password';
      } else {
        dbPassword = envDbPassword || '';
      }
    } else {
      // Local development
      dbPassword = envDbPassword || '';
    }
    
    return {
      host: process.env.DB_HOST || 'localhost',
      user: dbUser,
      password: dbPassword,
      database: process.env.DB_NAME || 'time_tracking',
      port: parseInt(process.env.DB_PORT || '3306', 10)
    };
  })(),
  
  // CORS Configuration
  cors: {
    // Frontend URLs - can be set via environment variables
    allowedOrigins: (() => {
      // If CORS_ORIGINS is explicitly set, use it
      if (process.env.CORS_ORIGINS) {
        return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
      }
      
      // Default origins (only include localhost in development)
      const origins = [];
      
      if (!isProduction) {
        origins.push(
          'http://localhost:4200',
          'http://localhost',
          'http://host.docker.internal:4200',
          'http://host.docker.internal'
        );
      }
      
      // Add FQDN if provided (required in production)
      if (process.env.FRONTEND_URL) {
        const fqdn = process.env.FRONTEND_URL.trim();
        origins.push(fqdn);
        // Also add HTTP version if HTTPS is provided (for development/testing)
        if (fqdn.startsWith('https://') && !isProduction) {
          origins.push(fqdn.replace('https://', 'http://'));
        }
      }
      
      return origins;
    })(),
    // Add regex patterns for flexible matching
    regexPatterns: (() => {
      const patterns = [];
      
      // Only allow localhost patterns in development
      if (!isProduction) {
        patterns.push(
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/host\.docker\.internal(:\d+)?$/
        );
      }
      
      // Allow private IPs (for internal networks)
      patterns.push(/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/);
      patterns.push(/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/);
      patterns.push(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/);
      
      return patterns;
    })(),
    fqdn: process.env.FRONTEND_URL || null
  },
  
  // File Upload Configuration
  uploads: {
    maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  },
  
  // JWT Configuration (if using JWT)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};

// Add FQDN regex pattern if provided
if (config.cors.fqdn) {
  const fqdnDomain = config.cors.fqdn.replace(/^https?:\/\//, '').replace(/\/$/, '');
  config.cors.regexPatterns.push(new RegExp(`^https?://${fqdnDomain.replace(/\./g, '\\.')}(/.*)?$`));
}

// Log configuration for debugging
console.log('🔹 Environment Detection:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  DB_HOST:', process.env.DB_HOST || 'not set');
console.log('  DB_USER (env):', process.env.DB_USER || 'not set');
console.log('  DB_PASSWORD (env):', process.env.DB_PASSWORD ? '***set***' : 'not set');
console.log('  Detected as Docker:', isDocker);
console.log('  Detected as Production:', isProduction);
console.log('  Final DB User:', config.database.user);
console.log('  Final DB Host:', config.database.host);

// Production validation and warnings
if (isProduction) {
  // Warn if FRONTEND_URL is not set
  if (!process.env.FRONTEND_URL && !process.env.CORS_ORIGINS) {
    console.warn('⚠️  WARNING: FRONTEND_URL is not set in production!');
    console.warn('   CORS will be very restrictive. Set FRONTEND_URL environment variable.');
  }
  
  // Warn if using default JWT secret
  if (config.jwt.secret === 'your-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET in production!');
    console.warn('   This is a security risk. Set JWT_SECRET environment variable to a secure random string.');
  }
  
  // Warn if using default database password
  if (isDocker && config.database.password === 'tt_password' && !process.env.DB_PASSWORD) {
    console.warn('⚠️  WARNING: Using default database password in production!');
    console.warn('   Consider setting a strong DB_PASSWORD environment variable.');
  }
  
  // Critical warning if still using root in Docker
  if (isDocker && config.database.user === 'root') {
    console.error('❌ CRITICAL: Using root user in Docker production environment!');
    console.error('   This will likely fail. The database was created with tt_user.');
    console.error('   Solution: Remove DB_USER=root from your environment or set DB_USER=tt_user');
  }
}

module.exports = config;

