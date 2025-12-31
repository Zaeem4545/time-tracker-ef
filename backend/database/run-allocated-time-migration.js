const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'time_tracking',
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_allocated_time_to_projects.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute migration (will fail silently if column already exists)
    try {
      await connection.query(sql);
      console.log('Migration completed successfully: Added allocated_time column to projects table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('Column allocated_time already exists, skipping migration');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();

