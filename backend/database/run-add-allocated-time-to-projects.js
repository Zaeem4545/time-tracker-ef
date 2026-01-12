// Migration: Add allocated_time INT column to projects table if it doesn't exist
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'time_tracking',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('🔧 Checking if allocated_time column exists in projects table...');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'projects' 
      AND COLUMN_NAME = 'allocated_time'
    `, [process.env.DB_NAME || 'time_tracking']);

    if (columns.length > 0) {
      console.log('✅ Column allocated_time already exists in projects table. Skipping migration.');
    } else {
      console.log('📝 Adding allocated_time INT column to projects table...');
      
      await connection.query(`
        ALTER TABLE projects
        ADD COLUMN allocated_time INT NULL;
      `);
      
      console.log('✅ Successfully added allocated_time INT column to projects table!');
    }

  } catch (err) {
    // If error is about column already existing, that's fine
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Column allocated_time already exists. Migration skipped.');
    } else {
      console.error('❌ Error running migration:', err.message);
      // Don't exit with error code - allow container to continue
      console.log('⚠️  Continuing despite migration error...');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
