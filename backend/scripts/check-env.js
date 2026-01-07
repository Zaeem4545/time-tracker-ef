#!/usr/bin/env node
// Quick script to check environment variables in the container
// Run: node scripts/check-env.js

console.log('=== Environment Variables Check ===\n');

const relevantVars = [
  'NODE_ENV',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_PORT',
  'FRONTEND_URL',
  'CORS_ORIGINS',
  'JWT_SECRET'
];

console.log('Relevant Environment Variables:');
relevantVars.forEach(varName => {
  const value = process.env[varName];
  if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
    console.log(`  ${varName}: ${value ? '***set***' : 'not set'}`);
  } else {
    console.log(`  ${varName}: ${value || 'not set'}`);
  }
});

console.log('\n=== Detection Logic ===');
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.DB_HOST === 'db' || isProduction;

console.log(`  NODE_ENV === 'production': ${isProduction}`);
console.log(`  DB_HOST === 'db': ${process.env.DB_HOST === 'db'}`);
console.log(`  Detected as Docker: ${isDocker}`);
console.log(`  Detected as Production: ${isProduction}`);

console.log('\n=== Expected Configuration ===');
if (isDocker) {
  const dbUser = process.env.DB_USER;
  if (dbUser === 'root') {
    console.log('  ⚠️  DB_USER=root detected - will be overridden to tt_user');
  } else {
    console.log(`  DB_USER: ${dbUser || 'tt_user (default)'}`);
  }
  console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***set***' : 'tt_password (default)'}`);
} else {
  console.log(`  DB_USER: ${process.env.DB_USER || 'root (default)'}`);
  console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***set***' : 'empty (default)'}`);
}

console.log('\n=== Recommendations ===');
if (isDocker && process.env.DB_USER === 'root') {
  console.log('  ❌ PROBLEM: DB_USER is set to root in Docker');
  console.log('     Solution: Remove DB_USER from .env file or set DB_USER=tt_user');
  console.log('     Or unset: unset DB_USER (will use default tt_user)');
}

if (isDocker && !process.env.DB_PASSWORD) {
  console.log('  ⚠️  DB_PASSWORD not set - will use default tt_password');
  console.log('     Consider setting a strong password for production');
}

if (isProduction && !process.env.FRONTEND_URL) {
  console.log('  ⚠️  FRONTEND_URL not set - CORS will be restrictive');
  console.log('     Set FRONTEND_URL to your production domain');
}

