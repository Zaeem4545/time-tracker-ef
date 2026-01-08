// config/db.js
const mysql = require('mysql2');
const config = require('./config');

// Use configuration from config.js
const dbConfig = config.database;

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

// Warn if using root user in Docker
if (dbConfig.host === 'db' && dbConfig.user === 'root') {
  console.warn('⚠️  WARNING: Using root user in Docker environment!');
  console.warn('   This may fail if the database was created with a different user.');
  console.warn('   Consider setting DB_USER=tt_user to match docker-compose.yml defaults.');
}

const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
