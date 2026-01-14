# ✅ New Service Account Updated!

## Your New Service Account

**Service Account Email**: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`  
**Project ID**: `time-tracker-484311`

## ⚠️ IMPORTANT: Do These Steps Now

### Step 1: Share Google Sheet with NEW Service Account

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit
2. Click **Share** (top right)
3. **Remove the old service account** (if it's there): `timesheet-sync-sa@time-tracker-481611.iam.gserviceaccount.com`
4. **Add the NEW service account**: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
5. Set permission to **Editor**
6. Click **Send**

### Step 2: Enable Google Sheets API in NEW Project

1. Go to: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=484311
2. Click **Enable**
3. Wait 1-2 minutes

### Step 3: Restart Backend

After updating the service account file, restart your backend:

```bash
# Stop your backend (Ctrl+C if running)
# Then start again:
cd backend
npm start
```

### Step 4: Test

1. Create a project in your app
2. Check your Google Sheet - data should appear!

## ✅ What I've Updated

- ✅ Updated `backend/service-account-key.json` with new credentials
- ✅ Updated all documentation files with new service account email

## 🎉 That's It!

Once you share the sheet with the new service account and enable the API, everything will work!
