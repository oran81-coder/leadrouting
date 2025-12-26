# 🔧 תיקון: לידים חדשים לא משתקפים במערכת

## 🔍 הבעיה שזוהתה:

1. **אין webhook רשום** - לידים חדשים ב-Monday.com לא נשלחים למערכת
2. **נתונים ישנים/דמה** - proposals ישנים מתקופת הפיתוח
3. **חוסר סנכרון** - הנתונים לא מעודכנים מ-Monday.com

## ✅ פתרון - צעדים לביצוע:

### שלב 1: רישום Webhook (קריטי!)

**גש ל-Admin Screen (Tab #3) ובצע:**

1. גלול למטה ל-**"Monday.com Integration"**
2. תראה: **Status: ✅ Connected**
3. לחץ על הכפתור **"Test Connection"** 
4. אם זה עובד, המשך:

**כעת רשום את הwebhook:**

בטרמינל PowerShell, הרץ:

```powershell
$headers = @{"X-API-Key"="dev_key_123"}
$body = @{
  token = "YOUR_MONDAY_API_TOKEN_HERE"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/admin/monday/connect" -Headers $headers -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json
```

**החלף `YOUR_MONDAY_API_TOKEN_HERE` ב-token האמיתי שלך!**

**תגובה צפויה:**
```json
{
  "ok": true,
  "connected": true,
  "webhook": {
    "registered": true,
    "message": "Webhook registered: 123456..."
  }
}
```

### שלב 2: וודא ש-Routing מופעל

```powershell
$headers = @{"X-API-Key"="dev_key_123"}
Invoke-RestMethod -Uri "http://localhost:3000/admin/routing/state" -Headers $headers -Method Get | ConvertTo-Json
```

אם `isEnabled: false`, הפעל:

```powershell
$headers = @{"X-API-Key"="dev_key_123"}
Invoke-RestMethod -Uri "http://localhost:3000/admin/routing/enable" -Headers $headers -Method Post | ConvertTo-Json
```

### שלב 3: נקה נתונים ישנים (אופציונלי אך מומלץ)

**⚠️ זה ימחק את כל ה-proposals הישנים!**

```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts

npx tsx -e "import { getPrisma } from './packages/core/src/db/prisma.ts'; const prisma = getPrisma(); prisma.routingProposal.deleteMany({ where: { boardId: 'mock_board' } }).then(r => { console.log('Deleted', r.count, 'mock proposals'); return prisma.routingProposal.deleteMany({ where: { itemName: null } }); }).then(r => { console.log('Deleted', r.count, 'proposals without itemName'); process.exit(0); })"
```

### שלב 4: טען נתונים עדכניים מ-Monday.com

```powershell
$headers = @{"X-API-Key"="dev_key_123"}
$body = @{
  limitPerBoard = 100
  forceReload = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/admin/sync-metrics" -Headers $headers -Method Post -Body $body -ContentType "application/json"
```

זה יטען:
- ✅ היסטוריה של לידים מ-Monday.com
- ✅ חישוב agent profiles
- ✅ נתונים ל-Outcomes Screen

### שלב 5: בדוק webhook ב-Monday.com

1. גש ל-Monday.com Board שלך
2. לחץ על **⋯** (Menu) → **Integrations** → **Webhooks**
3. תראה webhook רשום עם URL:
   `https://unsepultured-uncatastrophically-beulah.ngrok-free.dev/webhooks/monday`

### שלב 6: בדיקה - הוסף ליד חדש

1. גש ל-Monday.com Board
2. לחץ **+ Add Item**
3. מלא:
   - שם החברה
   - Industry
   - Deal Size
   - כל שדה נוסף שממופה
4. שמור

5. **חזור ל-Manager Screen במערכת**
6. לחץ **Refresh**
7. **תראה proposal חדש מופיע עם הנתונים האמיתיים!** 🎉

---

## 🔍 Debug - אם זה עדיין לא עובד

### בדוק logs של השרת:

גש לטרמינל 22 (Backend) ותראה:
```
📨 Received webhook from Monday.com
📥 Processing new lead: [שם הליד]
✅ Routing proposal created for lead: [שם הליד]
```

### בדוק ב-Prisma Studio:

1. פתח: http://localhost:5555
2. עבור ל-`MondayWebhook`
3. תראה רשומה עם:
   - `boardId`: 18393182279
   - `isActive`: true
   - `webhookId`: מספר מ-Monday.com

### בדוק ngrok:

גש ל-http://localhost:4040
תראה requests נכנסים מ-Monday.com

---

## 📊 תוצאה צפויה

לאחר הביצוע:
- ✅ Manager Screen יציג proposals אמיתיים
- ✅ Outcomes Screen יציג נתונים מ-Monday.com
- ✅ Agent names אמיתיים (לא agent_123)
- ✅ כל ליד חדש ב-Monday יופיע אוטומטית

---

## ⚠️ הערה חשובה

**ngrok URL תקף ל-8 שעות בלבד!**

כאשר ngrok מפסיק, תצטרך:
1. להפעיל מחדש: `npx ngrok http 3000`
2. לעדכן את ה-PUBLIC_URL ב-.env
3. לאתחל את השרת
4. **לחבר מחדש Monday.com** כדי לרשום webhook עם ה-URL החדש

---

**זמן ביצוע משוער:** 5 דקות
**קושי:** קל-בינוני

