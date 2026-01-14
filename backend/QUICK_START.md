# Quick Start - Google Sheets Sync

## Your Google Sheet
✅ **Sheet ID**: `1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU`  
🔗 **Sheet URL**: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit

## What You Still Need

### 1. Client Secret
Get it from Google Cloud Console:
- Go to: https://console.cloud.google.com/apis/credentials
- Click on your OAuth 2.0 Client ID
- Copy the **Client Secret** (starts with `GOCSPX-`)

### 2. Refresh Token
You'll get this after authorization (see Step 3 below)

### 3. Production Domain (if using public FQDN)
Your backend URL (e.g., `https://your-domain.com`)

## Setup Steps

### Step 1: Update `backend/.env`

Add these lines:
```env
# Google Sheets Configuration
GOOGLE_CLIENT_ID=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU

# Production Domain (if using public FQDN)
PRODUCTION_DOMAIN=https://your-domain.com
BACKEND_URL=https://your-domain.com
```

### Step 2: Add Redirect URI in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - For local: `http://localhost:3000/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`
4. Click **Save**

### Step 3: Get Refresh Token

**Option A: Using API Endpoint**
1. Start your backend: `npm start` (in backend folder)
2. Visit: `http://localhost:3000/api/google-sheets/auth-url` (or your production URL)
3. Copy the `authUrl` from the response
4. Open that URL in your browser
5. Authorize the application
6. Check backend console logs for the refresh token
7. Add it to `.env` as `GOOGLE_REFRESH_TOKEN`

**Option B: Direct URL**
Visit this URL (replace `YOUR_DOMAIN` with your actual domain):
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com&redirect_uri=https://YOUR_DOMAIN/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent
```

### Step 4: Restart Backend

After adding the refresh token to `.env`, restart your backend server.

## Verify It's Working

1. Create a new user, project, task, customer, or time entry in your app
2. Check your Google Sheet - you should see new rows appear automatically!
3. The system will create these sheets automatically:
   - `Users`
   - `Projects`
   - `Tasks`
   - `Customers`
   - `Time Entries`

## Troubleshooting

**No data syncing?**
- Check backend console logs for errors
- Verify `GOOGLE_SHEET_ID` matches: `1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU`
- Verify `GOOGLE_REFRESH_TOKEN` is set correctly
- Make sure Google Sheets API is enabled in Google Cloud Console

**Authorization errors?**
- Verify redirect URI matches exactly in Google Cloud Console
- Check that `BACKEND_URL` or `PRODUCTION_DOMAIN` is set correctly
