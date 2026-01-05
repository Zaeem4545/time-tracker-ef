const db = require('../config/db');

async function addCustomerIdColumn() {
  try {
    console.log('🔧 Checking if customer_id column exists in projects table...');
    
    // Check if column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'projects' 
        AND COLUMN_NAME = 'customer_id'
    `);
    
    if (columns.length > 0) {
      console.log('✅ customer_id column already exists in projects table');
      process.exit(0);
      return;
    }
    
    console.log('📝 Adding customer_id column to projects table...');
    
    // Add customer_id column
    await db.query(`
      ALTER TABLE projects 
      ADD COLUMN customer_id INT NULL,
      ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Migration completed: customer_id column added to projects table');
    process.exit(0);
  } catch (error) {
    // If foreign key constraint fails, try adding column without foreign key first
    if (error.code === 'ER_CANNOT_ADD_FOREIGN' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      try {
        console.log('⚠️  Foreign key constraint failed, adding column without foreign key...');
        await db.query(`
          ALTER TABLE projects 
          ADD COLUMN customer_id INT NULL
        `);
        console.log('✅ Migration completed: customer_id column added to projects table (without foreign key)');
        process.exit(0);
      } catch (innerError) {
        console.error('❌ Migration failed:', innerError);
        process.exit(1);
      }
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

addCustomerIdColumn();

