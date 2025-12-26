# ⚠️ DEPRECATED - DO NOT USE THIS SCRIPT

This script has been replaced because it causes Cursor to disconnect.

## Use Instead:

### Method 1: Admin UI (Recommended)
1. Open `http://localhost:5173`
2. Go to Admin tab
3. Click "Connect Monday.com"
4. Enter token and save

### Method 2: Simple PowerShell
```powershell
$token = "YOUR_TOKEN_HERE"
$body = @{ token = $token } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/admin/monday/connect" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
```

## Full Guide:
See `SETUP_REAL_DATA_SIMPLE.md` for complete instructions.

---

**Why was this removed?**
- The script loads entire Prisma client and database
- This causes memory/CPU spike that disconnects Cursor
- The Admin UI does the same thing without problems

