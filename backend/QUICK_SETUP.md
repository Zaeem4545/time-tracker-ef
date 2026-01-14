# Quick Setup - Local & Production

## ✅ One-Time Setup (Do This First)

### Share Google Sheet
1. Open: https://docs.google.com/spreadsheets/d/1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU/edit
2. Click **Share** → Add: `time-tracker@time-tracker-484311.iam.gserviceaccount.com`
3. Set to **Editor** → **Send**

---

## 🏠 Local Development

### Update `backend/.env`:
```env
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json
```

### Test:
```bash
cd backend
npm start
# Should see: ✅ Using Service Account authentication
# Create a record → Check Google Sheet → Data appears!
```

---

## 🚀 Production

### Option 1: File Path (Easiest)
```env
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/backend/service-account-key.json
```

**Copy `service-account-key.json` to production server**

### Option 2: Environment Variable (More Secure)
```env
GOOGLE_SHEET_ID=1g_EpjJBLQzJazs0TQHWGB_rSEXk2TSejWiCHdQ-3vQU
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"time-tracker-481611",...}
```

**Convert JSON to single line** (remove newlines and spaces)

---

## ✅ Verify Both Work

- **Local**: Create record → Check sheet → ✅
- **Production**: Create record → Check sheet → ✅

---

📖 **Full Guide**: See [LOCAL_AND_PRODUCTION_SETUP.md](./LOCAL_AND_PRODUCTION_SETUP.md)
