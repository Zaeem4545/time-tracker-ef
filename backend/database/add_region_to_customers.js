const db = require('../config/db');

async function addRegionColumn() {
  try {
    console.log('🔧 Checking if region column exists in customers table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'customers' 
        AND COLUMN_NAME = 'region'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Region column already exists in customers table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding region column to customers table...');
    
    // Add region column
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN region VARCHAR(255) NULL
    `);
    
    console.log('✅ Migration completed: region column added to customers table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addRegionColumn();

