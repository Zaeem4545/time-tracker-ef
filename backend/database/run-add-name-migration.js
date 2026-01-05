const db = require('../config/db');

async function runMigration() {
  try {
    console.log('🔧 Checking if name column exists in users table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'name'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Name column already exists in users table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding name column to users table...');
    
    // Add name column
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''
    `);
    
    console.log('✅ Migration completed successfully: name column added to users table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

