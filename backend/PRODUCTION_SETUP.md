# Production Setup Guide - Google Sheets Sync

## Quick Setup for Production FQDN

### 1. Update Your `.env` File

Add these variables to `backend/.env`:

```env
# Your Production Domain (replace with your actual FQDN)
PRODUCTION_DOMAIN=https://your-domain.com
BACKEND_URL=https://your-domain.com

# Google Sheets Configuration
GOOGLE_CLIENT_ID=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE
```

### 2. Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.com/auth/google/callback
   ```
5. Click **Save**

### 3. Update CORS Settings

The backend automatically includes your production domain in CORS if you set `PRODUCTION_DOMAIN` or `FRONTEND_URL` in `.env`.

### 4. Get Authorization URL

Visit this URL (replace with your domain):
```
https://YOUR_DOMAIN/api/google-sheets/auth-url
```

Or use this direct URL:
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com&redirect_uri=https://YOUR_DOMAIN/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent
```

### 5. Authorize and Get Refresh Token

1. Visit the authorization URL
2. Authorize the application
3. You'll be redirected to: `https://YOUR_DOMAIN/auth/google/callback?code=...`
4. Check your backend console logs for the refresh token
5. Add it to `.env` as `GOOGLE_REFRESH_TOKEN`

### 6. Restart Backend

After updating `.env`, restart your backend server:
```bash
# If using PM2
pm2 restart time-tracking-backend

# If running directly
npm start
```

## How It Works

Once configured, **all database operations automatically sync to Google Sheets**:

- ✅ **Create** operations → New rows added to sheets
- ✅ **Update** operations → Existing rows updated
- ✅ **Delete** operations → Rows removed from sheets

## Sheets Created Automatically

The system creates these sheets in your Google Sheet:
- `Users` - All user data
- `Projects` - All project data
- `Tasks` - All task data
- `Customers` - All customer data
- `Time Entries` - All time tracking entries

## Troubleshooting

**Sync not working?**
1. Check backend logs for errors
2. Verify `GOOGLE_SHEET_ID` is correct
3. Verify `GOOGLE_REFRESH_TOKEN` is set
4. Check that Google Sheets API is enabled in Google Cloud Console
5. Ensure the Google Sheet is accessible (shared with correct account)

**CORS errors?**
- Make sure `PRODUCTION_DOMAIN` is set correctly in `.env`
- Restart backend after changing `.env`

**Authorization errors?**
- Verify redirect URI matches exactly in Google Cloud Console
- Check that `BACKEND_URL` or `PRODUCTION_DOMAIN` is set correctly
- Ensure HTTPS is used if your site uses HTTPS
