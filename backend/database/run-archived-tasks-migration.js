const db = require('../config/db');

async function runMigration() {
  try {
    console.log('🔧 Checking if archived column exists in tasks table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'archived'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Archived column already exists in tasks table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding archived column to tasks table...');
    
    // Add archived column
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN archived TINYINT(1) DEFAULT 0
    `);
    
    // Update existing tasks to have default archived status
    await db.query(`
      UPDATE tasks 
      SET archived = 0 
      WHERE archived IS NULL
    `);
    
    console.log('✅ Migration completed: archived column added to tasks table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

