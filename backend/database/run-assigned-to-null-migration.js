const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'time_tracking',
  port: process.env.DB_PORT || 3306
};

const connection = mysql.createConnection(dbConfig);

// First, drop the foreign key constraint if it exists
const dropForeignKeySql = `
SET @constraint_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tasks' 
    AND COLUMN_NAME = 'assigned_to' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql = IF(@constraint_name IS NOT NULL, 
  CONCAT('ALTER TABLE tasks DROP FOREIGN KEY ', @constraint_name), 
  'SELECT "No foreign key constraint found" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
`;

// Then modify the column to allow NULL
const alterColumnSql = `
ALTER TABLE tasks MODIFY COLUMN assigned_to INT NULL;
`;

// Step 1: Drop foreign key constraint if it exists
connection.query(dropForeignKeySql, (err, results) => {
  if (err) {
    console.log('⚠️  Warning: Could not drop foreign key (might not exist):', err.message);
  } else {
    console.log('✅ Foreign key constraint dropped (if it existed)');
  }
  
  // Step 2: Modify the column
  connection.query(alterColumnSql, (err, results) => {
    if (err) {
      console.error('❌ Error running migration:', err.message);
      console.error('\n💡 Tip: You can run this SQL directly in your MySQL client:');
      console.error('   Step 1: Find and drop the foreign key:');
      console.error('   SHOW CREATE TABLE tasks;');
      console.error('   (Look for FOREIGN KEY constraint on assigned_to)');
      console.error('   ALTER TABLE tasks DROP FOREIGN KEY <constraint_name>;');
      console.error('\n   Step 2: Modify the column:');
      console.error('   ALTER TABLE tasks MODIFY COLUMN assigned_to INT NULL;');
      process.exit(1);
    } else {
      console.log('✅ Migration successful! assigned_to column now allows NULL values');
      console.log('Results:', results);
    }
    connection.end();
  });
});

