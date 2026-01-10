const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'tt_user',
  password: process.env.DB_PASSWORD || 'tt_password',
  database: process.env.DB_NAME || 'time_tracking',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
};

// Wait for database to be ready
async function waitForDatabase(maxRetries = 30, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connection = await mysql.createConnection(dbConfig);
      await connection.query('SELECT 1');
      await connection.end();
      return true;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  return false;
}

async function runMigrations() {
  let connection;
  
  try {
    console.log('🔄 Waiting for database to be ready...');
    await waitForDatabase();
    console.log('✅ Database is ready');
    
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Migration 1: Add allocated_time column if it doesn't exist
    console.log('📝 Checking allocated_time column...');
    const [allocatedTimeCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'allocated_time'
    `);
    
    if (allocatedTimeCheck[0].count === 0) {
      console.log('  → Adding allocated_time column...');
      try {
        await connection.query('ALTER TABLE projects ADD COLUMN allocated_time INT NULL;');
        console.log('  ✅ allocated_time column added');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('  ✓ allocated_time column already exists (duplicate detected)');
        } else {
          console.log('  ⚠️  Error adding allocated_time column:', err.message);
          // Don't throw - continue with other migrations
        }
      }
    } else {
      // Column exists, check if it needs to be modified to ensure it's INT NULL
      const [columnInfo] = await connection.query(`
        SELECT DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'projects'
          AND COLUMN_NAME = 'allocated_time'
      `);
      
      if (columnInfo.length > 0 && (columnInfo[0].DATA_TYPE !== 'int' || columnInfo[0].IS_NULLABLE !== 'YES')) {
        console.log('  → Modifying allocated_time column to INT NULL...');
        try {
          await connection.query('ALTER TABLE projects MODIFY COLUMN allocated_time INT NULL;');
          console.log('  ✅ allocated_time column modified');
        } catch (err) {
          console.log('  ⚠️  Error modifying allocated_time column:', err.message);
          // Don't throw - continue with other migrations
        }
      } else {
        console.log('  ✓ allocated_time column already exists with correct type (INT NULL)');
      }
    }

    // Migration 2: Add assigned_to column if it doesn't exist
    console.log('📝 Checking assigned_to column...');
    const [assignedToCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'assigned_to'
    `);
    
    if (assignedToCheck[0].count === 0) {
      console.log('  → Adding assigned_to column...');
      await connection.query(`
        ALTER TABLE projects 
        ADD COLUMN assigned_to INT NULL,
        ADD FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ assigned_to column and foreign key added');
    } else {
      console.log('  ✓ assigned_to column already exists');
      
      // Check if foreign key exists
      const [fkCheck] = await connection.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'projects'
          AND CONSTRAINT_NAME LIKE '%assigned_to%'
      `);
      
      if (fkCheck[0].count === 0) {
        console.log('  → Adding assigned_to foreign key...');
        try {
          await connection.query(`
            ALTER TABLE projects 
            ADD FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
          `);
          console.log('  ✅ assigned_to foreign key added');
        } catch (err) {
          if (err.code !== 'ER_DUP_KEY') {
            console.log('  ⚠️  Foreign key may already exist or error:', err.message);
          }
        }
      } else {
        console.log('  ✓ assigned_to foreign key already exists');
      }
    }

    // Migration 3: Add created_by column if it doesn't exist
    console.log('📝 Checking created_by column...');
    const [createdByCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'created_by'
    `);
    
    if (createdByCheck[0].count === 0) {
      console.log('  → Adding created_by column...');
      await connection.query('ALTER TABLE projects ADD COLUMN created_by INT NULL AFTER assigned_to;');
      console.log('  ✅ created_by column added');
    } else {
      console.log('  ✓ created_by column already exists');
    }

    // Migration 4: Add created_by foreign key if it doesn't exist
    console.log('📝 Checking created_by foreign key...');
    const [createdByFkCheck] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND CONSTRAINT_NAME = 'fk_projects_created_by'
    `);
    
    if (createdByFkCheck[0].count === 0) {
      console.log('  → Adding created_by foreign key...');
      try {
        await connection.query(`
          ALTER TABLE projects 
          ADD CONSTRAINT fk_projects_created_by 
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('  ✅ created_by foreign key added');
      } catch (err) {
        if (err.code !== 'ER_DUP_KEY') {
          console.log('  ⚠️  Foreign key error:', err.message);
        }
      }
    } else {
      console.log('  ✓ created_by foreign key already exists');
    }

    console.log('✅ All project migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

