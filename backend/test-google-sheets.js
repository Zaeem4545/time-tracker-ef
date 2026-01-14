/**
 * Test script to verify Google Sheets integration
 * Run: node test-google-sheets.js
 */

require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

async function testGoogleSheets() {
  console.log('\n🔍 Testing Google Sheets Integration...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID || '❌ NOT SET'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'NOT SET'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_JSON: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'SET (hidden)' : 'NOT SET'}`);
  console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID || 'NOT SET'}`);
  console.log(`   GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? 'SET (hidden)' : 'NOT SET'}`);
  
  // Test service initialization
  console.log('\n🔧 Service Status:');
  if (googleSheetsService.spreadsheetId) {
    console.log(`   ✅ Sheet ID configured: ${googleSheetsService.spreadsheetId}`);
  } else {
    console.log('   ❌ Sheet ID NOT configured');
  }
  
  // Test a simple sync
  console.log('\n🧪 Testing Project Sync...');
  try {
    const testProject = {
      id: 999999,
      name: 'Test Project',
      description: 'This is a test project',
      customer_id: null,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'on-track'
    };
    
    console.log('   Attempting to sync test project...');
    const result = await googleSheetsService.syncProject('create', testProject);
    
    if (result) {
      console.log('   ✅ Test sync successful!');
      console.log('   📝 Check your Google Sheet - you should see a test project.');
    } else {
      console.log('   ❌ Test sync failed - check error messages above');
    }
  } catch (error) {
    console.error('   ❌ Error during test sync:', error.message);
    console.error('   Full error:', error);
  }
  
  console.log('\n✅ Test complete!\n');
}

testGoogleSheets().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
