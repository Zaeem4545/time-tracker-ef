const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  try {
    console.log('Creating customers table...');
    
    const sqlFile = path.join(__dirname, 'create_customers_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await db.query(sql);
    
    console.log('✅ Customers table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();

