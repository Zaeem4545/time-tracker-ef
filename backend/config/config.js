// Backend Configuration
// Supports both local development and Docker production environments
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'time_tracking',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  },
  
  // CORS Configuration
  cors: {
    // Frontend URLs - can be set via environment variables
    allowedOrigins: (() => {
      // If CORS_ORIGINS is explicitly set, use it
      if (process.env.CORS_ORIGINS) {
        return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
      }
      
      // Default origins
      const origins = [
        'http://localhost:4200',
        'http://localhost',
        'http://host.docker.internal:4200',
        'http://host.docker.internal'
      ];
      
      // Add FQDN if provided
      if (process.env.FRONTEND_URL) {
        const fqdn = process.env.FRONTEND_URL.trim();
        origins.push(fqdn);
        // Also add HTTP version if HTTPS is provided
        if (fqdn.startsWith('https://')) {
          origins.push(fqdn.replace('https://', 'http://'));
        }
      }
      
      return origins;
    })(),
    // Add regex patterns for flexible matching
    regexPatterns: [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/host\.docker\.internal(:\d+)?$/,
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/
    ],
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

module.exports = config;

