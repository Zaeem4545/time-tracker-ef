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
