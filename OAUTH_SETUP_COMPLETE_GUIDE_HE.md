# Monday.com OAuth Setup - Complete Guide (Hebrew)

## מדריך מלא להגדרת Monday.com OAuth

### למה צריך OAuth?

OAuth מאפשר למשתמשים:
- 🔐 להירשם ולהתחבר דרך חשבון Monday.com שלהם
- 🚀 חיבור אוטומטי של הארגון ל-API של Monday.com
- ✅ אבטחה מקסימלית ללא צורך בשמירת סיסמאות

---

## שלב 1: יצירת אפליקציה ב-Monday.com

### 1.1 היכנס ל-Monday Developers
```
https://auth.monday.com/developers
```

או דרך המסלול:
1. היכנס ל-Monday.com
2. לחץ על תמונת הפרופיל (פינה ימנית עליונה)
3. בחר **"Developers"**
4. לחץ **"My Apps"**

### 1.2 צור אפליקציה חדשה
1. לחץ על כפתור **"Create App"** (כחול)
2. הכנס שם: **Lead Routing System**
3. בחר: **"For my own account"**
4. לחץ **"Create"**

---

## שלב 2: הגדרת OAuth

### 2.1 מצא את פרטי האפליקציה
בדף האפליקציה שלך:
1. בצד שמאל, לחץ על **"OAuth"**
2. תראה:
   - **Client ID** - מחרוזת ארוכה
   - **Client Secret** - לחץ **"Show"** כדי לראות

### 2.2 העתק את הפרטים
```
Client ID: abc123...xyz
Client Secret: secret456...789
```

⚠️ **חשוב:** השמור את ה-Client Secret במקום בטוח!

---

## שלב 3: הוספת Redirect URI

### 3.1 במסך OAuth
1. גלול למטה ל-**"Redirect URLs"**
2. לחץ **"Add"**
3. הכנס:
   ```
   http://localhost:5173/register-org
   ```
4. לחץ **"Add"** (הכפתור הכחול)

### 3.2 לייצור (Production)
כשתעלה את המערכת לשרת אמיתי, הוסף גם:
```
https://yourdomain.com/register-org
```

---

## שלב 4: הגדרת הרשאות (Scopes)

### 4.1 במסך OAuth
1. גלול ל-**"Scopes"**
2. בחר את ההרשאות הבאות:

| Scope | תיאור | נדרש? |
|-------|-------|-------|
| `me:read` | קריאת פרטי המשתמש המחובר | ✅ כן |
| `account:read` | קריאת פרטי החשבון/Workspace | ✅ כן |
| `boards:read` | קריאת לוחות | ✅ כן |
| `boards:write` | כתיבה ללוחות | ✅ כן |
| `users:read` | קריאת רשימת משתמשים | ✅ כן |
| `workspaces:read` | קריאת workspaces | ✅ כן |

### 4.2 שמירה
לחץ **"Save"** בתחתית הדף.

---

## שלב 5: הגדרה במערכת

### אפשרות 1: שימוש בסקריפט (מומלץ)

פתח PowerShell בתיקיית הפרויקט והרץ:
```powershell
.\setup-oauth.ps1
```

הסקריפט ינחה אותך שלב אחר שלב.

### אפשרות 2: הגדרה ידנית

#### 5.1 צור קובץ `.env`
בתיקיית השורש של הפרויקט, צור קובץ בשם `.env`

#### 5.2 הוסף את השורות הבאות:
```bash
# Monday.com OAuth Configuration
MONDAY_OAUTH_CLIENT_ID=YOUR_CLIENT_ID_HERE
MONDAY_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
MONDAY_OAUTH_REDIRECT_URI=http://localhost:5173/register-org

# Other required settings
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
BCRYPT_ROUNDS=10
AUTH_ENABLED=true
ROUTING_API_KEY=dev_key_123
CORS_ORIGIN=http://localhost:5173
```

#### 5.3 החלף את הערכים
- `YOUR_CLIENT_ID_HERE` - ה-Client ID מ-Monday.com
- `YOUR_CLIENT_SECRET_HERE` - ה-Client Secret מ-Monday.com

---

## שלב 6: הפעלה מחדש

### 6.1 עצור את השרת
```powershell
# אם השרת רץ, עצור אותו
Stop-Process -Name "node" -Force
```

### 6.2 הפעל מחדש
```powershell
cd C:\Users\oran8\Desktop\leadrouting\lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts
npm run dev
```

### 6.3 המתן לטעינה
המתן עד שתראה:
```
🚀 Lead Routing API started on port 3000
```

---

## שלב 7: בדיקה

### 7.1 פתח את הדפדפן
```
http://localhost:5173/#register
```

### 7.2 וודא שרואה
- ✅ כפתור **"Register with Monday.com"**
- ✅ לא רואה שגיאה "OAuth Not Configured"

### 7.3 בדוק את התהליך
1. לחץ על **"Register with Monday.com"**
2. תועבר ל-Monday.com
3. אשר את ההרשאות
4. תחזור למערכת כמנהל של ארגון חדש

---

## פתרון בעיות נפוצות

### 🚨 שגיאה: "OAuth Not Configured"
**פתרון:**
1. וודא שקובץ `.env` קיים בתיקיית השורש
2. וודא שכל 3 המשתנים מוגדרים:
   - `MONDAY_OAUTH_CLIENT_ID`
   - `MONDAY_OAUTH_CLIENT_SECRET`
   - `MONDAY_OAUTH_REDIRECT_URI`
3. הפעל מחדש את השרת

### 🚨 שגיאה: "Invalid redirect_uri"
**פתרון:**
1. וודא שה-URL ב-`.env` זהה **בדיוק** ל-URL ב-Monday.com
2. שים לב ל-`http` vs `https`
3. שים לב ל-trailing slash (`/`)

### 🚨 שגיאה: "Invalid scope"
**פתרון:**
1. חזור לאפליקציה ב-Monday.com
2. בדוק שכל ההרשאות מסומנות
3. שמור שוב

### 🚨 שגיאה: "Invalid client_id"
**פתרון:**
1. וודא שהעתקת את ה-Client ID נכון (ללא רווחים)
2. וודא שהאפליקציה ב-Monday.com פעילה

---

## שאלות נפוצות

### ❓ האם חובה OAuth?
לא חובה, אבל מאוד מומלץ:
- מהיר יותר לרישום משתמשים
- מאובטח יותר
- חיבור אוטומטי ל-Monday.com

### ❓ מה קורה אם לא אגדיר?
אפשר עדיין:
- להתחבר עם Email/Password
- להגדיר Monday API Token ידנית
- לעבוד עם seed data

### ❓ האם זה בטוח?
כן! OAuth2 הוא תקן אבטחה מקובל.
- ה-Client Secret לא נחשף לדפדפן
- המשתמש אף פעם לא מזין סיסמה במערכת שלך
- ניתן לבטל גישה בכל עת

### ❓ כמה אפליקציות אפשר ליצור?
אין הגבלה, אבל בדרך כלל צריך רק אחת.

---

## סיכום Checklist

לפני שממשיך, וודא:
- ✅ יצרתי אפליקציה ב-Monday.com
- ✅ העתקתי Client ID ו-Secret
- ✅ הוספתי Redirect URI: `http://localhost:5173/register-org`
- ✅ בחרתי את כל ה-Scopes הנדרשים
- ✅ יצרתי קובץ `.env` עם הפרטים
- ✅ הפעלתי מחדש את השרת
- ✅ בדקתי שהכפתור מופיע בעמוד הרישום

אם הכל מסומן ✅ - כל הכבוד! המערכת מוכנה!

---

## תמיכה

אם נתקעת:
1. בדוק את ה-Backend Logs (טרמינל של השרת)
2. בדוק את ה-Browser Console (F12)
3. עיין ב-`OAUTH_SETUP_GUIDE.md` המקוצר
4. הרץ את `.\setup-oauth.ps1` שוב

---

**✨ בהצלחה! ✨**

