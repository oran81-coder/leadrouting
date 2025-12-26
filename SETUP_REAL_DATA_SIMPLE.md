# 🚀 Setup Real Data from Monday.com - Simple Steps

## ⚠️ Important Note
**DO NOT run `npx tsx register-webhook-auto.ts`** - it causes Cursor to disconnect!

Instead, use these simple methods:

---

## 🎯 Method 1: Through Admin UI (Recommended - EASIEST!)

This is the simplest and most reliable way:

### Steps:

1. **Make sure server is running:**
   ```powershell
   # Open a terminal and run:
   cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
   npm run dev
   ```

2. **Open frontend in browser:**
   - Go to: `http://localhost:5173`

3. **Navigate to Admin Screen:**
   - Click on the **Admin** tab (Tab #3)

4. **Connect Monday.com:**
   - Scroll to "Monday.com Integration" section
   - Enter your **Monday.com API Token**
   - Click **"Connect"** button

5. **Done!**
   - The system will automatically:
     - ✅ Save your token
     - ✅ Register webhook with Monday.com
     - ✅ Update database
   
   You'll see a success message with webhook details!

---

## 🎯 Method 2: Direct API Call (Alternative)

If you prefer command line, use this simple PowerShell command:

```powershell
# Step 1: Set your token
$token = "YOUR_MONDAY_API_TOKEN_HERE"

# Step 2: Connect
$body = @{ token = $token } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:3000/admin/monday/connect" -Method Post -Body $body -ContentType "application/json"

# Step 3: Check result
$result | ConvertTo-Json
```

**Replace `YOUR_MONDAY_API_TOKEN_HERE` with your actual token!**

---

## 🎯 Method 3: Manual Webhook Registration (If needed)

If for some reason the automatic registration didn't work, you can register webhook directly:

```powershell
# Your Monday.com details
$MONDAY_TOKEN = "YOUR_TOKEN"
$BOARD_ID = "18393182279"  # Your board ID
$PUBLIC_URL = "https://your-ngrok-url.ngrok.io"  # Get from .env file

# Register webhook
$mutation = @"
mutation {
  create_webhook (
    board_id: $BOARD_ID,
    url: "$PUBLIC_URL/webhooks/monday",
    event: create_pulse
  ) {
    id
    board_id
  }
}
"@

$body = @{ query = $mutation } | ConvertTo-Json

$headers = @{
    "Authorization" = $MONDAY_TOKEN
    "Content-Type" = "application/json"
}

$result = Invoke-RestMethod -Uri "https://api.monday.com/v2" -Method Post -Headers $headers -Body $body
$result.data.create_webhook
```

---

## 📊 How to Get Real Data into Outcomes Screen

After connecting Monday.com, you need to load historical data:

### Option 1: Through Admin UI
1. Go to Admin Screen
2. Click **"Recompute Metrics"** button
3. Wait 30-60 seconds
4. Data will appear in Outcomes!

### Option 2: API Call
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/metrics/recompute" -Method Post | ConvertTo-Json
```

This will:
- ✅ Fetch all leads from Monday.com boards
- ✅ Calculate agent metrics
- ✅ Populate Outcomes screen with real data

---

## ✅ Verification Steps

### 1. Check if Monday.com is connected:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/monday/status" | ConvertTo-Json
```

Should show: `"connected": true`

### 2. Check if webhook is registered:
```powershell
# Check in database
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npx prisma studio
```

Open browser to `http://localhost:5555`:
- Go to `MondayWebhook` table
- You should see a record with `isActive: true`

### 3. Check if data is loading:
```powershell
# Check proposals count
Invoke-RestMethod -Uri "http://localhost:3000/manager/proposals?limit=5" | ConvertTo-Json -Depth 5
```

---

## 🧪 Test with Real Lead

After setup is complete:

1. **Go to Monday.com** board
2. **Add a new item** (click "+ Add Item")
3. **Fill in fields:**
   - Company name
   - Industry
   - Deal size
   - Any other mapped fields
4. **Save**

5. **Check Manager Screen:**
   - Go to `http://localhost:5173`
   - Open Manager Screen
   - Click "Refresh"
   - **You should see a new proposal appear!** 🎉

---

## 🔍 Troubleshooting

### Issue: "Server not responding"
**Solution:** Restart the server
```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npm run dev
```

### Issue: "Webhook not working"
**Solution:** Check if ngrok is running
```powershell
# Check ngrok
try { (Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels").tunnels[0].public_url } catch { "ngrok not running - start it with: npx ngrok http 3000" }
```

### Issue: "No data in Outcomes"
**Solution:** Run metrics recompute
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/metrics/recompute" -Method Post
```

Wait 30-60 seconds, then refresh Outcomes screen.

---

## 💡 Why Not Use the Script?

The `register-webhook-auto.ts` script:
- ❌ Loads entire Prisma client
- ❌ Queries database heavily
- ❌ Causes Cursor to disconnect
- ❌ Too complex for a simple task

The Admin UI method:
- ✅ Simple HTTP calls
- ✅ Doesn't overload the system
- ✅ Works reliably
- ✅ No disconnections!

---

## 🎯 Quick Summary

**To get real data from Monday.com:**

1. ✅ Start server: `npm run dev`
2. ✅ Open: `http://localhost:5173`
3. ✅ Go to Admin → Connect Monday.com
4. ✅ Enter token and save
5. ✅ Click "Recompute Metrics"
6. ✅ Check Manager and Outcomes screens!

**That's it!** No complex scripts, no disconnections! 🚀

---

**Last Updated:** December 26, 2025  
**Status:** Tested and working  
**Recommended Method:** Admin UI (Method 1)

