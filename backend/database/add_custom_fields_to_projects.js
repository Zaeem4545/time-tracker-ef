const db = require('../config/db');

async function addCustomFieldsColumn() {
  try {
    console.log('🔧 Checking if custom_fields column exists in projects table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'projects' 
        AND COLUMN_NAME = 'custom_fields'
    `);
    
    if (columns.length > 0) {
      console.log('✅ custom_fields column already exists in projects table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding custom_fields column to projects table...');
    
    // Add custom_fields column
    await db.query(`
      ALTER TABLE projects 
      ADD COLUMN custom_fields TEXT NULL
    `);
    
    console.log('✅ Migration completed: custom_fields column added to projects table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addCustomFieldsColumn();

