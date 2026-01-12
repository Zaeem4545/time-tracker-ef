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

// Helper to check and add column
async function ensureColumn(connection, table, column, definition) {
  const [check] = await connection.query(`
    SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
  `, [table, column]);

  if (check[0].count === 0) {
    console.log(`  → Adding ${column} column to ${table}...`);
    try {
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`  ✅ ${column} column added`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') console.warn(`  ⚠️ Error adding ${column}: ${err.message}`);
    }
  } else {
    console.log(`  ✓ ${column} column already exists`);
  }
}

// Helper to check and add FK
async function ensureFK(connection, table, constraintName, definition) {
  const [check] = await connection.query(`
    SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
  `, [table, constraintName]);

  if (check[0].count === 0) {
    console.log(`  → Adding FK ${constraintName} to ${table}...`);
    try {
      await connection.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} ${definition}`);
      console.log(`  ✅ FK ${constraintName} added`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEY') console.warn(`  ⚠️ Error adding FK ${constraintName}: ${err.message}`);
    }
  } else {
    console.log(`  ✓ FK ${constraintName} already exists`);
  }
}

async function runMigrations() {
  let connection;
  try {
    console.log('🔄 [Self-Healing] Checking database schema...');
    await waitForDatabase(5, 2000); // Wait briefly
    
    connection = await mysql.createConnection(dbConfig);
    
    // 1. PROJECT Columns
    await ensureColumn(connection, 'projects', 'allocated_time', "VARCHAR(20) NULL COMMENT 'Time allocated in HH:MM:SS'");
    await ensureColumn(connection, 'projects', 'assigned_to', "INT NULL");
    await ensureColumn(connection, 'projects', 'created_by', "INT NULL");
    await ensureColumn(connection, 'projects', 'custom_fields', "TEXT NULL");
    await ensureColumn(connection, 'projects', 'customer_id', "INT NULL");
    await ensureColumn(connection, 'projects', 'archived', "TINYINT(1) DEFAULT 0");
    await ensureColumn(connection, 'projects', 'region', "VARCHAR(100) NULL");

    // Foreign Keys for Projects
    await ensureFK(connection, 'projects', 'fk_projects_assigned_to', "FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL");
    await ensureFK(connection, 'projects', 'fk_projects_created_by', "FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL");
    await ensureFK(connection, 'projects', 'fk_projects_customer_id', "FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL");

    console.log('✅ [Self-Healing] Database schema verified/repaired.');

  } catch (error) {
    console.error('❌ [Self-Healing] Migration error:', error.message);
    // Don't exit process, allow server to try starting anyway
  } finally {
    if (connection) await connection.end();
  }
}

// Export for server usage
module.exports = runMigrations;

// Auto-run if executed directly
if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
