const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'time_tracking',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'profile_picture'
    `);
    
    if (columns.length > 0) {
      console.log('ℹ️  Column profile_picture already exists - skipping migration');
      process.exit(0);
      return;
    }

    // Read SQL file
    const sqlFile = path.join(__dirname, 'add_profile_picture_to_users.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Running migration: add_profile_picture_to_users.sql');
    
    // Execute migration
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   Profile picture column added to users table');
    console.log('   Each user can now have their own profile picture stored in the database');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Column profile_picture already exists - skipping migration');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

runMigration();
