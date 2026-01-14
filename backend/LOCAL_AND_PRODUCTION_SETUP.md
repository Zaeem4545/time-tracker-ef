# Google Sheets Sync - Local & Production Setup

## ✅ Works for Both Local Development AND Production!

This guide shows you how to set up Google Sheets sync to work in **both** environments.

## Your Configuration

- **Google Sheet ID**: `1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU`
- **Service Account Email**: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
- **Service Account JSON File**: `backend/service-account-key.json` ✅ (Already created)

---

## Step 1: Share Google Sheet (One-Time Setup)

**IMPORTANT**: Share your Google Sheet with the service account email **once** - it works for both local and production!

1. Open: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit
2. Click **Share** (top right)
3. Add email: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
4. Set permission to **Editor**
5. Click **Send**

---

## Step 2: Local Development Setup

### Update `backend/.env` (Local)

Add these lines to your `backend/.env` file:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU

# Service Account (Local - relative path from backend folder)
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
```

### Test Locally

1. Start backend: `cd backend && npm start`
2. You should see: `✅ Using Service Account authentication from: ...`
3. Create a test record (user, project, task, etc.)
4. Check your Google Sheet - data should appear!

---

## Step 3: Production Setup

### Option A: Using File Path (Recommended)

**On your production server:**

1. **Copy the JSON file** to your production server:
   ```bash
   # Copy service-account-key.json to your production server
   # Place it in the backend folder or a secure location
   ```

2. **Update `backend/.env` on production server:**
   ```env
   # Google Sheets Configuration
   GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
   
   # Service Account (Production - use absolute path for clarity)
   GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/backend/service-account-key.json
   # OR relative path (if file is in backend folder):
   # GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
   ```

### Option B: Using Environment Variable (More Secure)

**For production, you can use environment variable instead of file:**

1. **Convert JSON to single line** (remove newlines):
   ```bash
   # On your local machine, convert the JSON to a single line
   cat backend/service-account-key.json | tr -d '\n' | tr -d ' '
   ```

2. **Add to production `.env` or environment variables:**
   ```env
   GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"time-tracker-481611",...}
   ```

   **Note**: The JSON should be on a single line without spaces.

### Restart Production Server

```bash
# If using PM2
pm2 restart time-tracking-backend

# If using systemd
sudo systemctl restart your-backend-service

# If running directly
npm start
```

---

## Step 4: Verify Both Environments

### Local Verification
1. ✅ Backend console shows: `✅ Using Service Account authentication`
2. ✅ Create a record locally → Check Google Sheet → Data appears

### Production Verification
1. ✅ Production logs show: `✅ Using Service Account authentication`
2. ✅ Create a record in production → Check Google Sheet → Data appears

---

## Configuration Examples

### Local `.env` (Development)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=time_tracking

# Google Sheets
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
```

### Production `.env` (Server)
```env
# Database
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_prod_user
DB_PASSWORD=your_prod_password
DB_NAME=time_tracking

# Google Sheets
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_SERVICE_ACCOUNT_PATH=/var/www/backend/service-account-key.json
# OR use environment variable:
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Troubleshooting

### Local Issues

**"File not found" error?**
- Check that `service-account-key.json` exists in `backend/` folder
- Verify path in `.env`: `GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json`
- Try absolute path: `GOOGLE_SERVICE_ACCOUNT_PATH=C:\path\to\backend\service-account-key.json`

**No data syncing locally?**
- Check backend console for errors
- Verify `GOOGLE_SHEET_ID` is correct
- Make sure Google Sheet is shared with service account email

### Production Issues

**"File not found" error in production?**
- Verify the JSON file exists on production server
- Check file permissions: `chmod 600 service-account-key.json`
- Use absolute path in `.env` for clarity
- Or use `GOOGLE_SERVICE_ACCOUNT_JSON` environment variable instead

**Permission denied?**
- Make sure Google Sheet is shared with: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
- Check file permissions on production server

**Path resolution issues?**
- Use absolute paths in production: `/full/path/to/service-account-key.json`
- Or use environment variable method (Option B) which doesn't need file paths

---

## Security Notes

1. ✅ **`.gitignore`** already excludes `service-account-key.json` - it won't be committed to git
2. 🔒 **Production**: Store JSON file securely, use environment variables if possible
3. 🔒 **File Permissions**: Set restrictive permissions: `chmod 600 service-account-key.json`
4. 🔒 **Never commit** the JSON file or share it publicly

---

## Quick Checklist

- [ ] Google Sheet shared with service account email
- [ ] `service-account-key.json` exists in `backend/` folder
- [ ] Local `.env` configured with `GOOGLE_SERVICE_ACCOUNT_PATH`
- [ ] Local backend restarted and working
- [ ] Production `.env` configured (file path OR JSON env variable)
- [ ] JSON file copied to production server (if using file method)
- [ ] Production backend restarted
- [ ] Tested sync in both environments ✅

---

## That's It! 🎉

Your Google Sheets sync now works in **both** local development and production!

Any create/update/delete operations will automatically sync to your Google Sheet from both environments.
