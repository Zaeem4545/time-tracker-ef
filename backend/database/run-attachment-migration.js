const db = require('../config/db');

async function runMigration() {
  try {
    console.log('🔧 Checking if attachment column exists in projects table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'projects' 
        AND COLUMN_NAME = 'attachment'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Attachment column already exists in projects table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding attachment column to projects table...');
    
    // Add attachment column
    await db.query(`
      ALTER TABLE projects 
      ADD COLUMN attachment VARCHAR(500) NULL 
      AFTER allocated_time
    `);
    
    console.log('✅ Attachment column added to projects table successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

