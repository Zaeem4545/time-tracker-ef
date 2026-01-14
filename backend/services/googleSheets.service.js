const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

/**
 * Format date to readable format for Google Sheets
 * Converts ISO dates to: YYYY-MM-DD HH:MM:SS
 */
function formatDateForSheet(dateValue) {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue; // Return as-is if invalid date
    
    // Format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return dateValue; // Return as-is if error
  }
}

/**
 * Format date only (without time) for Google Sheets
 * Converts to: YYYY-MM-DD
 */
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


class GoogleSheetsService {
  constructor() {
    let auth;
    
    // Priority 1: Service Account (Recommended for Production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
      // Load service account from file path (supports both relative and absolute paths)
      let serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      
      // If relative path, resolve from backend directory (parent of services directory)
      if (!path.isAbsolute(serviceAccountPath)) {
        const backendDir = path.resolve(__dirname, '..'); // Go up from services/ to backend/
        serviceAccountPath = path.resolve(backendDir, serviceAccountPath);
      }
      
      auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      console.log(`✅ Using Service Account authentication from: ${serviceAccountPath}`);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Load service account from JSON string in env variable
      try {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        console.log('✅ Using Service Account authentication (from JSON env)');
      } catch (error) {
        console.error('❌ Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', error.message);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
      }
    } else {
      // Priority 2: OAuth2 (Fallback for development)
      const baseUrl = process.env.BACKEND_URL || process.env.PRODUCTION_DOMAIN || 'http://localhost:3000';
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/auth/google/callback`;
      
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || '1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com',
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Set refresh token if available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.oauth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
      }

      auth = this.oauth2Client;
      console.log('✅ Using OAuth2 authentication');
    }

    this.auth = auth;
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Log configuration status
    if (this.spreadsheetId) {
      console.log(`✅ Google Sheets service initialized with Sheet ID: ${this.spreadsheetId}`);
    } else {
      console.warn('⚠️  Google Sheets service initialized but GOOGLE_SHEET_ID not configured');
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Set OAuth tokens after authorization
   */
  async setTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Log refresh token for user to save in .env
      if (tokens.refresh_token) {
        console.log('\n✅ Google Sheets API authorized successfully!');
        console.log('📝 IMPORTANT: Add this to your .env file:');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      } else {
        console.log('⚠️  No refresh token received. You may need to revoke access and re-authorize.');
      }
      
      return tokens;
    } catch (error) {
      console.error('Error setting tokens:', error);
      throw error;
    }
  }

  /**
   * Initialize sheet headers if they don't exist
   */
  async initializeSheet(sheetName, headers) {
    try {
      if (!headers || !Array.isArray(headers)) {
        throw new Error(`Headers must be an array. Received: ${typeof headers}`);
      }

      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        // Create new sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });
        
        // Refresh spreadsheet data after creating new sheet
        const updatedSpreadsheet = await this.sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId
        });
        
        // Add headers immediately after creating the sheet
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });
        
        console.log(`✅ Created sheet "${sheetName}" with headers`);
        
        // Apply formatting to the new sheet
        await this.formatSheet(sheetName, headers.length);
        
        return true;
      }

      // Sheet exists - check if headers exist
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:Z1`
      });

      const existingHeaders = response.data.values && response.data.values[0];
      
      if (!existingHeaders || existingHeaders.length === 0) {
        // Add headers if they don't exist
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });
        console.log(`✅ Added headers to existing sheet "${sheetName}"`);
        
        // Apply formatting after adding headers
        await this.formatSheet(sheetName, headers.length);
      } else {
        // Headers exist - apply formatting to ensure it's up to date
        await this.formatSheet(sheetName, headers.length);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error initializing sheet ${sheetName}:`, error.message);
      console.error('Full error:', error);
      return false;
    }
  }

  /**
   * Add a new row to the sheet
   */
  async addRow(sheetName, rowData) {
    try {
      if (!this.spreadsheetId) {
        console.warn('Google Sheet ID not configured');
        return false;
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      });

      console.log(`Added row to ${sheetName} sheet`);
      return true;
    } catch (error) {
      console.error(`Error adding row to ${sheetName}:`, error.message);
      return false;
    }
  }

  /**
   * Update a row in the sheet (by finding matching ID)
   */
  async updateRow(sheetName, idColumnIndex, idValue, rowData) {
    try {
      if (!this.spreadsheetId) {
        console.warn('Google Sheet ID not configured');
        return false;
      }

      // Get all rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return false;

      // Find the row with matching ID (handle both string and number comparisons)
      let rowIndex = -1;
      const idValueStr = String(idValue);
      const idValueNum = Number(idValue);
      
      for (let i = 1; i < rows.length; i++) {
        const cellValue = rows[i][idColumnIndex];
        // Compare as both string and number to handle type mismatches
        if (cellValue === idValueStr || 
            cellValue === idValue || 
            String(cellValue) === idValueStr ||
            Number(cellValue) === idValueNum) {
          rowIndex = i + 1; // +1 because sheets are 1-indexed
          console.log(`Found row ${rowIndex} with ID ${idValue} (cell value: ${cellValue})`);
          break;
        }
      }

      if (rowIndex === -1) {
        console.log(`❌ Row with ID ${idValue} not found in ${sheetName}`);
        console.log(`   Available IDs: ${rows.slice(1).map(r => r[idColumnIndex]).join(', ')}`);
        return false;
      }

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowData]
        }
      });

      console.log(`Updated row ${rowIndex} in ${sheetName} sheet`);
      return true;
    } catch (error) {
      console.error(`Error updating row in ${sheetName}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a row from the sheet (by finding matching ID)
   */
  async deleteRow(sheetName, idColumnIndex, idValue) {
    try {
      console.log(`🔍 deleteRow called: sheetName=${sheetName}, idColumnIndex=${idColumnIndex}, idValue=${idValue} (type: ${typeof idValue})`);
      
      if (!this.spreadsheetId) {
        console.warn('Google Sheet ID not configured');
        return false;
      }

      // Get spreadsheet info first (to get sheet ID)
      console.log(`🔧 Getting spreadsheet info to find sheet "${sheetName}"...`);
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      // Find the sheet by name (case-insensitive match, trim whitespace)
      const sheetNameNormalized = sheetName.trim().toLowerCase();
      const sheet = spreadsheet.data.sheets.find(s => {
        const titleNormalized = s.properties.title.trim().toLowerCase();
        return titleNormalized === sheetNameNormalized;
      });
      // Sheet ID is in properties.sheetId, not properties.id
      const sheetId = sheet ? (sheet.properties.sheetId || sheet.properties.id) : null;
      const actualSheetName = sheet ? sheet.properties.title : null;

      if (!sheetId) {
        console.error(`❌ Sheet "${sheetName}" not found in spreadsheet`);
        const availableSheets = spreadsheet.data.sheets.map(s => `"${s.properties.title}"`).join(', ');
        console.error(`   Available sheets: ${availableSheets}`);
        console.error(`   Looking for: "${sheetName}" (normalized: "${sheetNameNormalized}")`);
        // Try to find similar names
        const similarSheets = spreadsheet.data.sheets.filter(s => {
          const titleNormalized = s.properties.title.trim().toLowerCase();
          return titleNormalized.includes(sheetNameNormalized) || sheetNameNormalized.includes(titleNormalized);
        });
        if (similarSheets.length > 0) {
          console.error(`   Similar sheet names found: ${similarSheets.map(s => `"${s.properties.title}"`).join(', ')}`);
        }
        return false;
      }

      console.log(`✅ Found sheet "${actualSheetName}" with ID: ${sheetId}`);

      // Get all rows using the actual sheet name
      const sheetNameToUse = actualSheetName || sheetName;
      console.log(`📖 Reading rows from ${sheetNameToUse} sheet...`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetNameToUse}!A:Z`
      });

      const rows = response.data.values || [];
      console.log(`📊 Found ${rows.length} rows in ${sheetNameToUse} sheet`);
      
      if (rows.length === 0) {
        console.log(`⚠️  No rows found in ${sheetNameToUse} sheet`);
        return false;
      }

      // Show first few IDs for debugging
      if (rows.length > 1) {
        const firstFewIds = rows.slice(1, Math.min(6, rows.length)).map(r => r[idColumnIndex]);
        console.log(`🔢 First few IDs in sheet: ${firstFewIds.join(', ')}`);
      }

      // Find the row with matching ID (handle both string and number comparisons)
      let rowIndex = -1;
      const idValueStr = String(idValue);
      const idValueNum = Number(idValue);
      
      console.log(`🔎 Searching for ID: ${idValue} (as string: "${idValueStr}", as number: ${idValueNum})`);
      
      for (let i = 1; i < rows.length; i++) {
        const cellValue = rows[i][idColumnIndex];
        const cellValueStr = String(cellValue);
        const cellValueNum = Number(cellValue);
        
        // Compare as both string and number to handle type mismatches
        if (cellValue === idValueStr || 
            cellValue === idValue || 
            cellValueStr === idValueStr ||
            cellValueNum === idValueNum ||
            String(cellValue) === String(idValue) ||
            Number(cellValue) === Number(idValue)) {
          rowIndex = i + 1; // +1 because sheets are 1-indexed
          console.log(`✅ Found row ${rowIndex} with ID ${idValue} (cell value: ${cellValue}, type: ${typeof cellValue})`);
          break;
        }
      }

      if (rowIndex === -1) {
        console.log(`❌ Row with ID ${idValue} not found in ${sheetNameToUse}`);
        const allIds = rows.slice(1).map(r => r[idColumnIndex] || 'empty').join(', ');
        console.log(`   Available IDs (${rows.length - 1} rows): ${allIds}`);
        return false;
      }

      console.log(`🗑️  Deleting row ${rowIndex} (sheet index: ${rowIndex - 1}) from ${sheetName}...`);

      // Delete the row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }]
        }
      });

      console.log(`✅ Successfully deleted row ${rowIndex} from ${sheetName} sheet`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting row from ${sheetName}:`, error.message);
      console.error('Full error:', error);
      return false;
    }
  }

  /**
   * Sync Users table
   */
  async syncUser(action, userData) {
    try {
      console.log(`🔄 Syncing user ${userData?.id} (${action}) to Google Sheets...`);
      
      if (!this.spreadsheetId) {
        console.error('❌ Google Sheet ID not configured. Set GOOGLE_SHEET_ID in .env');
        return false;
      }

      if (!userData || !userData.id) {
        console.error('❌ Invalid user data provided for sync');
        return false;
      }

      const sheetName = 'Users';
      const headers = ['ID', 'Name', 'Email', 'Role', 'Created At', 'Updated At'];
      
      await this.initializeSheet(sheetName, headers);

      if (action === 'create') {
        const rowData = [
          userData.id,
          userData.name || '',
          userData.email || '',
          userData.role || '',
        formatDateForSheet(new Date()),
        formatDateForSheet(new Date())
        ];
        const result = await this.addRow(sheetName, rowData);
        if (result) {
          console.log(`✅ User ${userData.id} synced to Google Sheets successfully`);
        }
        return result;
      } else if (action === 'update') {
        const rowData = [
          userData.id,
          userData.name || '',
          userData.email || '',
          userData.role || '',
          formatDateForSheet(userData.created_at || ''),
          formatDateForSheet(new Date())
        ];
        const result = await this.updateRow(sheetName, 0, userData.id, rowData);
        if (result) {
          console.log(`✅ User ${userData.id} updated in Google Sheets successfully`);
        }
        return result;
      } else if (action === 'delete') {
        const result = await this.deleteRow(sheetName, 0, userData.id);
        if (result) {
          console.log(`✅ User ${userData.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to delete user ${userData.id} from Google Sheets`);
        }
        return result;
      }
    } catch (error) {
      console.error(`❌ Error syncing user to Google Sheets:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        action,
        userId: userData?.id
      });
      return false;
    }
  }

  /**
   * Sync Projects table
   */
  async syncProject(action, projectData) {
    try {
      console.log(`🔄 Syncing project ${projectData?.id} (${action}) to Google Sheets...`);
      
      if (!this.spreadsheetId) {
        console.error('❌ Google Sheet ID not configured. Set GOOGLE_SHEET_ID in .env');
        return false;
      }

      if (!projectData || !projectData.id) {
        console.error('❌ Invalid project data provided for sync');
        return false;
      }

      const sheetName = 'Projects';
      const headers = ['ID', 'Name', 'Description', 'Customer ID', 'Start Date', 'End Date', 'Status', 'Created At', 'Updated At'];
      
      await this.initializeSheet(sheetName, headers);

      if (action === 'create') {
        const rowData = [
          projectData.id,
          projectData.name || '',
          projectData.description || '',
          projectData.customer_id || '',
          formatDateOnlyForSheet(projectData.start_date),
          formatDateOnlyForSheet(projectData.end_date),
          projectData.status || '',
          formatDateForSheet(projectData.created_at || new Date()),
          formatDateForSheet(new Date())
        ];
        const result = await this.addRow(sheetName, rowData);
        if (result) {
          console.log(`✅ Project ${projectData.id} synced to Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to sync project ${projectData.id} to Google Sheets`);
        }
        return result;
      } else if (action === 'update') {
        const rowData = [
          projectData.id,
          projectData.name || '',
          projectData.description || '',
          projectData.customer_id || '',
          formatDateOnlyForSheet(projectData.start_date),
          formatDateOnlyForSheet(projectData.end_date),
          projectData.status || '',
          formatDateForSheet(projectData.created_at || ''),
          formatDateForSheet(new Date())
        ];
        const result = await this.updateRow(sheetName, 0, projectData.id, rowData);
        if (result) {
          console.log(`✅ Project ${projectData.id} updated in Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to update project ${projectData.id} in Google Sheets`);
        }
        return result;
      } else if (action === 'delete') {
        const result = await this.deleteRow(sheetName, 0, projectData.id);
        if (result) {
          console.log(`✅ Project ${projectData.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to delete project ${projectData.id} from Google Sheets`);
        }
        return result;
      }
    } catch (error) {
      console.error(`❌ Error syncing project to Google Sheets:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        action,
        projectId: projectData?.id
      });
      return false;
    }
  }

  /**
   * Sync Tasks table
   */
  async syncTask(action, taskData) {
    try {
      console.log(`🔄 Syncing task ${taskData?.id} (${action}) to Google Sheets...`);
      
      if (!this.spreadsheetId) {
        console.error('❌ Google Sheet ID not configured. Set GOOGLE_SHEET_ID in .env');
        return false;
      }

      if (!taskData || !taskData.id) {
        console.error('❌ Invalid task data provided for sync');
        return false;
      }

      const sheetName = 'Tasks';
      const headers = ['ID', 'Title', 'Description', 'Project ID', 'Assigned To', 'Status', 'Priority', 'Due Date', 'Created At', 'Updated At'];
      
      await this.initializeSheet(sheetName, headers);

      if (action === 'create') {
        const rowData = [
          taskData.id,
          taskData.title || '',
          taskData.description || '',
          taskData.project_id || '',
          taskData.assigned_to || '',
          taskData.status || '',
          taskData.priority || '',
          formatDateOnlyForSheet(taskData.due_date),
          formatDateForSheet(taskData.created_at || new Date()),
          formatDateForSheet(new Date())
        ];
        const result = await this.addRow(sheetName, rowData);
        if (result) {
          console.log(`✅ Task ${taskData.id} synced to Google Sheets successfully`);
        }
        return result;
      } else if (action === 'update') {
        const rowData = [
          taskData.id,
          taskData.title || '',
          taskData.description || '',
          taskData.project_id || '',
          taskData.assigned_to || '',
          taskData.status || '',
          taskData.priority || '',
          formatDateOnlyForSheet(taskData.due_date),
          formatDateForSheet(taskData.created_at || ''),
          formatDateForSheet(new Date())
        ];
        const result = await this.updateRow(sheetName, 0, taskData.id, rowData);
        if (result) {
          console.log(`✅ Task ${taskData.id} updated in Google Sheets successfully`);
        }
        return result;
      } else if (action === 'delete') {
        const result = await this.deleteRow(sheetName, 0, taskData.id);
        if (result) {
          console.log(`✅ Task ${taskData.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to delete task ${taskData.id} from Google Sheets`);
        }
        return result;
      }
    } catch (error) {
      console.error(`❌ Error syncing task to Google Sheets:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        action,
        taskId: taskData?.id
      });
      return false;
    }
  }

  /**
   * Sync Customers table
   */
  async syncCustomer(action, customerData) {
    try {
      console.log(`🔄 Syncing customer ${customerData?.id} (${action}) to Google Sheets...`);
      
      if (!this.spreadsheetId) {
        console.error('❌ Google Sheet ID not configured. Set GOOGLE_SHEET_ID in .env');
        return false;
      }

      if (!customerData || !customerData.id) {
        console.error('❌ Invalid customer data provided for sync');
        return false;
      }

      const sheetName = 'Customers';
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Region', 'Notes', 'Created At', 'Updated At'];
      
      await this.initializeSheet(sheetName, headers);

      if (action === 'create') {
        const rowData = [
          customerData.id,
          customerData.name || '',
          customerData.email || '',
          customerData.phone || '',
          customerData.region || '',
          customerData.notes || '',
          formatDateForSheet(customerData.created_at || new Date()),
          formatDateForSheet(new Date())
        ];
        const result = await this.addRow(sheetName, rowData);
        if (result) {
          console.log(`✅ Customer ${customerData.id} synced to Google Sheets successfully`);
        }
        return result;
      } else if (action === 'update') {
        const rowData = [
          customerData.id,
          customerData.name || '',
          customerData.email || '',
          customerData.phone || '',
          customerData.region || '',
          customerData.notes || '',
          formatDateForSheet(customerData.created_at || ''),
          formatDateForSheet(new Date())
        ];
        const result = await this.updateRow(sheetName, 0, customerData.id, rowData);
        if (result) {
          console.log(`✅ Customer ${customerData.id} updated in Google Sheets successfully`);
        }
        return result;
      } else if (action === 'delete') {
        const result = await this.deleteRow(sheetName, 0, customerData.id);
        if (result) {
          console.log(`✅ Customer ${customerData.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to delete customer ${customerData.id} from Google Sheets`);
        }
        return result;
      }
    } catch (error) {
      console.error(`❌ Error syncing customer to Google Sheets:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        action,
        customerId: customerData?.id
      });
      return false;
    }
  }

  /**
   * Sync Time Entries table
   */
  async syncTimeEntry(action, timeEntryData) {
    try {
      console.log(`🔄 Syncing time entry ${timeEntryData?.id} (${action}) to Google Sheets...`);
      
      if (!this.spreadsheetId) {
        console.error('❌ Google Sheet ID not configured. Set GOOGLE_SHEET_ID in .env');
        return false;
      }

      if (!timeEntryData || !timeEntryData.id) {
        console.error('❌ Invalid time entry data provided for sync');
        return false;
      }

      const sheetName = 'Time Entries';
      const headers = ['ID', 'User ID', 'Project ID', 'Task ID', 'Date', 'Hours', 'Description', 'Created At', 'Updated At'];
      
      await this.initializeSheet(sheetName, headers);

      if (action === 'create') {
        const rowData = [
          timeEntryData.id,
          timeEntryData.user_id || '',
          timeEntryData.project_id || '',
          timeEntryData.task_id || '',
          formatDateOnlyForSheet(timeEntryData.date),
          timeEntryData.hours || '',
          timeEntryData.description || '',
          formatDateForSheet(timeEntryData.created_at || new Date()),
          formatDateForSheet(new Date())
        ];
        const result = await this.addRow(sheetName, rowData);
        if (result) {
          console.log(`✅ Time entry ${timeEntryData.id} synced to Google Sheets successfully`);
        }
        return result;
      } else if (action === 'update') {
        const rowData = [
          timeEntryData.id,
          timeEntryData.user_id || '',
          timeEntryData.project_id || '',
          timeEntryData.task_id || '',
          formatDateOnlyForSheet(timeEntryData.date),
          timeEntryData.hours || '',
          timeEntryData.description || '',
          formatDateForSheet(timeEntryData.created_at || ''),
          formatDateForSheet(new Date())
        ];
        const result = await this.updateRow(sheetName, 0, timeEntryData.id, rowData);
        if (result) {
          console.log(`✅ Time entry ${timeEntryData.id} updated in Google Sheets successfully`);
        }
        return result;
      } else if (action === 'delete') {
        const result = await this.deleteRow(sheetName, 0, timeEntryData.id);
        if (result) {
          console.log(`✅ Time entry ${timeEntryData.id} deleted from Google Sheets successfully`);
        } else {
          console.error(`❌ Failed to delete time entry ${timeEntryData.id} from Google Sheets`);
        }
        return result;
      }
    } catch (error) {
      console.error(`❌ Error syncing time entry to Google Sheets:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        action,
        timeEntryId: timeEntryData?.id
      });
      return false;
    }
  }

  /**
   * Format a sheet with headers, colors, borders, and column widths
   */
  async formatSheet(sheetName, columnCount) {
    try {
      // Get spreadsheet to find sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheet = spreadsheet.data.sheets.find(
        s => s.properties.title.trim().toLowerCase() === sheetName.trim().toLowerCase()
      );
      
      if (!sheet) {
        console.log(`⚠️  Sheet "${sheetName}" not found for formatting`);
        return false;
      }

      // Sheet ID is in properties.sheetId (not properties.id)
      const sheetId = sheet.properties.sheetId;
      if (sheetId === undefined || sheetId === null) {
        console.log(`⚠️  Could not get sheet ID for "${sheetName}" (sheetId: ${sheetId})`);
        console.log(`   Sheet properties:`, JSON.stringify(sheet.properties, null, 2));
        return false;
      }

      // Prepare formatting requests
      const requests = [];

      // 1. Format header row (row 1): Bold, blue background, white text, center align
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: columnCount
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.2,
                green: 0.4,
                blue: 0.8
              },
              textFormat: {
                foregroundColor: {
                  red: 1.0,
                  green: 1.0,
                  blue: 1.0
                },
                fontSize: 11,
                bold: true
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      });

      // 2. Add borders to header row
      requests.push({
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: columnCount
          },
          top: {
            style: 'SOLID',
            width: 2,
            color: { red: 0.0, green: 0.0, blue: 0.0 }
          },
          bottom: {
            style: 'SOLID',
            width: 2,
            color: { red: 0.0, green: 0.0, blue: 0.0 }
          },
          left: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.0, green: 0.0, blue: 0.0 }
          },
          right: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.0, green: 0.0, blue: 0.0 }
          }
        }
      });

      // 3. Freeze header row
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });

      // 4. Set column widths (auto-fit style - set reasonable widths)
      const columnWidths = [];
      for (let i = 0; i < columnCount; i++) {
        // Set different widths based on column index
        let width = 120; // Default width
        if (i === 0) width = 80; // ID column - smaller
        else if (i === 1) width = 200; // Name/Title column - wider
        else if (i === 2) width = 300; // Description column - widest
        else if (i >= columnCount - 2) width = 180; // Date columns - medium
        
        columnWidths.push({
          updateDimensionProperties: {
            range: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: i,
              endIndex: i + 1
            },
            properties: {
              pixelSize: width
            },
            fields: 'pixelSize'
          }
        });
      }
      requests.push(...columnWidths);

      // 5. Format data rows: Add light background to all data rows
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: columnCount
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.95,
                green: 0.95,
                blue: 0.95
              },
              textFormat: {
                foregroundColor: {
                  red: 0.0,
                  green: 0.0,
                  blue: 0.0
                },
                fontSize: 10
              }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });

      // 6. Add borders to all data cells
      requests.push({
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: columnCount
          },
          innerHorizontal: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          innerVertical: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          left: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          },
          right: {
            style: 'SOLID',
            width: 1,
            color: { red: 0.8, green: 0.8, blue: 0.8 }
          }
        }
      });

      // 7. Center align ID column (first column)
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: 1,
            endRowIndex: 1000,
            startColumnIndex: 0,
            endColumnIndex: 1
          },
          cell: {
            userEnteredFormat: {
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat.horizontalAlignment'
        }
      });

      // 8. Format date columns (find columns with "Date", "Created", "Updated" in header)
      // Get headers to identify date columns
      try {
        const headerResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:Z1`
        });
        
        const headers = headerResponse.data.values && headerResponse.data.values[0];
        if (headers) {
          headers.forEach((header, index) => {
            const headerLower = String(header).toLowerCase();
            // Check if this is a date column
            if (headerLower.includes('date') || headerLower.includes('created') || headerLower.includes('updated')) {
              // Format as date/time
              requests.push({
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: 1,
                    endRowIndex: 1000,
                    startColumnIndex: index,
                    endColumnIndex: index + 1
                  },
                  cell: {
                    userEnteredFormat: {
                      numberFormat: {
                        type: 'DATE_TIME',
                        pattern: 'yyyy-mm-dd hh:mm:ss'
                      }
                    }
                  },
                  fields: 'userEnteredFormat.numberFormat'
                }
              });
            }
          });
        }
      } catch (error) {
        console.log(`⚠️  Could not format date columns: ${error.message}`);
      }

      // Apply all formatting requests
      if (requests.length > 0) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: requests
          }
        });
        console.log(`✅ Applied formatting to "${sheetName}" sheet`);
      }

      return true;
    } catch (error) {
      console.error(`⚠️  Error formatting sheet ${sheetName}:`, error.message);
      // Don't fail if formatting fails - it's not critical
      return false;
    }
  }
}

module.exports = new GoogleSheetsService();
