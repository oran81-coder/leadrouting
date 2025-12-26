# 🎯 URGENT FIX - Enable Real Data Display

## Problem:
- Manager Screen shows fake data (mock_board, agent_123)
- Field Mapping shows "0 columns available"
- Outcomes data might be outdated

## Root Cause:
The **Frontend is missing the API key** in localStorage!

---

## ✅ SOLUTION (Takes 30 seconds!)

### Step 1: Open Browser Console
1. In the Lead Routing UI (`http://localhost:5173`)
2. Press **F12** (or Right Click → Inspect)
3. Click **Console** tab

### Step 2: Set API Key
Paste this command in the console and press Enter:

```javascript
localStorage.setItem('apiKey', 'dev_key_123');
console.log('✅ API Key set! Refresh the page...');
```

### Step 3: Refresh Page
Press **F5** or click the refresh button.

### Step 4: Verify Real Data
1. Go to **Manager Screen**
2. You should now see:
   - ✅ Real board IDs (like `18393182279`)
   - ✅ Real item IDs (like `10851877055`)
   - ✅ Real assignees (like `97679373` or agent names)
   - ❌ NO MORE: `mock_board`, `agent_123`, `test_lead`

3. Go to **Field Mapping**
   - Click **Field Mapping** tab
   - You should now see:
     - ✅ "leads" board appears
     - ✅ All columns visible (Name, Agent, Status, Industry, lead source, deal amount, etc.)
     - ❌ NO MORE: "0 columns available"

---

## 🎯 That's It!

**Just run that ONE command in the browser console and refresh!**

Everything will start showing real data immediately! 🚀

---

## 🔍 Verify Database Status

If you want to see what data is in the system, run this in PowerShell:

```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
$headers = @{"x-api-key" = "dev_key_123"}
Invoke-RestMethod -Uri "http://localhost:3000/manager/proposals?limit=5" -Headers $headers | ConvertTo-Json -Depth 3
```

You should see real proposals with:
- Real boardId: `18393182279`
- Real itemId: `10851877055`
- Real assignee IDs

---

## ✅ Summary

**Problem:** Frontend couldn't authenticate API calls → got nothing or errors  
**Solution:** Set API key in localStorage  
**Result:** Real data displays instantly! ✨

---

**After this fix:**
- ✅ Manager shows real proposals
- ✅ Field Mapping shows all board columns
- ✅ Admin can connect Monday.com properly
- ✅ Everything works!

**No server restart needed. Just set the key and refresh!** 🎉

