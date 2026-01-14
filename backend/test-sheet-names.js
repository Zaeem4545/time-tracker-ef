/**
 * Test sheet name matching
 */
require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

async function testSheetNames() {
  try {
    const spreadsheet = await googleSheetsService.sheets.spreadsheets.get({
      spreadsheetId: googleSheetsService.spreadsheetId
    });
    
    console.log('\n📋 All sheets in spreadsheet:');
    spreadsheet.data.sheets.forEach(s => {
      const title = s.properties.title;
      console.log(`  - "${title}"`);
      console.log(`    Sheet ID: ${s.properties.sheetId || 'NOT FOUND'}`);
      console.log(`    Properties:`, JSON.stringify(s.properties, null, 2));
      console.log(`    Full object keys:`, Object.keys(s));
    });
    
    const customersSheet = spreadsheet.data.sheets.find(s => {
      const title = s.properties.title.trim().toLowerCase();
      return title === 'customers';
    });
    
    console.log('\n🔍 Looking for "Customers":');
    if (customersSheet) {
      console.log(`  ✅ Found: "${customersSheet.properties.title}" (ID: ${customersSheet.properties.id})`);
    } else {
      console.log('  ❌ Not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSheetNames();
