# ✨ Monday Connection Check - Implementation

## 🎯 מה בוצע:

הוספנו **הודעה ידידותית ומפורטת** בעמודים שדורשים חיבור ל-Monday.com:

### 📄 קבצים שנוצרו:

1. **`MondayNotConnected.tsx`** - קומפוננט הודעה מעוצב
2. **`hooks/useMondayConnection.ts`** - Hook לבדיקת חיבור Monday

### 📝 עמודים שעודכנו:

1. ✅ **ManagerScreen** - עמוד Manager
2. ✅ **OutcomesScreen** - עמוד Outcomes
3. ✅ **PerformanceDashboard** - עמוד Performance

---

## 🎨 איך זה נראה:

כשאין חיבור ל-Monday.com, המשתמש יראה:

```
╔══════════════════════════════════════════════╗
║       🔔 Monday.com API Key Required        ║
║                                              ║
║  You need to add your Monday.com API key    ║
║  to use the [Manager/Outcomes/Performance]  ║
║                                              ║
║  📋 How to get your Monday.com API Key:     ║
║                                              ║
║  1. Log in to your Monday.com account       ║
║  2. Click on your profile picture           ║
║  3. Select Developers → My Access Tokens    ║
║  4. Click "Generate" or "Show"              ║
║  5. Copy the token                          ║
║                                              ║
║  [⚙️ Go to Admin → Connect Monday.com]      ║
╚══════════════════════════════════════════════╝
```

---

## ✨ תכונות:

### 1. **הודעה ברורה**
- כותרת גדולה: "Monday.com API Key Required"
- הסבר מדוע צריך API Key
- שם העמוד הספציפי (Manager/Outcomes/Performance)

### 2. **הוראות צעד-אחר-צעד**
מדריך מפורט איך לקבל API Token:
1. Login ל-Monday.com
2. Profile picture → Developers
3. My Access Tokens
4. Generate/Show
5. Copy

### 3. **כפתור פעולה**
כפתור מעוצב: **"Go to Admin → Connect Monday.com"**
- לוקח ישירות לעמוד Admin
- עיצוב gradient כחול-סגול
- אייקון הגדרות

### 4. **לינק לתיעוד**
לינק ישיר לתיעוד הרשמי של Monday.com API

### 5. **Dark Mode Support**
תומך במצב Dark/Light באופן אוטומטי

---

## 🔧 איך זה עובד טכנית:

### Hook: `useMondayConnection`

```typescript
const { isConnected, loading } = useMondayConnection();

if (loading) {
  return <LoadingSkeleton />;
}

if (isConnected === false) {
  return <MondayNotConnected pageName="Manager" />;
}

// ... render main content
```

### Flow:
1. Hook קורא ל-`/admin/monday/status`
2. בודק אם `connected: true`
3. אם **לא מחובר** → מציג `MondayNotConnected`
4. אם **מחובר** → מציג את התוכן הרגיל

---

## 📊 עמודים שמוגנים:

| עמוד | סטטוס | הודעה |
|------|-------|-------|
| **Manager** | ✅ מוגן | "You need to add your API key to use the Manager page" |
| **Outcomes** | ✅ מוגן | "You need to add your API key to use the Outcomes page" |
| **Performance** | ✅ מוגן | "You need to add your API key to use the Performance page" |
| **Admin** | ❌ לא מוגן | צריך להיות נגיש כדי לחבר! |
| **Field Mapping** | ❌ לא מוגן | מציג warning אבל לא חוסם |

---

## 🎯 חווית משתמש:

### לפני:
```
❌ Error loading users: Failed to fetch
❌ Error loading proposals: Failed to fetch
❌ שגיאות אדומות בכל מקום
```

### אחרי:
```
✅ הודעה ידידותית וברורה
✅ הוראות צעד-אחר-צעד
✅ כפתור ישיר לפתרון
✅ לינק לתיעוד
```

---

## 🚀 מה הלאה:

1. ✅ **Login** - מוכן!
2. ⏭️ **חבר Monday.com** ← **אתה כאן!**
   - לך ל-Admin
   - הזן API Token
   - לחץ Connect
3. ⏭️ **Field Mapping**
4. ⏭️ **Routing Rules**
5. ⏭️ **Enable Routing**

---

## 📱 צילום מסך (תיאור):

```
┌────────────────────────────────────────┐
│  [!] Monday.com API Key Required       │
│                                        │
│  You need to add your Monday.com API   │
│  key to use the Manager page.          │
│                                        │
│  Without an API connection, we cannot  │
│  fetch or display data from Monday.com │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📋 How to get your API Key:      │ │
│  │ 1. Log in to Monday.com          │ │
│  │ 2. Profile → Developers          │ │
│  │ 3. My Access Tokens              │ │
│  │ 4. Generate/Show                 │ │
│  │ 5. Copy the token                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [⚙️ Go to Admin → Connect Monday.com] │
│                                        │
│  Need help? Check the Monday.com API   │
│  Documentation →                       │
└────────────────────────────────────────┘
```

---

## ✅ הכל מוכן!

רענן את הדפדפן וגש לעמוד Manager/Outcomes/Performance.

**תראה הודעה מעוצבת עם הוראות ברורות!** 🎉

