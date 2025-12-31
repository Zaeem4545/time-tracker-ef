const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'add_region_to_projects.sql'), 'utf8');
    await db.query(sql);
    console.log('Migration completed: region column added to projects table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

