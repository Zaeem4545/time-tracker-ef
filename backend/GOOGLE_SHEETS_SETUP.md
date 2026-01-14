# Google Sheets Integration Setup Guide

## Prerequisites

You already have:
- ✅ Google Cloud Project
- ✅ Google Client ID: `1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com`

## Step 1: Get Your Client Secret

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID (the one ending with `.apps.googleusercontent.com`)
5. Click on it to view details
6. Copy the **Client Secret** (it looks like: `GOCSPX-xxxxxxxxxxxxx`)

## Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and click **Enable**

## Step 3: Your Google Sheet

✅ **Your Sheet ID**: `1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU`  
🔗 **Sheet URL**: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit

The system will automatically create these sheets in your spreadsheet:
- `Users`
- `Projects`
- `Tasks`
- `Customers`
- `Time Entries`

## Step 4: Get Refresh Token (For Automated Access)

You have two options:

### Option A: Service Account (Recommended for Production)
1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Name it (e.g., "time-tracking-service")
4. Click **Create and Continue**
5. Skip optional steps, click **Done**
6. Click on the service account you created
7. Go to **Keys** tab
8. Click **Add Key** > **Create new key**
9. Choose **JSON**
10. Download the JSON file
11. Share your Google Sheet with the service account email (found in the JSON file)
12. Give it **Editor** permissions

### Option B: OAuth Refresh Token (For Development)
1. Run the authorization script (see below)
2. Follow the prompts to authorize
3. Copy the refresh token

## Step 5: Configure Authorized Redirect URIs (IMPORTANT for Production)

If you're using a public FQDN (production domain), you MUST add it to Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/auth/google/callback` (for local development)
   - `https://YOUR_DOMAIN.com/auth/google/callback` (replace with your actual domain)
   - `http://YOUR_DOMAIN.com/auth/google/callback` (if not using HTTPS)
5. Click **Save**

## Step 6: Configure Environment Variables

Add these to your `backend/.env` file:

### For Local Development:
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Google Sheet ID (from Step 3)
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU

# Refresh Token (if using OAuth method)
GOOGLE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE
```

### For Production (with Public FQDN):
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# Production Domain Configuration
PRODUCTION_DOMAIN=https://your-domain.com
BACKEND_URL=https://your-domain.com
# OR if backend is on different subdomain:
# BACKEND_URL=https://api.your-domain.com

# Google Sheet ID (from Step 3)
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU

# Refresh Token (if using OAuth method)
GOOGLE_REFRESH_TOKEN=YOUR_REFRESH_TOKEN_HERE
```

**Note:** The `GOOGLE_REDIRECT_URI` will be automatically set based on `BACKEND_URL` or `PRODUCTION_DOMAIN`. If you need to override it manually:
```env
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

## Step 7: Install Dependencies

Run in the `backend` directory:
```bash
npm install googleapis
```

## Step 8: Authorize Google Sheets Access

### Option A: Using the API Endpoint (Recommended)

1. Start your backend server
2. Visit: `http://YOUR_DOMAIN/api/google-sheets/auth-url` (or `http://localhost:3000/api/google-sheets/auth-url` for local)
3. Copy the `authUrl` from the response
4. Open that URL in your browser
5. Authorize the application
6. You'll be redirected back and see a success message
7. Copy the refresh token from the backend console logs
8. Add it to your `.env` file as `GOOGLE_REFRESH_TOKEN`

### Option B: Direct Authorization URL

Visit this URL (replace with your domain):
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com&redirect_uri=https://YOUR_DOMAIN/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent
```

## Step 9: Test the Integration

After setting up, any create/update/delete operation in your app will automatically sync to Google Sheets:
- **Users** → "Users" sheet
- **Projects** → "Projects" sheet
- **Tasks** → "Tasks" sheet
- **Customers** → "Customers" sheet
- **Time Entries** → "Time Entries" sheet

## Troubleshooting

- If sync fails, check the backend console logs
- Make sure the Google Sheet is shared with the correct account
- Verify all environment variables are set correctly
- Check that Google Sheets API is enabled in your project

## What You Still Need

✅ **Google Sheet ID**: Already configured (`1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU`)

Please provide:
1. **Client Secret** (from Step 1) - Get it from Google Cloud Console
2. **Refresh Token** (from Step 8) - You'll get this after authorization
3. **Production Domain** (if using public FQDN) - Your backend URL

Once you provide the Client Secret and complete authorization, the setup will be complete!
