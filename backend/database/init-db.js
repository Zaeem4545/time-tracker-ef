// Initialize database with schema and create admin user
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'time_tracking',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
});

async function initDatabase() {
  return new Promise((resolve, reject) => {
    // Read and execute init.sql
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    
    connection.query(initSql, (err) => {
      if (err) {
        console.error('❌ Error creating tables:', err);
        reject(err);
      } else {
        console.log('✅ Database schema initialized');
        resolve();
      }
    });
  });
}

async function createAdminUser() {
  const email = 'zaeem.ahmad@expertflow.com';
  const password = '123';
  const adminRole = 'Admin';
  
  return new Promise((resolve, reject) => {
    // Hash password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('❌ Error hashing password:', err);
        reject(err);
        return;
      }

      // Check if admin already exists
      connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
          console.error('❌ Error checking for existing admin:', err);
          reject(err);
          return;
        }

        if (results.length > 0) {
          console.log('✅ Admin user already exists');
          resolve();
          return;
        }

        // Create admin user
        connection.query(
          'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)',
          [email, hash, adminRole, 'Administrator'],
          (err, result) => {
            if (err) {
              console.error('❌ Error creating admin user:', err);
              reject(err);
              return;
            }

            console.log('✅ Admin user created successfully');
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            console.log(`   Role: ${adminRole}`);
            resolve();
          }
        );
      });
    });
  });
}

async function main() {
  try {
    console.log('🔄 Initializing database...');
    await initDatabase();
    await createAdminUser();
    console.log('✅ Database initialization complete!');
    connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    connection.end();
    process.exit(1);
  }
}

main();
