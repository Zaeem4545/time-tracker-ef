const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running attachment migration...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_attachment_to_projects.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await db.query(sql);
    
    console.log('✅ Attachment column added to projects table successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

