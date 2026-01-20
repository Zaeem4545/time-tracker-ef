const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', 'create_project_followers_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: create_project_followers_table.sql');
        await db.query(sql);
        console.log('Migration completed successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
