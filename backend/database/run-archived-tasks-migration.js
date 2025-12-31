const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'add_archived_to_tasks.sql'), 'utf8');
    await db.query(sql);
    console.log('✅ Migration completed: archived column added to tasks table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

