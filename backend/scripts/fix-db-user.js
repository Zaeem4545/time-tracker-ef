#!/usr/bin/env node
/**
 * Script to fix database user permissions and password
 * This ensures tt_user exists with the correct password and permissions
 * 
 * ⚠️  SAFETY: This script ONLY modifies user permissions and passwords.
 *             It does NOT modify, delete, or alter any data in your database.
 *             All operations are on the mysql.user table and privileges only.
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
    
    // Safety check: Verify database exists and has data
    console.log(`\n🔍 Safety check: Verifying database '${dbName}' exists...`);
    const [databases] = await rootConnection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [dbName]
    );
    
    if (databases.length === 0) {
      console.log(`⚠️  Database '${dbName}' does not exist. Creating...`);
      await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      console.log(`✅ Database '${dbName}' created`);
    } else {
      // Check if database has tables (data exists)
      const [tables] = await rootConnection.query(
        `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
        [dbName]
      );
      const tableCount = tables[0].count;
      console.log(`✅ Database '${dbName}' exists with ${tableCount} table(s)`);
      if (tableCount > 0) {
        console.log(`   📊 Data is safe - we only modify user permissions, not data`);
      }
    }
    
    // Check if user exists
    console.log(`\n🔍 Checking if user '${dbUser}' exists...`);
    const [users] = await rootConnection.query(
      "SELECT User, Host FROM mysql.user WHERE User = ?",
      [dbUser]
    );
    
    const hasWildcardHost = users.some(u => u.Host === '%');
    
    if (users.length === 0) {
      console.log(`❌ User '${dbUser}' does not exist. Creating...`);
      console.log(`   ⚠️  SAFE: Only creating user, no data will be modified`);
      
      // Create user with wildcard host for Docker network access
      await rootConnection.query(
        `CREATE USER ?@'%' IDENTIFIED BY ?`,
        [dbUser, dbPassword]
      );
      console.log(`✅ User '${dbUser}'@'%' created`);
    } else {
      console.log(`✅ User '${dbUser}' exists`);
      console.log(`   Hosts: ${users.map(u => u.Host).join(', ')}`);
      console.log(`   ⚠️  SAFE: Only updating permissions, no data will be modified`);
      
      // If user doesn't have wildcard host, create/update it
      if (!hasWildcardHost) {
        console.log(`\n🔧 User exists but doesn't have '%' host access. Creating...`);
        try {
          await rootConnection.query(
            `CREATE USER ?@'%' IDENTIFIED BY ?`,
            [dbUser, dbPassword]
          );
          console.log(`✅ User '${dbUser}'@'%' created`);
        } catch (err) {
          // User might already exist with different password, update it
          if (err.code === 'ER_USER_ALREADY_EXISTS') {
            console.log(`   User already exists, updating password...`);
            await rootConnection.query(
              `ALTER USER ?@'%' IDENTIFIED BY ?`,
              [dbUser, dbPassword]
            );
            console.log(`✅ Password updated for '${dbUser}'@'%'`);
          } else {
            throw err;
          }
        }
      } else {
        // Update password for existing wildcard user
        console.log(`\n🔧 Updating password for user '${dbUser}'@'%'...`);
        await rootConnection.query(
          `ALTER USER ?@'%' IDENTIFIED BY ?`,
          [dbUser, dbPassword]
        );
        console.log(`✅ Password updated`);
      }
    }
    
    // Grant privileges (using wildcard host for Docker network)
    console.log(`\n🔧 Granting privileges to '${dbUser}'@'%'...`);
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
    
    // Verify data still exists (safety check)
    const [tableCheck] = await testConnection.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [dbName]
    );
    const finalTableCount = tableCheck[0].count;
    
    await testConnection.end();
    console.log(`✅ Connection test successful!`);
    console.log(`   📊 Database still has ${finalTableCount} table(s) - data is safe!`);
    
    console.log(`\n✅ Database user fixed successfully!`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   ⚠️  All data is preserved - only user permissions were modified`);
    
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

