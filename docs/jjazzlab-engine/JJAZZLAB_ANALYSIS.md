# JJAZZLAB_ANALYSIS.md
# ניתוח ארכיטקטורת JJazzLab — למפתח JavaScript
# נוצר על בסיס קריאת קוד מקור מ: C:\Users\DELL\Documents\JJazzLab

> מסמך זה מתאר **את הלוגיקה המוסיקלית בלבד**, בשפה פשוטה.  
> Claude Code יקרא מסמך זה במקום לקרוא את קוד ה-Java מחדש.  
> קוד Java רלוונטי מצוין לפי נתיב — לקריאה רק כשנדרש עומק נוסף.

---

## מפת הקוד הרלוונטי ב-JJazzLab

```
C:\Users\DELL\Documents\JJazzLab\
│
├── plugins\YamJJazz\src\main\java\org\jjazz\yamjjazz\
│   │
│   ├── CASMDataReader.java          ← PARSER ראשי של קובץ .sty
│   ├── MPL_MusicData.java           ← קריאת נתוני MIDI מתוך .sty  
│   ├── MPL_MiscData.java            ← קריאת tempo, timeSignature, name
│   ├── MPL_SInt.java                ← קריאת הגדרות instrument (SInt section)
│   │
│   └── rhythm\api\
│       ├── Style.java               ← מודל ה-Style כולו (מכיל StyleParts)
│       ├── StylePart.java           ← מודל StylePart אחד (Main_A, Fill_AA וכו')
│       ├── StylePartType.java       ← enum: כל סוגי ה-StyleParts
│       ├── AccType.java             ← enum: כלים (BASS, CHORD1, RHYTHM וכו')
│       ├── CtabChannelSettings.java ← הגדרות CTAB לכל channel (איך לנגן על אקורד)
│       ├── Ctb2ChannelSettings.java ← גרסה מורחבת של CTAB (SFF2)
│       ├── YamChord.java            ← מיפוי שמות אקורדים של Yamaha
│       ├── YamJJazzRhythmGenerator.java ← לב מנוע היצירה (הכי חשוב!)
│       └── SpsRandomPicker.java     ← בחירת variation אקראי
│
├── core\Humanizer\src\main\java\org\jjazz\humanizer\api\
│   └── Humanizer.java               ← מנוע ההומניזציה
│
└── model\Phrase\src\main\java\org\jjazz\
    └── phrase\api\
        ├── NoteEvent.java           ← מודל של note בודד (pitch, velocity, position, duration)
        └── Phrases.java             ← פעולות על phrases (fitMelody, fitChord וכו')
```

---

## הרעיון המרכזי — איך .sty הופך למוזיקה

### שלב 1: מבנה קובץ .sty

קובץ `.sty` הוא MIDI file עם שני חלקים נוספים:

```
.sty file =
  [MIDI Track]           ← פטרני המוזיקה (notes לכל כלי, לכל StylePart)
  [CASM Section]         ← מטה-דאטה: איזה channel = איזה כלי, איך לנגן על כל אקורד
  [SInt Section]         ← הגדרות instrument (מה לנגן במקום כל כלי)
```

**סדר הקריאה בקוד:**
1. `CASMDataReader.java` — קורא את CASM: יוצר StyleParts, ChannelSettings (CTAB)
2. `MPL_MiscData.java` — קורא tempo, timeSignature, שם ה-style
3. `MPL_MusicData.java` — קורא את ה-MIDI notes ומשייך לכל StylePart

### שלב 2: StylePartTypes — מה יש בכל Style

```javascript
// StylePartType.java — כל ה-parts האפשריים:
const STYLE_PART_TYPES = [
  'Intro_A', 'Intro_B', 'Intro_C', 'Intro_D',
  'Main_A', 'Main_B', 'Main_C', 'Main_D',
  'Fill_In_AA', 'Fill_In_BB', 'Fill_In_CC', 'Fill_In_DD',
  'Fill_In_BA', 'Fill_In_AB',
  'Ending_A', 'Ending_B', 'Ending_C', 'Ending_D'
]
// Style רגיל משתמש ב: Intro_A, Main_A, Main_B, Fill_In_AA, Fill_In_BB, Ending_A
```

### שלב 3: AccTypes — הכלים

```javascript
// AccType.java — channels 8-15:
const ACC_TYPES = {
  SUBRHYTHM: { channel: 8 },   // תופים נוספים
  RHYTHM:    { channel: 9 },   // תופים ראשיים  ← channel 10 ב-MIDI
  BASS:      { channel: 10 },  // בס
  CHORD1:    { channel: 11 },  // הרמוניה 1 (גיטרה/פסנתר)
  CHORD2:    { channel: 12 },  // הרמוניה 2
  PAD:       { channel: 13 },  // pad/strings
  PHRASE1:   { channel: 14 },  // פרייזינג מלודי 1
  PHRASE2:   { channel: 15 },  // פרייזינג מלודי 2
}
```

### שלב 4: CtabChannelSettings — הלב של ה"חוכמה"

**זהו המנגנון שגורם ל-JJazzLab להשמע כמו ג'אז אמיתי.**

לכל channel בכל StylePart, יש CTAB שמגדיר:

```javascript
// CtabChannelSettings.java
{
  accType: 'BASS',              // איזה כלי
  sourceChordNote: 'C',         // האקורד ה"מקורי" בקובץ (תמיד C)
  sourceChordType: 'Maj',       // סוג האקורד המקורי
  mutedChords: ['dim', 'aug'],  // אקורדים שבהם channel זה שותק
  mutedNotes: [Bb, Ab],         // תווים שמושתקים תמיד

  // ctb2Main — הוראות ה-transposition:
  ctb2Main: {
    ntr: 'ROOT_TRANSPOSITION', // שיטת transposition:
                               //   ROOT_FIXED = chord-style (פסנתר)
                               //   ROOT_TRANSPOSITION = melody-style (בס, פרייזינג)
                               //   GUITAR = arpeggio/stroke
    ntt: 'MELODY',             // טבלת transposition:
                               //   BYPASS = שימוש ישיר
                               //   MELODY = fit למנגינה
                               //   CHORD = fit לאקורד
                               //   HARMONIC_MINOR / MELODIC_MINOR / etc.
    bassOn: false,             // האם לנגן בס (bass note במקום root)
    noteLowLimit: 36,          // גבול תחתון של pitch (MIDI)
    noteHighLimit: 72,         // גבול עליון של pitch
    chordRootUpperLimit: 60,   // אם root > זה, transpose octave down
    rtr: 'RETRIGGER'           // מה לעשות כשאקורד משתנה בזמן note ON:
                               //   STOP, RETRIGGER, PITCH_SHIFT, NOTE_GENERATOR
  }
}
```

### שלב 5: איך note בודד מתורגם לאקורד חדש

הפונקציה `fitSrcPhraseToChordSymbol()` (YamJJazzRhythmGenerator.java) היא הלב:

```
Input:  sourceNote (כתוב על Cmaj בקובץ), destChord (Dm7)
Output: destinationNote (מותאם לDm7)

הלוגיקה לפי ntr + ntt:

ROOT_FIXED + CHORD/MELODY:
  → fitChordPhrase2ChordSymbol()
  → notes "כלואים" לתוך ה-chord tones של הדסטינציה
  → מתאים ל: פסנתר, גיטרה comping

ROOT_TRANSPOSITION + MELODY:
  → fitMelodyPhrase2ChordSymbol()
  → notes עוברים transposition לפי scale
  → מתאים ל: בס, פרייזינג מלודי

ROOT_TRANSPOSITION + BYPASS:
  → פשוט pitch shift לפי הפרש ה-root notes
  → מתאים ל: intros, endings

GUITAR (ALL_PURPOSE/ARPEGGIO/STROKE):
  → fitChordPhrase2ChordSymbol()
  → chord-oriented
```

### שלב 6: YamChord — מיפוי אקורדים

```javascript
// YamChord.java — המיפוי המלא (סדר חשוב! index = code בקובץ)
const YAMAHA_CHORDS = [
  { name: '1+2+5', aliases: ['2'] },           // index 0
  { name: 'sus4',  aliases: ['sus'] },          // index 1
  { name: '1+5',   aliases: [] },               // index 2
  { name: '1+8',   aliases: [] },               // index 3
  { name: '7aug',  aliases: ['7#5','alt'] },    // index 4
  // ... עד index 33
  { name: 'Maj7',  aliases: ['M7'] },           // index 31
  { name: 'Maj6',  aliases: ['6'] },            // index 32
  { name: 'Maj',   aliases: [''] },             // index 33
]
// **CRITICAL**: הסדר הפוך ב-CTAB — index ב-CTAB = 0x21 - position
// כלומר: Maj = 0x21-33 = 0, 7th = 0x21-14 = 19 וכו'
```

---

## מנוע ההומניזציה

### Humanizer.java — הפרמטרים

```javascript
// Humanizer.Config:
{
  timingRandomness: 0.2,   // [0-1] כמה deviation בtiming (default: 0.2)
  timingBias: 0.0,         // [-0.5;0.5] הזזה כללית (lag/rush)
  velocityRandomness: 0.2  // [0-1] כמה deviation בvelocity (default: 0.2)
}

// Humanizer DEFAULT_CONFIG = { timing: 0.2, bias: 0.0, velocity: 0.2 }
// Humanizer ZERO_CONFIG   = { timing: 0.0, bias: 0.0, velocity: 0.0 }

// גבולות הסטייה:
MAX_TIMING_DEVIATION = 0.2  // ± 0.2 beat
MAX_TIMING_BIAS_DEVIATION = 0.2  // ± 0.2 beat
MAX_VELOCITY_DEVIATION = 30     // ± 30 velocity units

// התאמה לtempo:
// tempo <= 50: deviation -= 0.1
// tempo = 250: deviation += 0.1 (לינארי)
```

### הלוגיקה:
```javascript
// עבור כל note:
newPosition = originalPosition + (randomFactor * maxDeviation * timingRandomness)
                               + (MAX_BIAS_DEVIATION * timingBias)
newVelocity = originalVelocity + (randomFactor * MAX_VEL_DEV * velocityRandomness)

// randomFactor: Gaussian distribution [-1, 1]
// מחושב פעם אחת ב-computeRandomFactors() — נשמר לreproducibility
```

---

## מנוע ה-VariationSelector (SpsRandomPicker)

```javascript
// SpsRandomPicker.java:
// לכל StylePart יכולים להיות כמה SourcePhraseSets (variations)
// SpsRandomPicker.pick(barIndex) בוחר variation בצורה "smart random"
// כך שאין חזרה על אותה variation פעמיים ברצף (כשיש מספיק variations)
```

---

## מנוע ה-Fill/Variation

```javascript
// YamJJazzRhythmGenerator.preprocessFillParameter():
// לפני כל bar אחרון של section → מחליף ל-Fill_In_XX
// Main_A → Fill_In_AA
// Main_B → Fill_In_BB
// וכו'
// Fill_In_BA = "break" (מעבר בין sections)
```

---

## תהליך מלא: מאקורד לצליל

```
Input: chord="Dm7", beat=1, bar=3, stylePart=Main_A, tempo=130

1. בחר StylePart = Main_A
2. בחר SourcePhraseSet (variation) — SpsRandomPicker
3. לכל AccType (BASS, CHORD1, RHYTHM...):
   a. קבל source channel מה-CTAB
   b. קבל source phrase (notes ב-C major מהקובץ)
   c. בדוק mutedChords — האם Dm7 מושתק עבור channel זה?
   d. חשב destination notes:
      - fitChordPhrase / fitMelodyPhrase / bypass לפי ntr+ntt
      - הגבל לnoteLowLimit/noteHighLimit
      - חל chordRootUpperLimit
   e. בדוק note transitions (rtrigger/stop/pitch_shift)
4. Apply Humanizer (timing/velocity variations)
5. Apply Intensity parameter (velocity shift)
6. Process bass line (וודא שroot מנוגן בbeat 1)
7. Process anticipations & accents
8. Output: { bass: [notes], piano: [notes], drums: [notes] }
```

---

## מה **לא** נצטרך לממש (פשטנות)

בגרסה הראשונה שלנו נדלג על:
- **SFF2** (ctb2Low/ctb2High) — רק SFF1 (ctb2Main בלבד) — מספיק לרוב הקבצים
- **RhythmVoiceDelegate** — מנגנון delegation מורכב
- **Anticipation/accent processing** — מורכב, נוסיף בשלב מאוחר
- **User tracks** — לא רלוונטי
- **Arranger mode** — לא רלוונטי

---

## מה ה-Soundfont של JJazzLab

**נמצא בתוך installation של JJazzLab** (לאחר התקנה):
```
C:\Program Files\JJazzLab\jjazzlab\modules\ext\
  → *.sf2 (חפש קובץ בגודל 50-150MB)
```
או חלופה: SGM-v2.01 SoundFont (בחינם, הבסיס של ה-JJazzLab soundfont)

---

## הספריות JS שנשתמש בהן

```javascript
// SoundFont Player (SF2 בדפדפן):
// אפשרות A: "soundfont-player" npm
// אפשרות B: "html-midi-player" (WebComponent)
// אפשרות C: "js-synthesizer" (FluidSynth ל-WebAssembly) ← הכי קרוב לJJazzLab
// ← להחליט בתחילת שלב 1

// MIDI note scheduling (Web Audio API clock):
// Tone.js Transport — כבר קיים בפרויקט
// או: Web Audio API clock ישירות (יותר מדויק)
```

---

## רשימת קבצים לקריאה בכל שלב

### שלב 1 (SoundFont Player) — לא צריך לקרוא Java
### שלב 2 (STY Parser):
```
קרא: CASMDataReader.java     ← לוגיקת parsing של CASM section
קרא: MPL_MusicData.java      ← לוגיקת קריאת MIDI notes
קרא: MPL_MiscData.java       ← tempo, timeSignature
קרא: Style.java (שלד)        ← המבנה הכולל
קרא: StylePart.java          ← המבנה של part בודד
```
### שלב 3 (Chord Engine):
```
קרא: YamJJazzRhythmGenerator.java    ← כולו! זה הלב
קרא: CtabChannelSettings.java        ← פרמטרי CTAB
קרא: Ctb2ChannelSettings.java        ← NTT/NTR/RTR values
קרא: YamChord.java                   ← טבלת YamChord (כולה)
קרא: AccType.java                    ← כלים וchannels
```
### שלב 4 (Humanizer):
```
קרא: Humanizer.java                  ← כולו (קצר וברור)
```
### שלב 5+ — לא צריך לקרוא Java נוסף

---

*מסמך זה מחליף קריאת קוד Java ישירה. עדכן אם מגלים מידע חדש.*
