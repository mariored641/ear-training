# מנוע Backing Tracks — מסמך אפיון
# "JJazzLab שלנו" — ממנוע Tone.js למנוע SoundFont+Style מלא

> מסמך זה מתעד את כל שלבי הפרויקט, מה שהושלם ומה שנשאר.
> לעדכן בתחילת כל שלב חדש.

---

## הרקע

### מצב נוכחי (נקודת המוצא)
- חטיבת Backing Tracks באפליקציה `ear-training` מבוססת על **Tone.js Samplers**
- סמפלים: Salamander piano + MusyngKite guitars + Kit8 drums
- פטרנים: כתובים ידנית ב-JS (`patterns/jazz|blues|rock|country.js`)
- בעיות: סאונד מתכתי/סינתטי, פטרנים סטטיים, אין הומניזציה, אין גיוון אמיתי

### Endgame — מה נרצה להגיע אליו
- **סאונד** כמו JJazzLab — SoundFont SF2 אמיתי, ללא מתכתיות
- **פטרנים** עשירים עם גיוון — intro, main A/B, fills, ending — לכל ז'אנר
- **הומניזציה** — velocity variations, timing microvariations על הגריד
- **ידיעה מלאה** של האפליקציה בכל שלב: איזה אקורד, איזה beat, מה הולך לבוא
- **ללא תלות חיצונית** — הכל רץ בדפדפן, ללא round-trip, ללא דיליי
- **הרחבה קלה** — להוסיף ז'אנר חדש = להוסיף קובץ `.sty` אחד
- **אינטגרציה** עם תרגילי האוזן האחרים (אקורד נוכחי, cue לתלמיד)

---

## ארכיטקטורת המנוע החדש

```
קובץ .sty (Yamaha Style)
        ↓
   [STY Parser]           ← JS, רץ once בטעינה
        ↓
  Pattern Data (JSON)     ← major/minor/dom7 patterns לכל כלי
        ↓
  [Chord→Pattern Engine]  ← מקבל: אקורד + beat → מוציא: MIDI notes
        ↓
  [Humanizer]             ← מוסיף velocity/timing variations
        ↓
  [SoundFont Player]      ← SF2 + Web Audio API → סאונד אמיתי
        ↓
  [Event Emitter]         ← האפליקציה יודעת: chord, beat, nextChord
```

---

## שלבי הפרויקט

---

### שלב 0 — ניתוח קוד JJazzLab
**סטטוס:** ✅ הושלם

**מה נעשה:**
- נקראו 9 קבצי Java קריטיים מ-`C:\Users\DELL\Documents\JJazzLab`
- הובנה הארכיטקטורה המלאה: STY parser, CTAB, AccTypes, NTR/NTT, Humanizer
- נכתב `JJAZZLAB_ANALYSIS.md` — מסמך מלא של הלוגיקה המוסיקלית

**תוצרים:**
- [x] `JJAZZLAB_ANALYSIS.md` — מסמך הבנה מלא
- [x] מפת קבצי Java קריטיים לפי שלב (מפורטת ב-ANALYSIS)

**⚠️ הוראה לסשנים הבאים:** קרא `JJAZZLAB_ANALYSIS.md` — **אל תסרוק Java ישירות** אלא אם המסמך מציין שנדרש עומק נוסף לשלב ספציפי.

---

### שלב 1 — SoundFont Player
**סטטוס:** ✅ הושלם — אישור שמיעתי: ✅ "נשמע מעולה"

**החלטות שנקבעו:**
- **ספרייה:** `js-synthesizer` v1.11.0 (FluidSynth 2.4.6 compiled to JS/WASM)
- **SF2:** `C:\Program Files\JJazzLab\jjazzlab\modules\soundfont\JJazzLab-SoundFont.sf2` (341MB)
- **בפיתוח:** Vite middleware מגיש SF2 ישירות מ-JJazzLab (ללא העתקה)
- **SF2 בproduction:** לטפל בשלב 6 (CDN / SF2 קטן יותר)

**תוצרים:**
- [x] `src/lib/soundfont/SoundFontPlayer.js` — wrapper נקי
- [x] `src/components/soundfont-test/SoundFontTest.jsx` — דף בדיקה
- [x] Route: `/soundfont-test`
- [x] `public/libfluidsynth-2.4.6.js` — FluidSynth engine (559KB)
- [x] `vite.config.js` — middleware לשרת SF2 מ-JJazzLab
- [x] **אישור שמיעתי:** ✅ "נשמע מעולה"

**API של SoundFontPlayer:**
```javascript
import * as SFP from './lib/soundfont/SoundFontPlayer'
await SFP.init(onProgress)          // טוען SF2 עם progress
SFP.programChange(channel, program) // שינוי כלי
SFP.noteOn(channel, midi, velocity) // הפעל note
SFP.noteOff(channel, midi)          // עצור note
SFP.allNotesOff()                   // שתיקה מלאה
SFP.setGain(0.0-10.0)               // עוצמה
SFP.CHANNELS.{PIANO,BASS,GUITAR,DRUMS,...}
SFP.GM.{ACOUSTIC_GRAND_PIANO,...}
```

**קבצי Java לקרוא:** לא נדרש — שלב JS בלבד.

---

### שלב 2 — Yamaha Style Parser
**סטטוס:** ✅ הושלם — אישור פרסור: ✅ Jazz Waltz Fast + Bossa Nova

**מה Claude Code עושה:**
- קורא `JJAZZLAB_ANALYSIS.md` → סעיף "מבנה קובץ .sty" ו-"תהליך parsing"
- קורא Java (אם נדרש עומק): `CASMDataReader.java`, `MPL_MusicData.java`
- כותב `lib/style-engine/StyleParser.js` — קורא `.sty` binary ומוציא JSON
- בודק על 2-3 קבצי `.sty` מ-JJazzLab

**מבנה ה-JSON הצפוי:**
```json
{
  "name": "Jazz Swing",
  "tempo": 130,
  "timeSignature": "4/4",
  "ticksPerQuarter": 480,
  "parts": {
    "Main_A": {
      "sizeInBeats": 8,
      "channels": {
        "BASS": {
          "ctab": { "ntr": "ROOT_TRANSPOSITION", "ntt": "MELODY", ... },
          "phrases": { "Maj": [notes...], "min7": [notes...], ... }
        }
      }
    }
  }
}
```

**תוצרים:**
- [x] `lib/style-engine/StyleParser.js` — קורא SFF1/SFF2, CASM, MIDI track
- [x] `lib/style-engine/StyleValidator.js` — בדיקות תוצאה
- [x] `components/style-parser-test/StyleParserTest.jsx` — דף בדיקה ב-`/style-parser-test`
- [x] אישור פרסור על: JazzWaltzFast (SFF1, 3/4, 194BPM, EIGHTH_SHUFFLE) + CoolBossa (SFF1, 4/4, 168BPM, BINARY)

**קבצי Java לקרוא (רק אם צריך עומק):**
```
CASMDataReader.java     ← parsing של CASM section (binary)
MPL_MusicData.java      ← קריאת MIDI notes
MPL_MiscData.java       ← tempo, timeSignature
```

---

### שלב 3 — Chord→Pattern Engine
**סטטוס:** ✅ הושלם — אישור JS: ii-V-I (Dm7→G7→Cmaj7) מייצר notes מוסיקלית נכונים ✅

**מה נעשה:**
- נקראו: `YamJJazzRhythmGenerator.java`, `PhraseUtilities.java`, `Ctb2ChannelSettings.java`, `YamChord.java`, `SpsRandomPicker.java`
- מומשו כל אלגוריתמי ה-NTR/NTT: fitMelody, fitChord, fitBass, BYPASS
- נבנה מנגנון variation selector עם decreasing/constant thresholds

**תוצרים:**
- [x] `lib/style-engine/YamChordMap.js` — טבלת 34 אקורדים + intervals + scales + aliases
- [x] `lib/style-engine/Transposer.js` — NTR/NTT לוגיקה מלאה
- [x] `lib/style-engine/VariationSelector.js` — smart random picker
- [x] `lib/style-engine/ChordEngine.js` — facade ראשי + generatePhrasesForChordSequence
- [x] `components/chord-engine-test/ChordEngineTest.jsx` — דף בדיקה ב-`/chord-engine-test`
- [x] Route: `/chord-engine-test`

**API של ChordEngine:**
```javascript
import { generatePhrasesForChord, generatePhrasesForChordSequence, parseChordSymbol } from './lib/style-engine/ChordEngine'

const chord   = parseChordSymbol('Dm7')  // → { rootPitch: 2, typeName: 'min7' }
const phrases = generatePhrasesForChord(style, 'Main_A', chord, barIndex)
// → { BASS: [{pitch,velocity,position,duration},...], RHYTHM:[...], CHORD1:[...] }

// לרצף של אקורדים בתוך חזרה אחת:
const phrases = generatePhrasesForChordSequence(style, 'Main_A', [
  { rootPitch: 2, typeName: 'min7',  startBeat: 0 },
  { rootPitch: 7, typeName: '7th',   startBeat: 4 },
], barIndex)
```

**קבצי Java שנקראו:**
```
YamJJazzRhythmGenerator.java    ← fitSrcPhraseToChordSymbol, getOneAccTypePhrase
PhraseUtilities.java            ← fitMelodyPhrase2ChordSymbol, fitChordPhrase2ChordSymbol
Ctb2ChannelSettings.java        ← NTT/NTR/RTR enums
CtabChannelSettings.java        ← mutedChords, sourceChordNote/Type
YamChord.java                   ← טבלת 34 האקורדים (כולה, סדר קריטי)
SpsRandomPicker.java            ← variation selection thresholds
```

---

### שלב 4 — Humanizer
**סטטוס:** ⬜ טרם התחיל

**מה Claude Code עושה:**
- קורא `JJAZZLAB_ANALYSIS.md` → סעיף "מנוע ההומניזציה"
- מממש `lib/style-engine/Humanizer.js`:
  - timingRandomness [0-1] → ±0.2 beat (Gaussian distribution)
  - timingBias [-0.5;0.5] → lag/rush feel
  - velocityRandomness [0-1] → ±30 velocity
  - DEFAULT: `{ timing: 0.2, bias: 0, velocity: 0.2 }`

**קבצי Java לקרוא:**
```
Humanizer.java    ← כולו (קצר וברור, ~300 שורות)
```

**תוצרים:**
- [ ] `lib/style-engine/Humanizer.js`
- [ ] preset params לכל ז'אנר

---

### שלב 5 — Event System
**סטטוס:** ⬜ טרם התחיל

**מה Claude Code עושה:**
- כותב `lib/style-engine/BackingTrackClock.js` — scheduler מדויק מבוסס Web Audio API clock
- מוציא events בכל beat:
```javascript
onBeat({ beat, bar, currentChord, nextChord, currentVariation, tempo })
onChordChange({ from, to, bar })
onSectionChange({ section: 'Fill_In_AA' })
```

**תוצרים:**
- [ ] `lib/style-engine/BackingTrackClock.js`
- [ ] `lib/style-engine/BackingTrackEngine.js` — facade שמחבר הכל

**קבצי Java לקרוא:** לא נדרש.

---

### שלב 6 — אינטגרציה לאפליקציה
**סטטוס:** ⬜ טרם התחיל

**מה Claude Code עושה:**
- מחבר `BackingTrackEngine` ל-`BackingTracksPage.jsx`
- ממשק קיים נשאר — רק "מתחת למנוע" משתנה
- מוסיף: תצוגת אקורד נוכחי, beat indicator
- מסיר: קוד Tone.js הישן (לאחר אישור)

**תוצרים:**
- [ ] `BackingTracksPage.jsx` מעודכן
- [ ] מחיקת `lib/backing-tracks/` הישן
- [ ] build עובר, deploy לVercel

---

### שלב 7 — הרחבת ז'אנרים
**סטטוס:** ⬜ ongoing לאחר שלב 6

| ז'אנר | עדיפות | סטטוס |
|---|---|---|
| Jazz Swing | ראשון | ⬜ |
| Bossa Nova | שני | ⬜ |
| Blues Shuffle | שלישי | ⬜ |
| Funk | רביעי | ⬜ |
| Latin (Samba/Rumba) | חמישי | ⬜ |
| Rock/Pop | נמוך | ⬜ |

**לכל ז'אנר:** קובץ `.sty` אחד מ-JJazzLab → בדיקת פרסור → מוכן.

---

### שלב 8 — אינטגרציה עם תרגילי האוזן
**סטטוס:** ⬜ עתידי

- [ ] **Chord Tones (4B)** — הדגשה ויזואלית של chord tones לפי האקורד הנוכחי
- [ ] **Relative Harmony (4A)** — הבאקינג מנגן, התלמיד מזהה דרגות
- [ ] **Cue system** — התראה לפני מעבר אקורד
- [ ] **Real-time chord input** — תלמיד מקליד, הבאקינג מגיב

---

## קבצים חשובים

### יוחלפו / יעודכנו
```
src/lib/backing-tracks/instruments.js    ← יוחלף
src/lib/backing-tracks/patterns/         ← יוחלף
src/components/backing-tracks/BackingTracksPage.jsx  ← יעודכן
```

### יווצרו חדש
```
src/lib/soundfont/SoundFontPlayer.js
src/lib/style-engine/
  StyleParser.js
  YamChordMap.js
  Transposer.js
  ChordEngine.js
  VariationSelector.js
  Humanizer.js
  BackingTrackClock.js
  BackingTrackEngine.js   ← facade ראשי
public/styles/            ← קבצי .sty
public/soundfonts/        ← קובץ SF2
```

---

## מקורות

- **קוד JJazzLab מקומי:** `C:\Users\DELL\Documents\JJazzLab`
- **מסמך ניתוח ארכיטקטורה:** `JJAZZLAB_ANALYSIS.md` ← **קרא זה לפני כל עבודה!**
- **JJazzLab SoundFont:** `C:\Program Files\JJazzLab\jjazzlab\modules\ext\*.sf2`
- **JJazzLab GitHub:** https://github.com/jjazzboss/JJazzLab
- **Developer Guide:** https://jjazzlab.gitbook.io/developer-guide

---

## הערות פתוחות

- **SF2 גודל:** 50-150MB — לדון בטעינה lazy/split/CDN בתחילת שלב 1
- **Mobile performance:** לבדוק Web Audio + SF2 על mobile מוקדם
- **License:** JJazzLab = LGPL. קבצי .sty = Yamaha format — לוודא הפצה
- **SFF2 vs SFF1:** גרסה ראשונה — SFF1 בלבד. SFF2 = שלב מאוחר

---

*נוצר: מרץ 2026 | עודכן: מרץ 2026 — שלב 3 הושלם — ChordEngine עובד, דף בדיקה `/chord-engine-test`*
