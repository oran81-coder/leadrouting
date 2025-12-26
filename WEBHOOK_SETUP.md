# 🎯 הגדרת Webhooks למערכת Routing

## סטטוס: ✅ תשתית הווב-הוק הושלמה!

כל הקוד מוכן - נותר רק להגדיר את ngrok כדי לחשוף את השרת המקומי לאינטרנט.

---

## 📋 מה בוצע?

### 1. ✅ תשתית Backend
- ✅ נוסף מודל `MondayWebhook` ל-database
- ✅ נוספו `PUBLIC_URL` ו-`WEBHOOK_SECRET` ל-environment variables
- ✅ נוצר endpoint: `POST /webhooks/monday`
- ✅ נוצר handler: `handleNewLead()` - מעבד לידים חדשים אוטומטית
- ✅ נוצרה פונקציה: `registerMondayWebhook()` - רושמת webhooks ב-Monday.com
- ✅ עודכן `POST /admin/monday/connect` - רושם webhooks אוטומטית בחיבור

### 2. ✅ זרימת עבודה אוטומטית
כאשר אדמין מחבר Monday.com דרך ה-UI:
1. המערכת שומרת את ה-API Token
2. **אוטומטית** רושמת webhook ב-Monday.com לבורד הראשי
3. כל ליד חדש ב-Monday → webhook → `handleNewLead()` → proposal נוצר!

---

## 🚀 צעדים להשלמת ההגדרה

### שלב 1: הרשמה ל-ngrok (חינם)

1. **הירשם לngrok:**
   - גש ל-https://dashboard.ngrok.com/signup
   - הירשם עם אימייל (או Google/GitHub)

2. **קבל את ה-authtoken:**
   - אחרי ההרשמה, תועבר אוטומטית לדף "Your Authtoken"
   - או גש ל-https://dashboard.ngrok.com/get-started/your-authtoken
   - העתק את ה-token (נראה כמו: `2a...xyz`)

### שלב 2: הגדר authtoken

פתח PowerShell והרץ:

```powershell
npx ngrok config add-authtoken YOUR_TOKEN_HERE
```

החלף `YOUR_TOKEN_HERE` ב-token שהעתקת.

### שלב 3: הרץ ngrok

**בטרמינל חדש** (שלא יסגר), הרץ:

```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npx ngrok http 3000
```

**תראה משהו כזה:**

```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

**⚠️ אל תסגור טרמינל זה!** צריך שהוא ירוץ כל הזמן שאתה רוצה שהמערכת תקבל webhooks.

### שלב 4: עדכן .env

1. **העתק את ה-URL** מהשורה `Forwarding` (למשל: `https://abc123.ngrok.io`)

2. **ערוך את `.env`:**

```bash
# ערוך את השורה PUBLIC_URL
PUBLIC_URL=https://abc123.ngrok.io

# (אופציונלי) הגדר secret להצפנה
WEBHOOK_SECRET=your-random-secret-string-here
```

3. **אתחל מחדש את השרת** (`npm run dev`)

### שלב 5: חבר מחדש את Monday.com

1. פתח את **Admin Screen** במערכת
2. לחץ על **"Connect Monday.com"**
3. הזן את ה-API Token שלך
4. שמור

**המערכת תרשום webhook אוטומטית!** תראה בתגובה:

```json
{
  "ok": true,
  "connected": true,
  "webhook": {
    "registered": true,
    "message": "Webhook registered: 123456789"
  }
}
```

---

## 🧪 בדיקה

### בדיקה 1: בדוק שה-webhook endpoint עובד

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/webhooks/test" -Method Get
```

**תגובה צפויה:**
```json
{
  "ok": true,
  "message": "Webhook infrastructure is operational"
}
```

### בדיקה 2: צור ליד חדש ב-Monday.com

1. גש ל-Board הראשי ב-Monday.com
2. **הוסף item חדש** (לחץ על "+ Add Item")
3. מלא את השדות הבסיסיים (חברה, אינדסטריה, deal size)

### בדיקה 3: בדוק ב-Manager Screen

1. פתח את **Manager Screen** במערכת שלנו
2. **אמור לראות** proposal חדש עם הליד שהוספת!
3. סטטוס: `pending`
4. המלצה: Agent מומלץ + ציון

---

## 🔍 Debug

### אם הwebhook לא עובד:

1. **בדוק logs של ngrok:**
   בטרמינל של ngrok, תראה בקשות נכנסות:
   ```
   POST /webhooks/monday   200 OK
   ```

2. **בדוק logs של השרת:**
   בטרמינל של `npm run dev`, תראה:
   ```
   📨 Received webhook from Monday.com
   📥 Processing new lead: ...
   ✅ Routing proposal created for lead: ...
   ```

3. **בדוק ב-Monday.com webhooks:**
   - Board Menu → Integrations → Webhooks
   - תראה webhook רשום ל-URL של ngrok

4. **בדוק את ה-database:**
   ```powershell
   npx prisma studio
   ```
   - פתח `MondayWebhook` - תראה רשומות
   - פתח `RoutingProposal` - תראה proposals שנוצרו

---

## 🌐 מעבר לייצור (Production)

כאשר תעלה לשרת אמיתי עם דומיין:

### שלב 1: עדכן .env בשרת

```bash
PUBLIC_URL=https://yourdomain.com
WEBHOOK_SECRET=strong-random-secret-here
```

### שלב 2: הרץ מחדש את השרת

המערכת תשתמש אוטומטית ב-URL החדש.

### שלב 3: רשום webhooks מחדש

אם יש לך webhooks קיימים רשומים עם ngrok URL:

1. מחק אותם ידנית ב-Monday.com (Board → Integrations → Webhooks)
2. גש ל-Admin Screen
3. לחץ "Connect Monday.com" שוב
4. המערכת תרשום webhooks עם ה-URL החדש

**לא צריך לשנות קוד!** הכל אוטומטי.

---

## 📚 קבצים שנוצרו/שונו

### קבצים חדשים:
- `packages/modules/monday-integration/src/application/monday.webhooks.ts`
- `packages/modules/monday-integration/src/application/leadIntake.handler.ts`
- `apps/api/src/routes/webhooks.routes.ts`
- `prisma/schema.prisma` (מודל MondayWebhook)

### קבצים שעודכנו:
- `apps/api/src/config/env.ts` (PUBLIC_URL, WEBHOOK_SECRET)
- `apps/api/src/routes/admin.routes.ts` (webhook registration)
- `apps/api/src/routes/index.ts` (mount webhooks routes)
- `.env` (PUBLIC_URL, WEBHOOK_SECRET)

---

## ✅ מה עובד אוטומטית?

1. ✅ **ליד חדש** ב-Monday → **proposal נוצר** אוטומטית
2. ✅ **Manager רואה** את כל ה-proposals
3. ✅ **לחיצה על Approve** → **ליד משוייך** ל-agent ב-Monday
4. ✅ **Outcomes Screen** מציג נתונים אמיתיים
5. ✅ **לא צריך** לרענן ידנית או לסנכרן

---

## 🎉 סיום

כעת המערכת שלך **עובדת בזמן אמת**!  
כל ליד חדש ב-Monday.com יעבור אוטומטית דרך מנוע ה-routing ויקבל המלצה.

אם יש שאלות, בדוק את הlogs או צור קשר.

