/**
 * Format all existing sheets in Google Spreadsheet
 * Run: node format-all-sheets.js
 */

require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

async function formatAllSheets() {
  console.log('\n🎨 Formatting all sheets in Google Spreadsheet...\n');
  
  try {
    const spreadsheet = await googleSheetsService.sheets.spreadsheets.get({
      spreadsheetId: googleSheetsService.spreadsheetId
    });
    
    const sheets = spreadsheet.data.sheets;
    console.log(`Found ${sheets.length} sheets to format:\n`);
    
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      console.log(`📋 Formatting "${sheetName}"...`);
      
      // Get headers to determine column count
      try {
        const response = await googleSheetsService.sheets.spreadsheets.values.get({
          spreadsheetId: googleSheetsService.spreadsheetId,
          range: `${sheetName}!A1:Z1`
        });
        
        const headers = response.data.values && response.data.values[0];
        const columnCount = headers ? headers.length : 9; // Default to 9 columns
        
        await googleSheetsService.formatSheet(sheetName, columnCount);
        console.log(`   ✅ Formatted "${sheetName}"\n`);
      } catch (error) {
        console.log(`   ⚠️  Could not format "${sheetName}": ${error.message}\n`);
      }
    }
    
    console.log('✅ All sheets formatted!\n');
    console.log('📝 Check your Google Sheet to see the formatting:');
    console.log(`   https://docs.google.com/spreadsheets/d/${googleSheetsService.spreadsheetId}/edit\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

formatAllSheets();
