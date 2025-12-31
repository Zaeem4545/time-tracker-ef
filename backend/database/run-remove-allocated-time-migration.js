const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // Read database config from db.js
    const dbConfig = require('../config/db');
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.config.host,
      user: dbConfig.config.user,
      password: dbConfig.config.password,
      database: dbConfig.config.database,
      multipleStatements: true
    });
    
    console.log('Connected to database');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'remove_allocated_time_from_projects.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await connection.query(sql);
    console.log('Migration completed successfully: Removed allocated_time column from projects table');
    
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

