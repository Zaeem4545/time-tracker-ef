# Troubleshooting Google Sheets Sync

## ✅ Connection Test Shows Everything Works!

The diagnostic shows:
- ✅ Service account authentication working
- ✅ Google Sheet connection successful
- ✅ Projects sheet exists
- ✅ Can read/write to sheet

## If Projects Aren't Syncing Locally:

### Step 1: Check Backend is Running

Make sure your backend server is running:
```bash
cd backend
npm start
```

You should see:
```
✅ Using Service Account authentication from: ...
✅ Google Sheets service initialized with Sheet ID: ...
Server running on port 3000
```

### Step 2: Check Backend Console Logs

When you create a project, you should see in your backend console:
```
🔄 Attempting to sync project X to Google Sheets...
🔄 Syncing project X (create) to Google Sheets...
✅ Project X synced to Google Sheets successfully
```

If you see errors instead, check:
- Is the Google Sheets API enabled?
- Is the sheet shared with the service account?

### Step 3: Verify Sheet Sharing

Make sure your Google Sheet is shared with:
- Email: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
- Permission: **Editor**

### Step 4: Check for Errors

If you see errors like:
- `API has not been used` → Enable Google Sheets API
- `Permission denied` → Share sheet with service account
- `File not found` → Check service account JSON file path

### Step 5: Test Manually

Run the test script:
```bash
cd backend
node test-google-sheets.js
```

This will create a test project and show you exactly what's happening.

## Common Issues:

1. **Backend not running** → Start it with `npm start`
2. **API not enabled** → Enable in Google Cloud Console
3. **Sheet not shared** → Share with service account email
4. **Wrong service account** → Make sure you're using the new one
5. **Silent errors** → Check backend console logs

## Quick Check:

Run this to see current status:
```bash
cd backend
node check-sync-status.js
```

This will tell you exactly what's working and what's not!
