# CLAUDE.md — Ear Training App
# קרא קובץ זה בתחילת כל סשן. הוא מחליף את הצורך לסרוק את הפרויקט.

---

## ⚠️ פעולה ראשונה חובה — בכל סשן, לפני כל דבר אחר

Claude Code פותח כל סשן בתוך git worktree מבודד. זה גורם לבעיות — שינויים לא מגיעים ל-main, והסשן הבא לא רואה אותם.

**לכן: הפעולה הראשונה בכל סשן היא:**

```bash
# 1. בדוק איפה אתה
git branch --show-current

# 2. אם אתה בworktree (branch שמתחיל ב-claude/ או worktree-) — בצע:
cd C:/Users/DELL/Documents/ear-training

# 3. בדוק אם יש שינויים לא-ממוזגים מworktrees קודמים
git log --oneline --all | head -20

# 4. אם יש commits בbranches שטרם הגיעו ל-main — מזג אותם:
git merge <branch-name>

# 5. עבוד מכאן ישירות על main — כל השינויים הולכים לתיקיה הראשית
```

**כלל עבודה:** כל עריכת קבצים תהיה על הנתיב `C:/Users/DELL/Documents/ear-training/src/...` — לא על נתיבי worktree.

---

## מה האפליקציה

אפליקציית אימון אוזן לתלמידי גיטרה של מריו. שם: "אלתור בהישג יד — האפליקציה".
Stack: React + Vite + Tone.js → deployed on Vercel via GitHub (main branch).
Local dev: `npm run dev` → `localhost:5173`
Production: https://ear-training-rose.vercel.app

**עיצוב עמוד הבית:** Constellation — hub (לוגו "מישר לנזמן") במרכז + 6 satellites רדיאליים, רקע aurora כהה.
הרקע חל *רק* על עמוד הבית (class `body.home-page-active` מוסר בניווט החוצה).
קובץ עיצוב מקורי: `design-mockup/redesign-v2.html` (mockup HTML מלא, לא נכנס ל-build).
**השלב הבא בעיצוב:** מיגרציה של עיצוב חטיבת הבאקינג טראקים מ-`design-mockup/v2-sections/backing-tracks.html`.
**השלב הבא ב-Backing Tracks:** Strum Filter (שלב 2 בתוכנית) — פילטור נוטות גיטרה על פי כיוון strum; נוגע ב-noteOn callbacks, לא לבצע בלי חקירה מקדימה.

---

## מבנה החטיבות — שמות רשמיים

האפליקציה מחולקת ל-6 חטיבות. השמות הבאים הם הרשמיים — השתמש בהם תמיד:

### חטיבות תרגול (לתלמידים)

**1. שמיעה מוזיקלית / Musical Ear Training** ← חטיבת-על מאוחדת (17 תרגילים)
- Hub Route: `/category/ear-training` → `ear-training/hub/EarTrainingHub.jsx`
- ⚠️ הכרטיסים הישנים `melodic` + `harmonic` הוסרו מ-HomePage. Routes ישנים נשמרו כ-fallback.

**תת-חטיבות ותרגילים:**

| תת-חטיבה | Route SubScreen | תרגילים | Files |
|---|---|---|---|
| 🎵 מלודיה (M) | `/category/ear-training/melodic` → `MelodicSubScreen` | M1 זיהוי דרגה (17 שלבים), M2 כיוון תנועה, M3 זיהוי סולם | `melodic/ExerciseM1/2/3.jsx` |
| 🎹 הרמוניה מבודדת (H) | `/category/ear-training/harmonic-isolated` → `HarmonicIsolatedSubScreen` | H1 אופי אקורד (6), H2 היפוך, H3 סוג אקורד, H4 טנשנים (7) | `harmonic-isolated/ExerciseH1-4.jsx` |
| 🎼 הרמוניה פונקציונלית (F) | `/category/ear-training/functional` → `FunctionalSubScreen` | F0 דרגת אקורד, F1 קדנצה, F2 הכתבה הרמונית (9), F3 ריתמוס, F4 מהלך מוכר | `functional/ExerciseF0-4.jsx` |
| 🎶 תנועת קול (V) | `/category/ear-training/voice-leading` → `VoiceLeadingSubScreen` | V1 קו בס, V2 קו סופרן | `voice-leading/ExerciseV1-2.jsx` |
| 🎤 סולפז' (S) | `/category/ear-training/solfege` → `SolfegeSubScreen` | S1 שירה מתווים, S2 זיהוי תיווי | `solfege/ExerciseS1-2.jsx` |
| 🎸 גיטרה (G) | `/category/ear-training/guitar` → `GuitarSubScreen` | G1 מיפוי צוואר (7 שלבים) | `guitar/ExerciseG1.jsx` |

**Routes תרגילים:** `/exercise/M1`, `/exercise/M2`, ... `/exercise/S2` (17 סה"כ)

**Shared components** (`ear-training/shared/`):
- `EarTrainingHeader` — כותרת עם LevelNavigator drawer, progress bar, כפתור חזרה
- `LevelNavigator` — drawer בחירת שלב + שמירה ב-localStorage
- `MultipleChoiceShell` — shell גנרי לתרגילי multiple-choice (רוב התרגילים)
- `FeedbackOverlay`, `SessionSummary`, `QuestionsCounter`
- `DegreeNameToggle` (I/IV/V ↔ C/F/G), `BinaryToggle`, `TernaryToggle`, `ChipSelector`
- `ReferencePlayer` — נגינת קדנצה/אקורד/תו כרפרנס

**Constants חדשים** (`src/constants/`):
- `cadenceDefinitions.js` — `chordAtDegree()`, `getCadence()`, 5 סוגי קדנצה × 12 מפתחות
- `progressionLibrary.js` — `KNOWN_PROGRESSIONS` (10 מהלכים), `PROGRESSIONS_BY_DIFFICULTY()`
- `scaleQualities.js` — `SCALE_INTERVALS` (23 סולמות), `SCALES_BY_LEVEL`, `SCALE_HEBREW_NAMES`
- `voicedProgressions.js` — 4 פרוגרשנים עם bass + soprano לתרגילי V1/V2
- `harmonicDefaults.js` הורחב: `EXTENDED_CHORDS` (264 אקורדים — 22 איכויות × 12 שורשים)

**HarmonicAudioPlayer** הורחב: `playCadence()`, `playInversion()`, `playWithEmphasis()`, `playWithTensions()`
**AudioPlayer** הורחב: `playScaleAscending(scaleName, tonic)`

**Fallback routes שנשמרו (לא לגעת!):**
- `/category/melodic`, `/category/harmonic`, `/exercise/1`, `/exercise/2`, `/exercise/4a/b/c`

---

**2. הכתבה / Dictation**
- Route: `/category/dictation` → `category/DictationCategoryScreen.jsx`
- תרגילים:
  - **Rhythmic Dictation** — `/rhythm-training` → `rhythm-training/RhythmTraining.jsx`
  - **Melodic Dictation** — `/exercise/3` → `exercise3/Exercise3.jsx`

---

### חטיבות כלים

**4. קצב / Rhythm Training**
- Route: `/exercise/4` (ישיר, ללא category screen)
- Component: `exercise4/Exercise4.jsx` (Rhythm Explorer)
- זהו: מטרונום + polyrhythm + rhythm explorer — כלי נגן, לא תרגיל הכתבה

**5. פוזיציות / Scale Positions**
- Route: `/positions`
- Component: `positions/ScalePositionsPage.jsx`
- כולל: Positions tab, Arpeggios tab, All Scales tab (under development)

**6. באקינג טראקס / Backing Tracks**
- Route: `/backing-tracks`
- Component: `backing-tracks/BackingTracksPage.jsx`
- ז'אנרים: 5 קטגוריות — Jazz (9), Latin (8), Blues (10), Rock & Pop (11), Country (8) — ~46 סגנונות
- Audio engine: BackingTrackEngine (FluidSynth WASM + JJazzLab SF2 + native JSON style format)
- ⚠️ **Yamaha .sty migration (commit 59d144a)**: production no longer parses .sty at runtime. ה-engine קורא `/styles-native/<category>/<id>.json` דרך `src/lib/style-engine/StyleLoader.js`. הקבצים הילידיים נוצרו ב-`scripts/sty-to-native.mjs` (parity verified by `scripts/verify-native-parity.mjs` — 48/48). קבצי .sty המקוריים נשארים מקומית בלבד (לא בגיט; `.gitignore` חוסם `*.sty/STY/prs/sst/bcs`). `StyleParser.js` נשאר בקוד עבור file-upload tests בלבד.
- **Skills קשורים** (ב-`~/.claude/skills/`): `sty-clone` (שכפול .sty חיצוני → JSON), `genre-style-builder` (יצירת סטייל מאפס + הנחיה לאבלטון).
- **Level 2 deferred features**: `docs/jjazzlab-engine/LEVEL2_DEFERRED.md` — מה הפרסר קולט אבל ה-engine לא משתמש (ctb2Low/High, NTT scale variants וכו'). יש script רענון: `node scripts/analyze-level2.mjs`.
- Hook מרכזי: `backing-tracks/useBackingTrackEngine.js`
- מנוע: `lib/style-engine/` (BackingTrackEngine, StyleLoader, ChordEngine, Humanizer, StyleParser ← legacy file-upload only)
- **Count-in**: תמיד פועל — הכפתור הוסר, `skipIntro` תמיד `false`
- **Genre Instrument Map**: `src/constants/genreInstrumentMap.js` — מפת GM programs לכל ז'אנר
  - jazz → Acoustic Bass (32), Jazz Guitar (26), Acoustic Grand (0), Jazz Drums (32)
  - rock → Electric Bass Pick (34), Overdriven Guitar (29), Electric Grand (2), Power Drums (16)
  - latin/blues/country — overrides דומים לפי קטגוריה + per-id overrides
  - biab ז'אנרים → מחזירים `null` (שומרים programs של ה-.sty המקורי)
  - ⚠️ drums (channel 9) לא נוגעים — drum kits ב-GM bank 128, לא bank 0
  - `applyInstrumentOverrides(genreId)` נקרא ב-`play()` אחרי טעינת SF2
- **Guitar register fix** (`lib/style-engine/Transposer.js`):
  - BYPASS+ROOT_TRANSPOSITION על ערוצי CHORD1/CHORD2: מוריד את noteHighLimit ב-3st לפני clampAll
  - מבטיח שכל טונות האקורד (root/3rd/5th/7th, span ≤10st) מתקפלות לאותו octave register
  - ה-G chord שנשמע טוב נשמר בדיוק — C ו-F מתיישרים לאותו register
- **Preset Library**: `backing-tracks/PresetLibrary.jsx` — פאנל נשלף עם 1460 Jazz Standards
  - נתונים: `public/data/jazz-standards.json` (נוצר מ-`scripts/parse-ireal.cjs`)
  - חיפוש לפי שם / מלחין, מועדפים ב-localStorage
  - auto-switch ל-jazz_waltz עבור שירי 3/4 ו-6/4
  - טמפו מחושב לפי שם הסגנון (Ballad=60, Medium Swing=130 וכו')
  - כל אקורד תומך ב-`beats: 2` (חצי בר) — מוצג side-by-side ב-ChordProgressionEditor
  - MAX_BARS הוגדל ל-64
- **משימה פתוחה**: תמיכה במשקלים 5/4, 6/8, 7/4 דורשת .sty files נוספים מ-JJazzLab
- **Live Fretboard**: `backing-tracks/LiveFretboard.jsx` — פאנל צוואר אינטראקטיבי מתחת לפרוגרשן
  - מציג נקודות סולם (אפור) + עיגולי ארפג'ו (cyan) בזמן אמת עם האקורד המנוגן
  - Root selector: Auto (עוקב אחר שורש האקורד) או קבוע
  - Scale selector: כל הסולמות מ-allScalesData
  - Polyscale mode: סולם + שורש נפרד לכל אקורד בפרוגרשן
  - משתמש ב-`AllScalesFretboard` מחטיבת הפוזיציות (ייבוא, לא שכפול)
- **Key Selector**: כפתור קומפקטי "🎹 C Maj" בשורת bars/layout → dropdown לבחירת root + Major/Minor
  - state: `selectedKey = { root: 'C', type: 'major' }` ב-`useBackingTrackEngine`
  - כל הפרסטים מאוחסנים ב-C Major — `loadPreset` מטרנספוז אוטומטית לkey הנוכחי
  - Major→Minor = +3 semitones (C Maj: Dm-G-C → C Min: Fm-Bb-Eb)
  - Minor→Major = −3 semitones
  - Enharmonic naming: מפתחות שטוחים → שמות שטוחים (Db, Eb…), דיאזים → שמות דיאז (C#, D#…)
  - פונקציות עזר ב-`useBackingTrackEngine.js`: `transposeChordProgression`, `noteNamesForKey`, `transposeNoteName`
- **SF2 Library Lab** (נסתר): `/test/sf2-lab` → `sf2-lab/Sf2LabPage.jsx`
  - דשבורד A/B להשוואת ספריות SoundFont (JJazzLab / FluidR3 / GeneralUser / Arachno)
  - מחליף SF2 בזמן ריצה דרך `SFP.swapSoundFont(libraryConfig, onProgress)`
  - registry: `src/lib/soundfont/SoundFontRegistry.js` — להוסיף ספרייה חדשה: עדכון רשימה + `VITE_SF2_URL_<ID>` ב-`.env.local`
  - דירוגים + הערות נשמרים ב-localStorage תחת `sf2-lab:ratings:<libId>` / `sf2-lab:notes:<libId>`
  - לא משפיע על `/backing-tracks` — מנוע מקומי משלו

**7. פידבק / Feedback**
- Route: `/feedback` (ישיר, ללא category screen)
- Component: `feedback/FeedbackPage.jsx`
- מטרה: התלמיד מקליט את עצמו מנגן על גבי באקינג טראק מיוטיוב ושולח למישר
- שלושה מסכים בקובץ אחד:
  - `PrepScreen` — שדה קישור YouTube + בקשת הרשאות מצלמה/מיקרופון
  - `RecordingScreen` — YouTube IFrame API + PiP גרירה + מד רמות + כפתור REC
  - `PreviewScreen` — player + שמירה לגלריה + Web Share API
- טכנולוגיות: MediaRecorder API, getUserMedia, Web Audio AnalyserNode, YouTube IFrame API, Web Share API
- אין שרת, אין DB — הכל client-side

---

## ארכיטקטורת Audio

| חטיבה | Player | סמפלים |
|---|---|---|
| שמיעה מוזיקלית — מלודי/סולפז'/גיטרה | `utils/AudioPlayer.js` | Salamander piano + gleitz guitar |
| שמיעה מוזיקלית — הרמוניה/פונקציונלי/תנועת קול | `utils/HarmonicAudioPlayer.js` | Salamander piano + gleitz guitar |
| קצב | `utils/RhythmAudioPlayer.js` | Tone.js synths (click/woodblock) |
| הכתבה ריתמית | `utils/rhythmTrainingAudio.js` | woodblock / bass / drums |
| באקינג טראקס | `lib/style-engine/BackingTrackEngine.js` | JJazzLab SF2 (FluidSynth WASM) |

---

## כללי עבודה

- **"דחוף לגיטהאב"** = `git add <קבצים ספציפיים> && git commit -m "..." && git push origin main` (מתוך `C:/Users/DELL/Documents/ear-training`)
- ⚠️ **אל תשתמש ב-`git add .`** — יש בפרויקט קובץ `nul` (שם שמור ב-Windows) ו-worktrees מוטמעים שגורמים לשגיאה. תמיד ציין קבצים ספציפיים
- לפני push — הרץ `npm run build`. אל תדחוף קוד שבור
- **אל תסרוק את הפרויקט בתחילת סשן** — קרא את CLAUDE.md הזה ותתחיל לעבוד
- קרא קבצים רק אם הם ישירות רלוונטיים לשינוי המבוקש
- דווח בעברית בקצרה: מה שינית + האם הבניה עברה

---

## מבנה תיקיות מרכזי

```
src/
  App.jsx                          ← Routes הראשיות (17 תרגילים + 6 sub-screens + legacy)
  components/
    home/HomePage.jsx              ← עמוד בית — עיצוב Constellation (hub + 6 satellites, aurora bg)
    category/
      MelodicCategoryScreen.jsx    ← legacy fallback (לא בשימוש מ-HomePage)
      HarmonicCategoryScreen.jsx   ← legacy fallback (לא בשימוש מ-HomePage)
      DictationCategoryScreen.jsx  ← חטיבת הכתבה
    ear-training/                  ← ⭐ החטיבה החדשה — שמיעה מוזיקלית
      hub/EarTrainingHub.jsx       ← 6 כרטיסי תת-חטיבה
      shared/                      ← רכיבים משותפים לכל 17 תרגילים
        EarTrainingHeader.jsx, LevelNavigator.jsx, MultipleChoiceShell.jsx
        FeedbackOverlay.jsx, SessionSummary.jsx, QuestionsCounter.jsx
        DegreeNameToggle.jsx, BinaryToggle.jsx, TernaryToggle.jsx
        ChipSelector.jsx, ReferencePlayer.jsx, earTrainingShared.css
      melodic/
        MelodicSubScreen.jsx, ExerciseM1.jsx, ExerciseM2.jsx, ExerciseM3.jsx
      harmonic-isolated/
        HarmonicIsolatedSubScreen.jsx, ExerciseH1.jsx, ExerciseH2.jsx
        ExerciseH3.jsx, ExerciseH4.jsx
      functional/
        FunctionalSubScreen.jsx, ExerciseF0.jsx, ExerciseF1.jsx, ExerciseF2.jsx
        ExerciseF3.jsx, ExerciseF4.jsx
      voice-leading/
        VoiceLeadingSubScreen.jsx, ExerciseV1.jsx, ExerciseV2.jsx
      solfege/
        SolfegeSubScreen.jsx, ExerciseS1.jsx, ExerciseS2.jsx
      guitar/
        GuitarSubScreen.jsx, ExerciseG1.jsx
    exercise1/Exercise1.jsx        ← Tonal Code (legacy)
    exercise2/Exercise2.jsx        ← Fretboard Mapping (legacy)
    exercise3/Exercise3.jsx        ← Melodic Dictation
    exercise4/Exercise4.jsx        ← Rhythm Explorer (כלי)
    exercise4a/Exercise4A.jsx      ← Relative Harmony (legacy)
    exercise4b/Exercise4B.jsx      ← Chord Tones (legacy)
    exercise4c/Exercise4C.jsx      ← Chord Progressions (legacy)
    rhythm-training/RhythmTraining.jsx  ← Rhythmic Dictation
    positions/ScalePositionsPage.jsx    ← Scale Positions
    backing-tracks/BackingTracksPage.jsx
    feedback/FeedbackPage.jsx          ← Feedback (PrepScreen + RecordingScreen + PreviewScreen)
  lib/backing-tracks/              ← לוגיקת Backing Tracks
  utils/                           ← Audio players (AudioPlayer, HarmonicAudioPlayer, ...)
  constants/
    harmonicDefaults.js            ← CHORD_DEFINITIONS + EXTENDED_CHORDS (264 אקורדים)
    cadenceDefinitions.js          ← ⭐ חדש — קדנצות לפי מפתח
    progressionLibrary.js          ← ⭐ חדש — KNOWN_PROGRESSIONS (10 מהלכים)
    scaleQualities.js              ← ⭐ חדש — SCALE_INTERVALS (23 סולמות)
    voicedProgressions.js          ← ⭐ חדש — bass + soprano לV1/V2
    allScalesData.js, notes.js, ... ← קיימים
```
