const db = require('../config/db');

async function addTotalTimeColumn() {
  try {
    const dbName = process.env.DB_NAME || 'time_tracking';
    const [rows] = await db.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'time_entries' AND COLUMN_NAME = 'total_time'`,
      [dbName]
    );

    const exists = rows[0].cnt > 0;
    if (exists) {
      console.log('✅ Column `total_time` already exists on `time_entries`. Nothing to do.');
      process.exit(0);
    }

    console.log('Adding `total_time` column to `time_entries` table...');
    await db.query("ALTER TABLE time_entries ADD COLUMN total_time INT DEFAULT 0;");
    console.log('✅ `total_time` column added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding `total_time` column:', err);
    process.exit(1);
  }
}

addTotalTimeColumn();
