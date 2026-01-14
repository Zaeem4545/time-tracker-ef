# Service Account Setup - Quick Guide

> 📖 **For detailed Local AND Production setup**, see: [LOCAL_AND_PRODUCTION_SETUP.md](./LOCAL_AND_PRODUCTION_SETUP.md)

## ✅ Your Service Account is Ready!

**Service Account Email**: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`

**Note**: This setup works for **both local development AND production**! 🎉

## Step 1: Share Google Sheet with Service Account

**IMPORTANT**: You must share your Google Sheet with the service account email!

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit
2. Click the **Share** button (top right)
3. Add this email: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
4. Give it **Editor** permissions
5. Click **Send** (you can uncheck "Notify people" if you want)

## Step 2: Update `backend/.env` File

Add these lines to your `backend/.env`:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU

# Service Account (Option 1: File Path - Recommended)
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json

# OR Service Account (Option 2: JSON String in env variable)
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"time-tracker-481611",...}
```

**Note**: The JSON file `service-account-key.json` has already been created in the `backend` folder.

## Step 3: Restart Backend Server

After updating `.env`, restart your backend:

```bash
# If using PM2
pm2 restart time-tracking-backend

# If running directly
npm start
```

## Step 4: Verify It's Working

1. Check backend console - you should see: `✅ Using Service Account authentication`
2. Create a new user, project, task, customer, or time entry in your app
3. Check your Google Sheet - new rows should appear automatically!

## That's It! 🎉

No OAuth authorization needed - service account works automatically!

## Troubleshooting

**"Permission denied" errors?**
- Make sure you shared the Google Sheet with: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
- Check that Editor permissions were granted

**"File not found" errors?**
- Verify `GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json` in `.env`
- Make sure the file exists at `backend/service-account-key.json`

**No data syncing?**
- Check backend console logs for errors
- Verify `GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU` in `.env`
- Make sure Google Sheets API is enabled in Google Cloud Console
