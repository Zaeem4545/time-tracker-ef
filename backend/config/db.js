// config/db.js
const mysql = require('mysql2');
const config = require('./config');

// Use configuration from config.js
const dbConfig = config.database;

// Logging (more concise in production)
if (config.isProduction) {
  console.log('🔹 Database configuration:');
  console.log('  Host:', dbConfig.host);
  console.log('  Database:', dbConfig.database);
  console.log('  User:', dbConfig.user);
  console.log('  Port:', dbConfig.port);
} else {
  console.log('🔹 Database configuration:');
  console.log('  Host:', dbConfig.host);
  console.log('  Database:', dbConfig.database);
  console.log('  User:', dbConfig.user);
  console.log('  Port:', dbConfig.port);
  console.log('  Has Password:', !!dbConfig.password);
  console.log('  Environment Variables:');
  console.log('    DB_HOST:', process.env.DB_HOST || 'not set');
  console.log('    DB_USER:', process.env.DB_USER || 'not set (using default)');
  console.log('    DB_PASSWORD:', process.env.DB_PASSWORD ? '***set***' : 'not set (using default)');
  console.log('    DB_NAME:', process.env.DB_NAME || 'not set');
  console.log('    NODE_ENV:', process.env.NODE_ENV || 'not set');
}

// Warn if using root user in Docker
if (dbConfig.host === 'db' && dbConfig.user === 'root') {
  console.warn('⚠️  WARNING: Using root user in Docker environment!');
  console.warn('   This may fail if the database was created with a different user.');
  console.warn('   Consider setting DB_USER=tt_user to match docker-compose.yml defaults.');
}

// Log password status for debugging (without showing the password)
if (dbConfig.host === 'db') {
  const hasPassword = !!dbConfig.password;
  const passwordSource = process.env.DB_PASSWORD ? 'environment variable' : 'default';
  console.log(`  Password: ${hasPassword ? '***set***' : 'not set'} (${passwordSource})`);
  
  // Warn if password might not match
  if (!process.env.DB_PASSWORD && !process.env.MYSQL_PASSWORD) {
    console.warn('  ⚠️  Using default password. Ensure MYSQL_PASSWORD matches DB_PASSWORD.');
  }
}

const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('   Database connection was lost. Attempting to reconnect...');
  }
});

// Export both the promise pool and the underlying pool for graceful shutdown
const promisePool = pool.promise();
promisePool.pool = pool; // Attach underlying pool for shutdown

module.exports = promisePool;
