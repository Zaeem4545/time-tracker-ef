const db = require('../config/db');

async function runMigration() {
  try {
    console.log('🔧 Checking if allocated_time column exists in projects table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'projects' 
        AND COLUMN_NAME = 'allocated_time'
    `);
    
    if (columns.length === 0) {
      console.log('✅ allocated_time column does not exist in projects table (already removed)');
      process.exit(0);
      return;
    }
    
    console.log('📝 Removing allocated_time column from projects table...');
    
    // Remove allocated_time column
    await db.query(`
      ALTER TABLE projects 
      DROP COLUMN allocated_time
    `);
    
    console.log('✅ Migration completed successfully: Removed allocated_time column from projects table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

