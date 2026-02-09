# מערכת פריסטים - Rhythm Training

## מה זה?

מערכת שמאפשרת לשמור ולטעון דפוסי קצב מוגדרים מראש ב-Rhythm Training.

---

## איך זה עובד?

### 🔵 שני סוגי פריסטים:

#### 1. **פריסטים מקומיים** 💾 (רק אצלי)
- נשמרים **רק במחשב שלך** (localStorage)
- אף אחד אחר לא רואה אותם
- נשארים גם אחרי סגירת הדפדפן
- מושלם לתרגול אישי

#### 2. **פריסטים גלובליים** 🌍 (לכולם)
- נשמרים **ב-Firebase** (ענן של Google)
- **כל המשתמשים** באפליקציה רואים אותם
- דורש **סיסמה**: `CAGED`
- מושלם למורה שרוצה לשתף עם תלמידים

---

## איך משתמשים?

### ✅ שמירת פריסט

1. **בנה קצב** - לחץ על התאים, הגדר ביטים, subdivision, BPM
2. **לחץ "💾 Save Preset"**
3. **תן שם** - למשל "Bossa Nova 140"
4. **בחר סוג**:
   - ⚪ **"Save only for me"** → שמור רק במחשב שלי
   - ⚪ **"Save for everyone"** → שמור לכולם (דורש סיסמה `CAGED`)
5. **לחץ "Save"**

### ✅ טעינת פריסט

1. **לחץ "📋 Load Preset"**
2. **תראה רשימה** של כל הפריסטים:
   - 🌍 **Global Presets** - פריסטים גלובליים (מהמורה)
   - 💾 **My Presets** - הפריסטים שלי
3. **לחץ על פריסט** - והוא ייטען מיד!

---

## איפה זה עובד?

### 📍 Rhythm Explorer (טאב ראשון)
- כפתורים בפאנל הימני למטה
- שומר: grid, beats, subdivision, timeSignature, BPM

### 📍 Advanced Subdivisions (טאב שלישי)
- כפתורים בכותרת העליונה
- שומר: beats (length, division, cells), BPM

---

## הסיסמה לשמירה גלובלית

**הסיסמה:** `CAGED`

### כיצד לשנות את הסיסמה?
1. פתח את הקובץ: `src/utils/presetManager.js`
2. מצא את השורה:
   ```javascript
   const GLOBAL_PRESET_PASSWORD = 'CAGED';
   ```
3. שנה ל: `const GLOBAL_PRESET_PASSWORD = 'הסיסמה_החדשה';`
4. שמור והאפליקציה תתעדכן

---

## הגדרת Firebase (לפריסטים גלובליים)

כדי שפריסטים גלובליים יעבדו, צריך להגדיר Firebase:

👉 **ראה מדריך מלא ב: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

### תקציר מהיר:
1. צור פרויקט ב-https://console.firebase.google.com/
2. הפעל Firestore Database (Test mode)
3. קבל את פרטי ההתחברות
4. הדבק אותם ב-`src/config/firebase.js`

**זה חינמי לגמרי!** (עד 50,000 קריאות ליום)

---

## מה אם לא מגדירים Firebase?

**זה בסדר!** האפליקציה תעבוד:
- ✅ פריסטים מקומיים יעבדו תמיד
- ❌ פריסטים גלובליים לא יהיו זמינים
- תראה הודעה ב-console אבל לא שגיאה

---

## קבצים טכניים (לפיתוח)

```
src/
├── config/
│   └── firebase.js              # הגדרות Firebase
├── utils/
│   └── presetManager.js         # ניהול פריסטים (localStorage + Firebase)
├── components/exercise4/
│   ├── RhythmExplorer.jsx       # טאב 1 - עם Save/Load
│   └── AdvancedSubdivisions.jsx # טאב 3 - עם Save/Load
└── constants/
    └── exercise4Defaults.js     # קבועים (PRESET_TYPES)
```

---

## דוגמה - תהליך מלא

### סיטואציה: מורה רוצה לשתף מקצב עם התלמידים

1. **המורה בונה מקצב:**
   - נכנס ל-Rhythm Explorer
   - מגדיר 4/4, subdivision 2
   - לוחץ על תאים ליצירת Bossa Nova
   - מגדיר BPM 140

2. **המורה שומר:**
   - לוחץ "💾 Save Preset"
   - שם: "Bossa Nova מתקדם"
   - בוחר: "🌍 Save for everyone"
   - מזין סיסמה: `CAGED`
   - לוחץ "Save"
   - **מקבל הודעה:** "Preset saved successfully!"

3. **תלמיד טוען:**
   - נכנס לאפליקציה
   - לוחץ "📋 Load Preset"
   - רואה תחת "🌍 Global Presets":
     - **"Bossa Nova מתקדם"** - 4/4 • 4 beats • 140 BPM
   - לוחץ עליו
   - **המקצב נטען מיד!** 🎵

---

## פתרון בעיות

### ❓ "הפריסט לא נשמר"
- בדוק ששדה השם לא ריק
- אם גלובלי: בדוק שהסיסמה נכונה (`CAGED`)
- פתח Developer Tools (F12) ובדוק שגיאות

### ❓ "פריסטים גלובליים לא מופיעים"
- ודא ש-Firebase מוגדר (ראה FIREBASE_SETUP.md)
- בדוק את ה-console לשגיאות Firebase
- אם אין Firebase - זה תקין, רק מקומיים יעבדו

### ❓ "איבדתי את הפריסטים המקומיים שלי"
- פריסטים מקומיים נשמרים ב-localStorage
- אם ניקית cookies/cache - הם נמחקו
- פריסטים גלובליים נשמרים בענן - לא נמחקים

---

זהו! עכשיו אפשר ליצור ולשתף מקצבים בקלות! 🎵
