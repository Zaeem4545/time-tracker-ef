/**
 * Test update and delete sync
 */

require('dotenv').config();
const googleSheetsService = require('./services/googleSheets.service');

async function testUpdateDelete() {
  console.log('\n🧪 Testing Update and Delete Sync...\n');
  
  // First, let's see what's in the sheet
  try {
    const response = await googleSheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetsService.spreadsheetId,
      range: 'Projects!A1:Z100'
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Projects sheet`);
    
    if (rows.length > 1) {
      const firstDataRow = rows[1];
      const projectId = firstDataRow[0];
      console.log(`\nTesting with project ID: ${projectId}`);
      
      // Test update
      console.log('\n1️⃣ Testing UPDATE...');
      const updateResult = await googleSheetsService.syncProject('update', {
        id: projectId,
        name: 'Updated Test Project',
        description: 'This is an updated description',
        customer_id: null,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'on-track',
        created_at: new Date().toISOString()
      });
      
      console.log(`Update result: ${updateResult ? '✅ Success' : '❌ Failed'}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test delete (only if update worked)
      if (updateResult) {
        console.log('\n2️⃣ Testing DELETE...');
        const deleteResult = await googleSheetsService.syncProject('delete', {
          id: projectId,
          name: 'Updated Test Project'
        });
        
        console.log(`Delete result: ${deleteResult ? '✅ Success' : '❌ Failed'}`);
      } else {
        console.log('\n⚠️  Skipping delete test (update failed)');
      }
    } else {
      console.log('⚠️  No data rows found to test with');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n✅ Test complete!\n');
}

testUpdateDelete().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
