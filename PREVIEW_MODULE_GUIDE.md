# 🔮 Preview Module - מדריך שימוש ובדיקה

## מה זה מודול ה-Preview?

מודול Preview הוא כלי חזק שמאפשר לארגונים חדשים לראות **מה היה קורה** אם מערכת הניתוב הייתה פעילה בעבר. זה עוזר למשתמשים:
- להבין את היכולות של המערכת
- לראות שיפור פוטנציאלי ב-Success Rate
- לבנות אמון במערכת לפני הפעלתה

---

## 🎯 תכונות עיקריות

### 1. ניתוח היסטורי
- ✅ שליפת leads מ-30/60/90 ימים אחורה
- ✅ הרצת מנוע הניתוב על כל lead
- ✅ חישוב ציונים והמלצות
- ✅ הגבלה ל-500 leads מקסימום

### 2. השוואת Success Rates
- **System Success Rate:** מה היה קורה אם היו עוקבים אחרי המערכת
- **Current Success Rate:** המצב הנוכחי (שיוכים ידניים)
- **Improvement:** ההפרש בנקודות אחוז

### 3. ויזואליזציות
- 📊 גרפים עגולים (pie charts) להשוואת Success Rate
- 📈 גרפי עמודות להתפלגות Leads
- 📋 טבלה מפורטת של כל lead

### 4. סינונים
- סינון לפי תעשייה (Industry)
- סינון לפי סטטוס (Closed Won / Open)

---

## 📝 איך להשתמש

### צעד 1: התחבר למערכת
1. היכנס עם Monday.com OAuth
2. ודא שיש חיבור פעיל ל-Monday.com

### צעד 2: הגדר Field Mapping
**חשוב!** לפני שתוכל להשתמש ב-Preview, צריך להגדיר:
- ✅ Lead Boards (איזה boards מכילים leads)
- ✅ Closed Won Status Column + Value (איך מזהים עסקה שנסגרה)
- ✅ Assigned People Column (מי משוייך לכל lead)
- ✅ Industry Column (אופציונלי, לשיוך לפי תעשייה)

### צעד 3: הפעל מחשוב מדדים
1. לך ל-Admin → Metrics Configuration
2. לחץ על "🔄 Recompute Metrics"
3. המתן עד שהמחשוב יסתיים (יכול לקחת 1-2 דקות)

### צעד 4: פתח את מודול ה-Preview
1. לחץ על כפתור "🔮 Preview" בתפריט העליון
2. בחר חלון זמן: 30, 60 או 90 ימים
3. לחץ "🔄 רענן" כדי לטעון את הנתונים

---

## 🧪 בדיקות שבוצעו

### ✅ Backend Tests
- [x] Endpoint `/preview/historical` נוצר בהצלחה
- [x] Route נוסף ל-`index.ts` עם middleware `requireApiKey`
- [x] Validation של input (30/60/90 בלבד)
- [x] שליפת leads מ-LeadFact database
- [x] הגבלה ל-500 leads
- [x] חישוב ציונים לכל lead
- [x] חישוב Success Rates
- [x] טיפול בשגיאות

### ✅ Frontend Tests
- [x] `fetchHistoricalPreview()` נוסף ל-`api.ts`
- [x] TypeScript interfaces מוגדרים נכון
- [x] `PreviewScreen.tsx` נוצר עם כל הקומפוננטות
- [x] Navigation נוסף ל-`App.tsx`
- [x] Lazy loading של הקומפוננטה
- [x] Dark mode support
- [x] RTL support (עברית)
- [x] Responsive design

### ✅ Visual Tests
- [x] כרטיסי KPI מוצגים נכון
- [x] גרפים עגולים (Success Rate comparison)
- [x] גרפי התפלגות (Lead distribution)
- [x] טבלה עם scroll
- [x] סינונים עובדים
- [x] הודעות שגיאה
- [x] מצב טעינה (loading)
- [x] Empty state

### ⚠️ Tests שדורשים נתונים אמיתיים (למשתמש לבדוק):
1. **טען 30 ימים אחורה** - בדוק שהנתונים מוצגים נכון
2. **טען 60 ימים אחורה** - בדוק שמספר ה-leads משתנה
3. **טען 90 ימים אחורה** - בדוק שההגבלה ל-500 leads עובדת
4. **סנן לפי תעשייה** - בדוק שהסינון עובד
5. **סנן לפי סטטוס** - בדוק Closed Won / Open
6. **בדוק Success Rates** - האם המספרים הגיוניים?

---

## 🐛 בעיות אפשריות ופתרונות

### בעיה: "LEAD_BOARDS_NOT_CONFIGURED"
**פתרון:** לך ל-Field Mapping והגדר לפחות board אחד

### בעיה: "לא נמצאו leads"
**אפשרויות:**
1. אין leads בטווח התאריכים שנבחר
2. ה-LeadFact table ריקה - הרץ Metrics Job
3. הבורד שהוגדר לא מכיל items

### בעיה: Success Rate = 0%
**אפשרויות:**
1. לא הוגדר Closed Won Status ב-Field Mapping
2. אין leads שנסגרו בטווח הזמן שנבחר
3. לא הוגדר Assigned People Column

### בעיה: "No agents with metrics"
**פתרון:** הרץ Metrics Computation לפחות פעם אחת

### בעיה: הטבלה ריקה אבל Summary מראה leads
**פתרון:** בדוק שהסינונים לא מסננים את כל ה-leads

---

## 📊 מה המספרים אומרים?

### Total Leads
סה"כ leads שנכנסו למערכת בחלון הזמן שנבחר (30/60/90 ימים)

### Routed Leads
כמה leads המערכת הייתה מצליחה לנתב (יש להם ציונים)
- **100%** = מצוין! המערכת יכולה לטפל בכל ה-leads
- **< 80%** = אולי חסרים agents או metrics

### System Success Rate
מה היה קורה אם כל ההמלצות היו מאושרות
- **גבוה מ-Current** = המערכת יכולה לשפר!
- **זהה ל-Current** = המערכת תומכת בתהליך הנוכחי
- **נמוך מ-Current** = צריך לבדוק את ה-KPI weights

### Improvement
ההפרש בין System ל-Current
- **חיובי** (+) = המערכת משפרת
- **שלילי** (-) = צריך התאמות
- **0** = אין שינוי

---

## 🔧 קונפיגורציה נוספת

### שינוי ערכי Reference (Backend)
בקובץ `.env` ניתן להגדיר:

```env
# Preview Module Configuration
PREVIEW_AVG_DEAL_REF=20000        # Reference value for deal normalization
PREVIEW_RESPONSE_REF_MINS=240     # Reference value for response time (4 hours)
```

### הוספת עמודות לטבלה
ערוך את `PreviewScreen.tsx` והוסף `<th>` ו-`<td>` חדשים

### שינוי צבעי הגרפים
ערוך את ה-`style` objects בתוך הגרפים (conic-gradient, background colors)

---

## 📖 קישורים נוספים

- [routing-preview.md](../docs/10_routing/routing-preview.md) - תיעוד מקורי
- [success-metrics.md](../docs/40_metrics/success-metrics.md) - הסבר על מדדי הצלחה
- [routing.engine.ts](../packages/modules/routing-engine/src/application/routing.engine.ts) - לוגיקת חישוב הציונים

---

## ✨ תכונות עתידיות (Nice to Have)

- [ ] ייצוא ל-CSV
- [ ] השוואה בין חלונות זמן (30 vs 60 vs 90)
- [ ] Confidence Score לכל המלצה
- [ ] גרפים נוספים (per-agent performance)
- [ ] Drill-down על lead ספציפי
- [ ] אנימציות מתקדמות
- [ ] Cache תוצאות ב-localStorage

---

**הערה:** זהו מודול סימולציה בלבד. אין לו שום השפעה על נתונים ב-Monday.com או במערכת.

