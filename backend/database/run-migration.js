// Run database migration to update role column size
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'time_tracking',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
});

const sql = `
ALTER TABLE users 
MODIFY COLUMN role VARCHAR(20) NOT NULL;
`;

connection.query(sql, (err, results) => {
  if (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  } else {
    console.log('✅ Migration successful! Role column updated to VARCHAR(20)');
    console.log('Results:', results);
  }
  connection.end();
});

