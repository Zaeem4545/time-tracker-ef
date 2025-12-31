const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runCreateHeadManagerProjects() {
  try {
    const sqlFile = path.join(__dirname, 'create_head_manager_projects.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL file not found:', sqlFile);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    await db.query(sql);
    console.log('✅ head_manager_projects table created (if not existed).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error running create_head_manager_projects.sql:', err);
    process.exit(1);
  }
}

runCreateHeadManagerProjects();
