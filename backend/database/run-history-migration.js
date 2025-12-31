const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'time_tracking',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    const sqlFile = path.join(__dirname, 'create_project_task_history_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Running migration: create_project_task_history_tables.sql');
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Created project_history and task_history tables');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

runMigration();

