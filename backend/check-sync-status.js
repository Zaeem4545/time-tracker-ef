/**
 * Check Google Sheets sync status
 * Run: node check-sync-status.js
 */

require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

async function checkStatus() {
  console.log('\n🔍 Checking Google Sheets Sync Status...\n');
  
  // Check configuration
  console.log('📋 Configuration:');
  console.log(`   GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID || '❌ NOT SET'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'NOT SET'}`);
  console.log(`   Service initialized: ${googleSheetsService.spreadsheetId ? '✅' : '❌'}`);
  
  if (!googleSheetsService.spreadsheetId) {
    console.log('\n❌ Google Sheets service not properly initialized!');
    console.log('   Check your .env file has GOOGLE_SHEET_ID set.');
    return;
  }
  
  // Test connection
  console.log('\n🧪 Testing Connection...');
  try {
    // Try to read the spreadsheet
    const spreadsheet = await googleSheetsService.sheets.spreadsheets.get({
      spreadsheetId: googleSheetsService.spreadsheetId
    });
    
    console.log('   ✅ Successfully connected to Google Sheet!');
    console.log(`   Sheet Title: ${spreadsheet.data.properties.title}`);
    console.log(`   Sheets: ${spreadsheet.data.sheets.map(s => s.properties.title).join(', ')}`);
    
    // Check if Projects sheet exists
    const projectsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Projects');
    if (projectsSheet) {
      console.log('\n   ✅ "Projects" sheet exists!');
      
      // Try to read data from Projects sheet
      try {
        const response = await googleSheetsService.sheets.spreadsheets.values.get({
          spreadsheetId: googleSheetsService.spreadsheetId,
          range: 'Projects!A1:Z100'
        });
        
        const rows = response.data.values || [];
        console.log(`   Rows in Projects sheet: ${rows.length}`);
        if (rows.length > 0) {
          console.log(`   Headers: ${rows[0].join(', ')}`);
          if (rows.length > 1) {
            console.log(`   Data rows: ${rows.length - 1}`);
          }
        }
      } catch (readError) {
        console.log(`   ⚠️  Could not read Projects sheet: ${readError.message}`);
      }
    } else {
      console.log('\n   ⚠️  "Projects" sheet does not exist yet.');
      console.log('   It will be created automatically when you create your first project.');
    }
    
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    
    if (error.message.includes('API has not been used') || error.message.includes('disabled')) {
      console.log('\n   🔧 ACTION REQUIRED:');
      console.log('   Enable Google Sheets API:');
      console.log('   https://console.developers.google.com/apis/api/sheets.googleapis.com/overview');
    } else if (error.message.includes('Permission denied') || error.code === 403) {
      console.log('\n   🔧 ACTION REQUIRED:');
      console.log('   Share your Google Sheet with:');
      console.log('   time-tracker@time-tracker-484311.iam.gserviceaccount.com');
      console.log('   Give it Editor permissions.');
    }
  }
  
  console.log('\n✅ Status check complete!\n');
}

checkStatus().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
