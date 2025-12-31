// config/db.js
const mysql = require('mysql2');
require('dotenv').config(); // 🔹 Load .env variables




const resolvedHost = process.env.DB_HOST || 'db';
console.log('🔹 Database configuration - DB_HOST:', resolvedHost);
const pool = mysql.createPool({
  host: resolvedHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'time_tracking',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
