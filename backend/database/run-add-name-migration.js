const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'time_tracking'
    });

    console.log('Connected to database');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'add_name_to_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute migration
    console.log('Running migration: add_name_to_users.sql');
    await connection.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runMigration();

