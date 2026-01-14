/**
 * Update existing date formats in Google Sheets
 * Run: node update-existing-dates.js
 */

require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

function formatDateForSheet(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return dateValue;
  }
}

function formatDateOnlyForSheet(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return dateValue;
  }
}

async function updateExistingDates() {
  console.log('\n📅 Updating date formats in Google Sheets...\n');
  
  try {
    const spreadsheet = await googleSheetsService.sheets.spreadsheets.get({
      spreadsheetId: googleSheetsService.spreadsheetId
    });
    
    const sheets = ['Users', 'Projects', 'Tasks', 'Customers', 'Time Entries'];
    
    for (const sheetName of sheets) {
      const sheet = spreadsheet.data.sheets.find(
        s => s.properties.title.trim().toLowerCase() === sheetName.toLowerCase()
      );
      
      if (!sheet) {
        console.log(`⚠️  Sheet "${sheetName}" not found, skipping...`);
        continue;
      }
      
      console.log(`📋 Processing "${sheetName}"...`);
      
      // Get all data
      const response = await googleSheetsService.sheets.spreadsheets.values.get({
        spreadsheetId: googleSheetsService.spreadsheetId,
        range: `${sheetName}!A:Z`
      });
      
      const rows = response.data.values || [];
      if (rows.length < 2) {
        console.log(`   No data rows to update\n`);
        continue;
      }
      
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      // Find date column indices
      const dateColumns = [];
      headers.forEach((header, index) => {
        const headerLower = String(header).toLowerCase();
        if (headerLower.includes('date') || headerLower.includes('created') || headerLower.includes('updated')) {
          dateColumns.push({ index, header, isDateOnly: headerLower.includes('start') || headerLower.includes('end') || headerLower.includes('due') });
        }
      });
      
      if (dateColumns.length === 0) {
        console.log(`   No date columns found\n`);
        continue;
      }
      
      console.log(`   Found ${dateColumns.length} date column(s): ${dateColumns.map(c => c.header).join(', ')}`);
      
      // Update each row
      const updates = [];
      dataRows.forEach((row, rowIndex) => {
        dateColumns.forEach(col => {
          const cellValue = row[col.index];
          if (cellValue) {
            // Check if it's already formatted (doesn't contain 'T' or 'Z')
            if (cellValue.includes('T') || cellValue.includes('Z')) {
              const formatted = col.isDateOnly 
                ? formatDateOnlyForSheet(cellValue)
                : formatDateForSheet(cellValue);
              
              if (formatted !== cellValue) {
                updates.push({
                  range: `${sheetName}!${String.fromCharCode(65 + col.index)}${rowIndex + 2}`,
                  values: [[formatted]]
                });
              }
            }
          }
        });
      });
      
      if (updates.length > 0) {
        // Batch update (Google Sheets API allows up to 100 updates per batch)
        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          await googleSheetsService.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: googleSheetsService.spreadsheetId,
            resource: {
              valueInputOption: 'RAW',
              data: batch
            }
          });
        }
        console.log(`   ✅ Updated ${updates.length} date cell(s)\n`);
      } else {
        console.log(`   ✅ All dates already formatted\n`);
      }
    }
    
    console.log('✅ Date format update complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateExistingDates();
