#!/usr/bin/env node
/**
 * Script to fix database user permissions and password
 * This ensures tt_user exists with the correct password and permissions
 * 
 * Usage: node scripts/fix-db-user.js
 * Or from Docker: docker exec time-tracking-backend node /app/scripts/fix-db-user.js
 */

const mysql = require('mysql2/promise');

// Get configuration from environment
const rootPassword = process.env.MYSQL_ROOT_PASSWORD || 'rootpassword';
const dbHost = process.env.DB_HOST || 'db';
const dbUser = process.env.MYSQL_USER || 'tt_user';
const dbPassword = process.env.MYSQL_PASSWORD || 'tt_password';
const dbName = process.env.MYSQL_DATABASE || 'time_tracking';

async function fixDatabaseUser() {
  let rootConnection;
  
  try {
    console.log('🔧 Connecting to database as root...');
    rootConnection = await mysql.createConnection({
      host: dbHost,
      user: 'root',
      password: rootPassword,
      multipleStatements: true
    });
    
    console.log('✅ Connected as root');
    
    // Check if user exists
    console.log(`\n🔍 Checking if user '${dbUser}' exists...`);
    const [users] = await rootConnection.query(
      "SELECT User, Host FROM mysql.user WHERE User = ?",
      [dbUser]
    );
    
    if (users.length === 0) {
      console.log(`❌ User '${dbUser}' does not exist. Creating...`);
      
      // Create user
      await rootConnection.query(
        `CREATE USER ?@'%' IDENTIFIED BY ?`,
        [dbUser, dbPassword]
      );
      console.log(`✅ User '${dbUser}' created`);
    } else {
      console.log(`✅ User '${dbUser}' exists`);
      console.log(`   Hosts: ${users.map(u => u.Host).join(', ')}`);
      
      // Update password
      console.log(`\n🔧 Updating password for user '${dbUser}'...`);
      await rootConnection.query(
        `ALTER USER ?@'%' IDENTIFIED BY ?`,
        [dbUser, dbPassword]
      );
      console.log(`✅ Password updated`);
    }
    
    // Grant privileges
    console.log(`\n🔧 Granting privileges to '${dbUser}'...`);
    await rootConnection.query(
      `GRANT ALL PRIVILEGES ON ${dbName}.* TO ?@'%'`,
      [dbUser]
    );
    
    // Grant privileges on all databases for INFORMATION_SCHEMA access
    await rootConnection.query(
      `GRANT SELECT ON INFORMATION_SCHEMA.* TO ?@'%'`,
      [dbUser]
    );
    
    await rootConnection.query('FLUSH PRIVILEGES');
    console.log(`✅ Privileges granted`);
    
    // Test connection with new user
    console.log(`\n🧪 Testing connection as '${dbUser}'...`);
    const testConnection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName
    });
    
    await testConnection.query('SELECT 1');
    await testConnection.end();
    console.log(`✅ Connection test successful!`);
    
    console.log(`\n✅ Database user fixed successfully!`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${dbHost}`);
    
  } catch (error) {
    console.error('❌ Error fixing database user:', error.message);
    console.error('   Code:', error.code);
    console.error('   SQL State:', error.sqlState);
    process.exit(1);
  } finally {
    if (rootConnection) {
      await rootConnection.end();
    }
  }
}

// Run the fix
fixDatabaseUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

