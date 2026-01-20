const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'create_project_followers_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon in case there are multiple statements, though here it's just one
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

        for (const statement of statements) {
            await db.query(statement);
        }

        console.log('Successfully created project_followers table');
        process.exit(0);
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

runMigration();
