const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'create_task_comments_table.sql'), 'utf8');
    await db.query(sql);
    console.log('✅ Migration completed: task_comments table created');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

