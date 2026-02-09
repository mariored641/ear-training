# Firebase Setup Guide - מדריך הגדרת Firebase

## מה זה Firebase?

Firebase הוא שירות של Google שמאפשר לשמור נתונים בענן בחינם. אנחנו משתמשים בו כדי לשמור פריסטים שכל המשתמשים יכולים לראות.

---

## שלב 1: יצירת פרויקט Firebase (חינמי)

### 1.1 היכנס ל-Firebase Console
1. גש ל: https://console.firebase.google.com/
2. התחבר עם חשבון Google (או צור אחד)

### 1.2 צור פרויקט חדש
1. לחץ על **"Add project"** (הוסף פרויקט)
2. תן שם לפרויקט: למשל `ear-training-app`
3. לחץ **Continue**
4. **Google Analytics**: תוכל לבחור "Not now" (לא עכשיו) או להפעיל אם תרצה
5. לחץ **Create project**
6. המתן כמה שניות עד שהפרויקט נוצר
7. לחץ **Continue**

---

## שלב 2: הפעלת Firestore Database

### 2.1 צור Firestore Database
1. בתפריט הצד, לחץ על **"Firestore Database"**
2. לחץ **"Create database"**
3. בחר **"Start in test mode"** (למעבר מהיר)
   - ⚠️ שים לב: במצב test, כולם יכולים לקרוא ולכתוב
   - בהמשך תוכל לשנות את הכללים
4. בחר מיקום: **us-central** או **europe-west** (קרוב יותר לישראל)
5. לחץ **Enable**

### 2.2 הגדר Security Rules (אופציונלי - לבטחה)
1. בתפריט Firestore, לחץ על **"Rules"**
2. החלף את הכללים ב:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read presets
    match /{collection}/{document} {
      allow read: if true;
      // Only allow writes (no password verification in rules - done in app)
      allow write: if true;
    }
  }
}
```

3. לחץ **Publish**

---

## שלב 3: קבל את פרטי ההתחברות

### 3.1 צור Web App
1. חזור לדף הבית של הפרויקט (לחץ על הסמל בצד עליון שמאל)
2. תחת "Get started by adding Firebase to your app", לחץ על הסמל **"Web"** (</>)
3. תן שם לאפליקציה: למשל `ear-training-web`
4. **אל תסמן** "Firebase Hosting"
5. לחץ **Register app**

### 3.2 העתק את פרטי ההתחברות
1. תראה מסך עם קוד JavaScript
2. העתק את האובייקט `firebaseConfig` - זה יראה בערך ככה:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

3. לחץ **Continue to console**

---

## שלב 4: הזן את הפרטים באפליקציה

### 4.1 פתח את קובץ ההגדרות
פתח את הקובץ:
```
src/config/firebase.js
```

### 4.2 החלף את הפרטים
מצא את השורות:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

והחלף אותן עם הפרטים שהעתקת בשלב 3.2.

### 4.3 שמור את הקובץ
שמור את הקובץ והאפליקציה תתחיל להשתמש ב-Firebase!

---

## בדיקה שהכל עובד

1. הרץ את האפליקציה: `npm run dev`
2. נווט ל-Rhythm Training
3. לחץ **"💾 Save Preset"**
4. שמור פריסט עם "Save for everyone" (עם הסיסמה)
5. פתח את Firebase Console > Firestore Database
6. תראה collection חדש עם הפריסט שלך!

---

## הסיסמה לשמירה גלובלית

הסיסמה כרגע היא: **CAGED**

אם תרצה לשנות אותה:
1. פתח את `src/utils/presetManager.js`
2. שנה את השורה:
```javascript
const GLOBAL_PRESET_PASSWORD = 'CAGED';
```

---

## מגבלות (כולן חינמיות!)

Firebase Free Tier כולל:
- ✅ 50,000 קריאות ליום
- ✅ 20,000 כתיבות ליום
- ✅ 1GB אחסון
- ✅ 10GB העברת נתונים חודשית

זה מספיק לאפליקציה שלך גם עם מאות משתמשים!

---

## פתרון בעיות

### שגיאה: "Firebase not initialized"
- בדוק שהעתקת נכון את כל הפרטים ל-`firebase.js`
- ודא שכל המפתחות קיימים (apiKey, projectId וכו')

### פריסטים לא מופיעים
- בדוק ש-Firestore Database מופעל (Test mode)
- בדוק ב-Console: צריך לראות collections
- פתח את Developer Tools בדפדפן (F12) ובדוק שגיאות

### "Permission denied"
- ודא ש-Security Rules מאפשרות read/write
- אם שינית את הכללים, פרסם אותם (Publish)

---

## אם אתה לא רוצה להשתמש ב-Firebase כרגע

זה בסדר! האפליקציה תעבוד גם בלי Firebase:
- פריסטים מקומיים (localStorage) יעבדו תמיד
- פריסטים גלובליים פשוט לא יהיו זמינים
- תראה הודעה ב-console אבל לא תהיה שגיאה

---

זהו! עכשיו אתה מוכן לשמור ולטעון פריסטים! 🎵
