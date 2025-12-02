# Ear Training Application Specification
## Full Specification Document
**Date:** November 2025
**Version:** 1.0
**Purpose:** Comprehensive specification document for developing an ear training application for guitar
students
---
## Table of Contents
1. [Overview](#1-overview)
2. [General Architecture](#2-general-architecture)
3. [Home Screen](#3-home-screen)
4. [Exercise 1 - Interval Recognition](#4-exercise-1---interval-recognition)
5. [Exercise 2 - Fretboard Mapping](#5-exercise-2---fretboard-mapping)
6. [Shared Components](#6-shared-components)
7. [Technical Requirements](#7-technical-requirements)
---
## 1. Overview
### 1.1 Application Purpose
An ear training application for guitar students, focusing on three main areas:
1. Interval recognition relative to a reference note
2. Mapping notes and melodies on the guitar neck
3. Creating melodies over chord progressions
### 1.2 Target Users
- Guitar students at various levels (beginner to advanced)
- Guitar teachers seeking structured practice tools
### 1.3 Platform
- Web-based application (Browser Application)
- Desktop and mobile support
- No login or registration required
- Uses localStorage to save preferences and progress
---
## 2. General Architecture
### 2.1 Navigation Structure
```
Home Page
├── Exercise 1 - Interval Recognition
├── Exercise 2 - Fretboard Mapping
└── Exercise 3 - Melody over Chords (not specified in this document)
```
### 2.2 Core UX Principles
**Slide-out Settings Panel:**
- Each exercise includes a slide-out settings panel (⚙️)
- Panel opens from the side (left or right - no preference)
- Settings can be changed during practice
- Changing settings affects from the next question onwards (does not reset the exercise)
**Memory and Progress:**
- Uses localStorage to save preferences
- No login or user identification required
- Data may be deleted if user clears browser cache
**Direct Access:**
- Clicking an exercise on the home page goes directly to the exercise screen
- Settings load from localStorage (or defaults for new visitors)
### 2.3 Recommended File Structure
```
/src
/components
/common
- Header.jsx
- SettingsPanel.jsx
- ProgressBar.jsx
- AudioPlayer.jsx
/home
- HomePage.jsx
- ExerciseCard.jsx
/exercise1
- Exercise1.jsx
- NoteButtons.jsx
- Exercise1Settings.jsx
/exercise2
- Exercise2.jsx
- Fretboard.jsx
- Exercise2Settings.jsx
/utils
- audio.js
- storage.js
- noteGeneration.js
- melodyGeneration.js
/constants
- notes.js
- defaults.js
/styles
- global.css
- variables.css
```
---
## 3. Home Screen
### 3.1 Purpose
The home screen serves as the main entry point to the application and provides:
- Information about each exercise and its pedagogical purpose
- Explanation of different practice methods
- Direct access to each exercise
### 3.2 Screen Structure
```
┌─────────────────────────────────────────────┐
│ │
│ Ear Training 🎵 │
│ Ear Training Application │
│ │
├─────────────────────────────────────────────┤
│ │
│ ┌───────────────────────────────────────┐ │
│ │ Exercise 1 - Interval Recognition │ │
│ │ │ │
│ │ [Exercise Description] │ │
│ │ [Pedagogical Goals] │ │
│ │ [Recommended Practice Methods] │ │
│ │ │ │
│ │ [Start Practice] │ │
│ └───────────────────────────────────────┘ │
│ │
│ ┌───────────────────────────────────────┐ │
│ │ Exercise 2 - Fretboard Mapping │ │
│ │ │ │
│ │ [Exercise Description] │ │
│ │ [Pedagogical Goals] │ │
│ │ [Recommended Practice Methods] │ │
│ │ │ │
│ │ [Start Practice] │ │
│ └───────────────────────────────────────┘ │
│ │
│ ┌───────────────────────────────────────┐ │
│ │ Exercise 3 - Melody over Chords │ │
│ │ │ │
│ │ [Exercise Description] │ │
│ │ [Pedagogical Goals] │ │
│ │ [Recommended Practice Methods] │ │
│ │ │ │
│ │ [Start Practice] │ │
│ └───────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────┘
```
### 3.3 Exercise Card Content
#### Exercise 1 - Interval Recognition
**Title:** Interval Recognition Relative to C
**Description:**
This exercise develops relative pitch - the ability to identify notes relative to a reference point. The student
hears the note C as an anchor, followed by another note, and must identify which note they heard.
**Pedagogical Goals:**
- Develop relative pitch
- Build tonal memory
- Ability to hear intervals as internal relationships
- Preparation for melodic transcription and solfège
**Practice Methods:**
1. **For Beginners:** Start with 3-4 notes only in one octave, with "C every time"
2. **Intermediate Level:** Add more notes and expand to 2 octaves
3. **Advanced:** Switch to "C only at start" to develop independent tonal memory
4. **Challenging:** Use all 12 chromatic notes across 3-4 octaves
**[Button: Start Practice]**
---
#### Exercise 2 - Fretboard Mapping
**Title:** Finding Notes and Melodies on the Guitar Neck
**Description:**
This exercise combines hearing with spatial mapping on the guitar. The student hears notes or melodies,
finds them on their real guitar, then marks the locations on a virtual fretboard.
**Pedagogical Goals:**
- Connection between hearing and motor skills
- Spatial mapping of the guitar neck
- Awareness of fretboard topography
- Preparation for transcription and improvisation
- Develop "knowledge" of where each note is located
**Practice Methods:**
1. **For Beginners:** Single notes on one string, first 5 frets
2. **Intermediate Level:** 2-3 notes in sequence, multiple strings, stepwise motion
3. **Advanced:** Longer melodies with leaps and chromaticism
4. **Challenging:** "Library" mode with pre-made melodies that progress in difficulty
5. **Expert:** "Free" mode without sequential marking, full fretboard range
**[Button: Start Practice]**
---
#### Exercise 3 - Melody over Chords
**Title:** Creating Melodies over Chord Progressions
**Description:**
(To be completed in next version of document)
**[Button: Coming Soon]** (inactive)
### 3.4 Technical Requirements - Home Screen
**Component: HomePage**
```javascript
// Props: none
// State: none (stateless component)
// Elements:
- Header with app title
- Array of ExerciseCard components (3 cards)
- Responsive layout (stack on mobile, side-by-side on desktop)
```
**Component: ExerciseCard**
```javascript
// Props:
- exerciseId: number (1, 2, or 3)
- title: string
- description: string
- pedagogicalGoals: array of strings
- practiceMethods: array of strings
- isAvailable: boolean (for future exercises)
- onStart: function
// Behavior:
- Render card with all content
- "Start Practice" button triggers onStart()
- If !isAvailable, button shows "Coming Soon" and is disabled
```
**Navigation:**
```javascript
// When clicking "Start Practice":
- Navigate to /exercise1, /exercise2, or /exercise3
- Load settings from localStorage or use defaults
```
---
## 4. Exercise 1 - Interval Recognition
### 4.1 Exercise Purpose
Develop the ability to identify notes relative to a reference note (C), building relative pitch and tonal
memory.
### 4.2 Screen Structure
```
┌─────────────────────────────────────────────┐
│ ⚙️ [Settings] [X Stop] Question 3/10 │
│ ████████░░░░░░ 70% │
├─────────────────────────────────────────────┤
│ │
│ 🔊 Play C 🔊 Play Note │
│ │
│ Which note did you hear? │
│ │
│ [C] [C#] [D] [D#] [E] [F] │
│ [F#] [G] [G#] [A] [A#] [B] │
│ │
│ (Only notes selected in settings will be │
│ active, others will be dimmed or hidden) │
│ │
└─────────────────────────────────────────────┘
```
### 4.3 Settings (Settings Panel)
**Slide-out Settings Panel:**
```
┌─────────────┐
│ Settings │
├─────────────┤
│ Available │
│ Notes: │
│ ☑C ☑C# ☑D │
│ ☑D# ☑E ☑F │
│ ☑F# ☑G ☑G# │
│ ☑A ☑A# ☑B │
│ │
│ [Select All]│
│ [Clear All] │
├─────────────┤
│ Octaves: │
│ [2 ] (1-4) │
├─────────────┤
│ Play C: │
│ ⚫ Every Time│
│ ○ Once at │
│ Start │
├─────────────┤
│ Transition │
│ Between │
│ Questions: │
│ ⚫ Auto │
│ ○ Manual │
├─────────────┤
│ Number of │
│ Questions: │
│ [10] (5-50) │
├─────────────┤
│ [Reset │
│ Exercise] │
└─────────────┘
```
#### 4.3.1 Settings Parameters
| Parameter | Type | Value Range | Default | Explanation |
|-----------|------|-------------|---------|-------------|
| Available Notes | array | 12 booleans (C-B) | All notes | Which notes can appear in questions |
| Octaves | number | 1-4 | 2 | Across how many octaves the notes will spread |
| Play C | enum | "everyTime" / "onceAtStart" | "everyTime" | Whether to play C before each question or only
at start |
| Transition | enum | "auto" / "manual" | "auto" | Auto transition or requires clicking "Next" |
| Num Questions | number | 5-50 | 10 | Number of questions in a session |
#### 4.3.2 Constraints and Behavior
**Available Notes:**
- Must select at least 2 notes
- If user tries to uncheck the last remaining note, action is rejected and error message displayed
- "Select All" button checks all 12 notes
- "Clear All" button leaves only C checked (to prevent zero notes)
**Octaves:**
- Value determines how many octaves above C4 will be available
- Example: octaves=2 → notes will be between C4 and C6
**Play C:**
- "Every Time": System plays C4 before each new question
- "Once at Start": System plays C4 only on the first question of the session
**Changing Settings During Practice:**
- Changing any parameter affects from the next question onwards
- Does not reset question counter or progress
- "Reset Exercise" button resets everything and starts over with current settings
### 4.4 Exercise Flow
#### 4.4.1 Initializing a New Question
```
1. Select random note:
- From notes marked in settings
- Within selected octave range
- Does not repeat exact same note+octave as previous question
(same note in different octave - allowed)
2. Automatic playback:
- If "Play C" = "Every Time":
* Play C4 (duration: 1 second)
* Pause (0.3 seconds)
* Play new note (duration: 1 second)
- If "Play C" = "Once at Start":
* If this is the first question:
- Play C4 (duration: 1 second)
- Pause (0.3 seconds)
* Play new note (duration: 1 second)
3. Update UI:
- Counter: "Question X of Y"
- Progress bar
- Note buttons ready for selection
```
#### 4.4.2 Playback Buttons
**"Play C" Button:**
- Always available (even in "Once at Start" mode)
- Plays C4 (duration: 1 second)
- No effect on answer or progress
**"Play Note" Button:**
- Always available
- Plays the current note asked (duration: 1 second)
- No effect on answer or progress
#### 4.4.3 Answer Selection
```
Student clicks one of the note buttons:
1. Check answer:
- Compare selected note to correct note (by note name, not octave)
2. If correct:
a. Button turns green (#4CAF50)
b. Message "Correct! ✅" displayed above
c. Record success: firstTryCorrect++
d. Wait 1 second
e. Move to next question:
- If "transition" = "auto": direct transition
- If "transition" = "manual": show "Next" button
3. If incorrect:
a. Button turns red (#F44336)
b. Button stays pressed/highlighted for 0.5 seconds
c. Color returns to normal
d. Record: attempts++
e. Student can try again
f. Process repeats until correct selection
```
**Important:** Student cannot move to next question until selecting the correct answer.
#### 4.4.4 Session Completion
```
After the last question (question number Y):
1. Calculate results:
- totalQuestions = Y
- correctFirstTry = how many questions answered correctly on first try
- neededMoreAttempts = totalQuestions - correctFirstTry
2. Transition to summary screen
```
### 4.5 Summary Screen
```
┌─────────────────────────────────────┐
│ Completed! 🎉 │
├─────────────────────────────────────┤
│ │
│ Completed 10 questions │
│ 7 correct on first try │
│ 3 required additional attempts │
│ │
│ [Practice Again] [Back to Home] │
│ │
└─────────────────────────────────────┘
```
**Buttons:**
- **"Practice Again"**: Resets counters and starts new session with same settings
- **"Back to Home"**: Returns to home page
### 4.6 "Stop" Button
In the upper left corner:
```
Behavior:
- Clicking "Stop" displays summary screen
- Results: current state up to this point
* totalQuestions = current question number - 1
* correctFirstTry = how many succeeded on first try so far
```
### 4.7 Technical Requirements - Exercise 1
#### 4.7.1 Data Structures
**Settings Object:**
```javascript
{
availableNotes: {
C: true,
'C#': true,
D: true,
'D#': true,
E: true,
F: true,
'F#': true,
G: true,
'G#': true,
A: true,
'A#': true,
B: true
},
octaveRange: 2, // 1-4
playC: 'everyTime', // 'everyTime' | 'onceAtStart'
transition: 'auto', // 'auto' | 'manual'
numQuestions: 10 // 5-50
}
```
**Session State:**
```javascript
{
currentQuestion: 1,
totalQuestions: 10,
correctNote: 'E', // note name only, no octave
correctNoteWithOctave: 'E5', // full note with octave for audio
usedNotes: ['C4', 'D5', 'E5'], // array of already asked notes
correctFirstTry: 0,
totalAttempts: 0,
isComplete: false,
hasPlayedCAtStart: false // track if C was played in "onceAtStart" mode
}
```
#### 4.7.2 Core Functions
**generateRandomNote()**
```javascript
/**
* Generates a random note based on settings
* @param {Object} settings - Current settings
* @param {Array} usedNotes - Previously used notes in this session
* @returns {Object} { noteName: 'E', fullNote: 'E5' }
*/
```
**Logic:**
- Filter available notes from settings
- Generate random octave within octaveRange
- Ensure not repeating exact same note+octave as previous question
- Return both note name (for checking answer) and full note (for audio)
**playAudio(note, duration)**
```javascript
/**
* Plays a note using Web Audio API or Tone.js
* @param {String} note - Note to play (e.g., 'C4', 'E5')
* @param {Number} duration - Duration in seconds
*/
```
**checkAnswer(selected, correct)**
```javascript
/**
* Checks if selected note matches correct note
* @param {String} selected - Selected note name (e.g., 'E')
* @param {String} correct - Correct note name (e.g., 'E')
* @returns {Boolean}
*/
```
**saveSettings(settings)**
```javascript
/**
* Saves settings to localStorage
* @param {Object} settings
*/
localStorage.setItem('exercise1Settings', JSON.stringify(settings));
```
**loadSettings()**
```javascript
/**
* Loads settings from localStorage or returns defaults
* @returns {Object} settings
*/
```
#### 4.7.3 UI Components
**Exercise1.jsx**
- Main component
- Manages state: settings, session, currentQuestion
- Handles question flow
**NoteButtons.jsx**
```javascript
// Props:
- availableNotes: object
- selectedNote: string | null
- isCorrect: boolean | null
- onNoteSelect: function
// Behavior:
- Render 12 buttons in two rows
- Only enabled buttons for selected notes in settings
- Visual feedback: green for correct, red for incorrect
- Disabled buttons are grayed out or hidden
```
**SettingsPanel.jsx**
```javascript
// Props:
- isOpen: boolean
- settings: object
- onSettingsChange: function
- onClose: function
- onReset: function
// Behavior:
- Slide in/out animation
- Update settings in real-time
- Validate constraints (min 2 notes, etc.)
```
**ProgressBar.jsx**
```javascript
// Props:
- current: number
- total: number
// Behavior:
- Visual progress bar
- Percentage display
```
**SummaryScreen.jsx**
```javascript
// Props:
- totalQuestions: number
- correctFirstTry: number
- onRestart: function
- onHome: function
// Behavior:
- Display summary statistics
- Two action buttons
```
#### 4.7.4 Recommended Libraries
**Audio:**
- **Tone.js** (https://tonejs.github.io/)
- Generate synthetic sounds
- Precise timing
- Support for wide range of notes
**Alternative:**
- **Howler.js** + recorded audio files (WAV/MP3)
**Storage:**
- Native localStorage API (built-in)
**UI Framework:**
- React (recommended)
- Vue.js (alternative)
---
## 5. Exercise 2 - Fretboard Mapping
### 5.1 Exercise Purpose
Develop the ability to identify notes and melodies on the guitar neck, connecting hearing with spatial and
motor mapping.
### 5.2 Screen Structure
```
┌─────────────────────────────────────────────┐
│ ⚙️ Exercise 2 - Fretboard Mapping │
│ [X Stop] Question 3/10│
│ ████████░░░░░░ 70% │
├─────────────────────────────────────────────┤
│ │
│ 🔊 Play Melody │
│ │
│ Find the notes on the fretboard: │
│ Note 1/4: [●] Note 2/4: [ ] Note 3/4: [ ]│
│ Note 4/4: [ ] │
│ │
│ ┌────────────── FRETBOARD ──────────────┐ │
│ │ │ │
│ │ E ├──●₁─┼──┼──┼──┼──┼──┼──┤ │ │
│ │ B ├──┼──┼──┼──┼──┼──┼──┼──┤ │ │
│ │ G ├──┼──●₂─┼──┼──┼──┼──┼──┤ │ │
│ │ D ├──┼──┼──●₃─┼──┼──┼──┼──┤ │ │
│ │ A ├──┼──┼──┼──┼──┼──┼──┼──┤ │ │
│ │ E ├──●₄─┼──┼──┼──┼──┼──┼──┤ │ │
│ │ 0 3 5 7 9 12 15 17 │ │
│ │ • • • • •• • │ │
│ │ │ │
│ │ [Note names displayed on each fret] │ │
│ │ C D E F G A B C D │ │
│ └────────────────────────────────────────┘ │
│ │
│ (In "free" mode: [1] [2] [3] [4] at bottom)│
│ │
└─────────────────────────────────────────────┘
```
### 5.3 Settings (Settings Panel)
```
┌─────────────┐
│ Settings │
├─────────────┤
│ Source: │
│ ● Library │
│ ○ Random │
├─────────────┤
│ Num Notes: │
│ [3 ] (1-10)│
├─────────────┤
│ Available │
│ Notes: │
│ ☑C ☑C# ☑D │
│ ☑D# ☑E ☑F │
│ ☑F# ☑G ☑G# │
│ ☑A ☑A# ☑B │
│ [Select All]│
├─────────────┤
│ Octaves: │
│ [2 ] (1-4) │
├─────────────┤
│ Movement: │
│ ○ Steps │
│ ○ Leaps │
│ ● Mixed │
├─────────────┤
│ Fretboard: │
│ Frets: │
│ From [0] │
│ To [12] │
│ │
│ Strings: │
│ ☑E ☑A ☑D │
│ ☑G ☑B ☑E │
│ [Select All]│
│ [Clear All] │
├─────────────┤
│ Display: │
│ ☑ Note Names│
│ ☑ Dots │
├─────────────┤
│ Marking: │
│ ☑ In Order │
│ ☐ Free │
├─────────────┤
│ Help: │
│ ☐ Don't Show│
│ ● Show After:│
│ [3] attempts│
├─────────────┤
│ Transition: │
│ ● Auto │
│ ○ Manual │
├─────────────┤
│ Questions: │
│ [10] │
├─────────────┤
│ [Reset │
│ Exercise] │
└─────────────┘
```
### 5.4 Settings Parameters
| Parameter | Type | Value Range | Default | Explanation |
|-----------|------|-------------|---------|-------------|
| Source | enum | "library" / "random" | "library" | Library: fixed sequence. Random: algorithmic generation |
| Num Notes | number | 1-10 | 3 | Melody length (relevant for random mode) |
| Available Notes | array | 12 booleans | All | Which notes can appear |
| Octaves | number | 1-4 | 2 | Octave range |
| Movement | enum | "steps" / "leaps" / "mixed" | "mixed" | Steps: seconds only. Leaps: larger intervals.
Mixed: both |
| Frets (from) | number | 0-23 | 0 | Starting fret |
| Frets (to) | number | 1-24 | 12 | Ending fret (minimum 5 frets in range) |
| Strings | object | 6 booleans | All | Which strings are available (E,A,D,G,B,E) |
| Display: Names | boolean | true/false | true | Show note names on frets |
| Display: Dots | boolean | true/false | true | Show dots on frets 3,5,7,9,12,15,17,19,21,24 |
| Marking | enum | "inOrder" / "free" | "inOrder" | In order: must mark 1→2→3. Free: choose freely |
| Help | object | {enabled: bool, after: num} | {enabled: true, after: 3} | Reveal answer after X attempts |
| Transition | enum | "auto" / "manual" | "auto" | Auto transition or requires click |
| Num Questions | number | 5-50 | 10 | Number of melodies per session |
#### 5.4.1 Constraints and Behavior
**Melody Source:**
**"Library" Mode:**
- Teacher (you) defines a sequence of melodies in advance in JSON file or code
- Each melody defined as:
```javascript
{
id: 1,
name: "Ascending triad sequence",
difficulty: 1, // 1-10
notes: [
{ note: 'C', octave: 4, string: 2, fret: 3 },
{ note: 'E', octave: 4, string: 2, fret: 7 },
{ note: 'G', octave: 4, string: 1, fret: 3 },
{ note: 'D', octave: 4, string: 3, fret: 7 }
],
tags: ["sequential", "triadic", "diatonic"]
}
```
- System presents melodies **in order** (easy to hard)
- No selection - student works through the sequence
**"Random" Mode:**
- System **generates** melodies algorithmically
- Considers parameters:
- Number of notes
- Available notes
- Octaves
- Movement (steps/leaps/mixed)
- Available strings and frets
**Fretboard:**
- Minimum 5 frets in range
- If user tries to set less, system corrects to 5
- At least one string must be checked
**Marking:**
- "In Order": Student must mark note 1, then 2, then 3...
- "Free": Student sees buttons [1] [2] [3] [4] and can choose which note to mark
### 5.5 Exercise Flow
#### 5.5.1 Initializing a New Question
```
1. Select/Generate melody:
- If "Library" mode:
* Load next melody in sequence from library
- If "Random" mode:
* Generate new melody based on parameters:
- Length (number of notes)
- Available notes
- Movement (steps/leaps)
- Available strings and frets
2. Automatic playback:
- Play entire melody once (tempo: 100 BPM, each note quarter note)
- Short pause (0.5 seconds)
- System ready for marking
3. Update UI:
- "Note 1/X: [●]" (indicator for current note)
- Fretboard ready for clicking
- "🔊 Play Melody" button available
```
#### 5.5.2 "Play Melody" Button
```
Behavior:
- Always available
- Plays entire melody from start
- Notes already marked correctly: flash green during playback
* Precise sync between audio and visualization
* Flash: 0.2 seconds before note, continues 0.2 seconds after
```
#### 5.5.3 Marking Notes - "In Order" Mode
```
Process:
1. Student needs to mark note 1:
- Clicks on string+fret on virtual fretboard
2. Check:
a. If correct:
- Point turns green with number: ●₁
- System plays the note (confirmation)
- Indicator moves to: "Note 2/X: [●]"
- First note stays marked (green+number)
- Over time, note fades but remains visible
b. If incorrect:
- Point turns red for one second and disappears
- Attempt 1/3 (or X according to settings)
- Student tries again
c. After X failed attempts (if set "Show After"):
- System marks correct location in yellow
- Message: "Note is here ↓"
- Student must click on yellow point
- Point turns green with number: ●₁
- System plays the note
- Move to next note
3. Repeat process for each note in melody
4. After marking all notes:
- Message: "Excellent! 🎉"
- Wait one second
- Move to next question (auto/manual)
```
#### 5.5.4 Marking Notes - "Free" Mode
```
Process:
1. Buttons displayed at bottom: [1] [2] [3] [4]
- Active button is highlighted
2. Student clicks a number (e.g., 3):
- Button 3 becomes active/highlighted
- Indicator: "Note 3/4: [●]"
3. Student clicks on fretboard:
- Check if location matches note 3 in melody
- Feedback: green (correct) or red (incorrect)
- Same logic as "In Order" mode
4. Student can switch to another button at any time:
- Click [1] → tries to mark note 1
- Click [4] → tries to mark note 4
- And so on
5. System only checks the specific note student selected
6. After all 4 notes are marked (in any order):
- "Excellent! 🎉"
- Move to next question
```
#### 5.5.5 Handling Repeated Notes
```
If same note (string+fret) appears twice in melody:
Example: C4 → D4 → E4 → C4
Display on fretboard:
- When marking first C4: ●₁
- When marking second C4: same point receives ●₄
Point will show:
●₁,₄ (two numbers)
In "Free" mode:
- Click [1] then on point → marks ●₁
- Click [4] then on same point → adds ●₄
```
#### 5.5.6 Visual-Auditory Sync ("Play" Button)
```
When clicking "Play Melody":
1. System plays entire melody
2. During playback of each note:
- If note is already marked on fretboard:
* Point flashes bright green
* timing: 0.2 seconds before note, continues 0.2 seconds after
- If note not yet marked:
* No visual effect
Example:
Melody: C4 → D4 → E4 → F4
Marked: C4, D4
When clicking "Play":
- C4 sounds → ●₁ flashes bright green
- D4 sounds → ●₂ flashes bright green
- E4 sounds → (nothing happens on fretboard)
- F4 sounds → (nothing happens on fretboard)
```
### 5.6 Summary Screen
```
┌─────────────────────────────────────┐
│ Completed! 🎉 │
├─────────────────────────────────────┤
│ │
│ Completed 10 melodies │
│ 23 notes correct on first try │
│ 7 notes required help/more attempts│
│ │
│ [Practice Again] [Back to Home] │
│ │
└─────────────────────────────────────┘
```
**Calculation:**
```
totalMelodies = 10
totalNotes = sum of notes in all melodies
correctFirstTry = how many notes correct on first try
neededHelp = totalNotes - correctFirstTry
```
### 5.7 Technical Requirements - Exercise 2
#### 5.7.1 Data Structures
**Settings Object:**
```javascript
{
source: 'library', // 'library' | 'random'
numNotes: 3, // 1-10 (for random mode)
availableNotes: {
C: true, 'C#': true, D: true, /* ... */ B: true
},
octaveRange: 2, // 1-4
movement: 'mixed', // 'steps' | 'leaps' | 'mixed'
frets: {
from: 0, // 0-23
to: 12 // 1-24 (min 5 frets range)
},
strings: {
E: true, // low E
A: true,
D: true,
G: true,
B: true,
e: true // high E
},
display: {
noteNames: true,
dots: true
},
marking: 'inOrder', // 'inOrder' | 'free'
help: {
enabled: true,
afterAttempts: 3
},
transition: 'auto', // 'auto' | 'manual'
numQuestions: 10
}
```
**Melody Object:**
```javascript
{
id: 1,
name: "Ascending triad sequence",
difficulty: 1,
notes: [
{
note: 'C', // note name
octave: 4,
string: 2, // 0-5 (0=low E, 5=high e)
fret: 3, // 0-24
fullNote: 'C4' // for audio
},
// ... more notes
],
tags: ["sequential", "triadic", "diatonic"]
}
```
**Library Data Structure:**
```javascript
const melodyLibrary = [
{
id: 1,
name: "Single note - E string",
difficulty: 1,
notes: [
{ note: 'F', octave: 4, string: 0, fret: 1, fullNote: 'F4' }
]
},
{
id: 2,
name: "Two notes - ascending step",
difficulty: 1,
notes: [
{ note: 'E', octave: 4, string: 0, fret: 0, fullNote: 'E4' },
{ note: 'F', octave: 4, string: 0, fret: 1, fullNote: 'F4' }
]
},
// ... more melodies, organized from easy to hard
];
```
**Session State:**
```javascript
{
currentQuestion: 1,
totalQuestions: 10,
currentMelody: {}, // Melody object
currentNoteIndex: 0, // which note in melody (0-based)
markedNotes: [
{ noteIndex: 0, string: 0, fret: 1, attempts: 1 },
{ noteIndex: 1, string: 0, fret: 3, attempts: 2 }
],
attempts: {}, // { 0: 1, 1: 3, 2: 1 } - attempts per note
correctFirstTry: 0, // count of notes correct on first try
totalNotes: 0,
isComplete: false
}
```
#### 5.7.2 Core Functions
**getMelody(source, settings, melodyIndex)**
```javascript
/**
* Gets a melody from library or generates random
* @param {String} source - 'library' or 'random'
* @param {Object} settings - Current settings
* @param {Number} melodyIndex - Current melody number in session
* @returns {Object} Melody object
*/
```
**Logic:**
- If source = 'library': return melodyLibrary[melodyIndex]
- If source = 'random': call generateRandomMelody(settings)
**generateRandomMelody(settings)**
```javascript
/**
* Generates a random melody based on settings
* @param {Object} settings
* @returns {Object} Melody object
*/
```
**Logic:**
- Use settings: numNotes, availableNotes, octaveRange, movement, frets, strings
- Generate array of notes with positions on fretboard
- Ensure notes are within available strings and frets
- Apply movement constraints (steps/leaps)
- Return Melody object
**playMelody(melody, highlightCallback)**
```javascript
/**
* Plays a melody with optional visual highlighting
* @param {Object} melody - Melody object
* @param {Function} highlightCallback - Called for each note with (noteIndex, timing)
*/
```
**Logic:**
- Use Tone.js or similar to play sequence
- Tempo: 100 BPM (or configurable)
- Call highlightCallback at right timing for visual sync
**checkNotePosition(selectedString, selectedFret, correctNote)**
```javascript
/**
* Checks if selected position matches correct note
* @param {Number} selectedString - 0-5
* @param {Number} selectedFret - 0-24
* @param {Object} correctNote - Note object from melody
* @returns {Boolean}
*/
```
**calculateFretboardPosition(note, octave, string)**
```javascript
/**
* Calculates fret position for a note on a string
* @param {String} note - Note name (e.g., 'C')
* @param {Number} octave - Octave number
* @param {Number} string - String number (0-5)
* @returns {Number} Fret number (or null if not possible)
*/
```
**Standard tuning:**
```
String 0 (low E): E2
String 1 (A): A2
String 2 (D): D3
String 3 (G): G3
String 4 (B): B3
String 5 (high e): E4
```
#### 5.7.3 UI Components
**Exercise2.jsx**
- Main component
- Manages state: settings, session, currentMelody, markedNotes
- Handles question flow
**Fretboard.jsx**
```javascript
// Props:
- fretRange: { from: number, to: number }
- strings: object (which strings are active)
- showNoteNames: boolean
- showDots: boolean
- markedNotes: array
- currentNoteIndex: number (for highlighting in "inOrder" mode)
- onFretClick: function(string, fret)
- highlightedNote: { string, fret, type } // for flashing during playback
// Behavior:
- Render interactive fretboard
- Click handler for each string+fret intersection
- Display marked notes with numbers (●₁, ●₂, etc.)
- Fade effect for marked notes over time
- Flash effect during melody playback
- Show note names on frets if enabled
- Show dots on frets 3,5,7,9,12,15,17,19,21,24 if enabled
```
**Fretboard structure:**
```
┌─────────────────────────────────┐
│ String labels │ Fret markers │
│ (E,A,D,G,B,E) │ (0,3,5,7,9,12..)│
├─────────────────────────────────┤
│ │
│ E ├──┼──┼──┼──┼──┼──┤ │
│ ●₁ │ <- Marked notes
│ B ├──┼──┼──┼──┼──┼──┤ │
│ │
│ G ├──┼──●₂─┼──┼──┼──┤ │
│ │
│ D ├──┼──┼──┼──┼──┼──┤ │
│ │
│ A ├──┼──┼──┼──┼──┼──┤ │
│ │
│ E ├──┼──┼──┼──┼──┼──┤ │
│ • • • • •• │ <- Dots
│ C D E F G A B C │ <- Note names
│ │
└─────────────────────────────────┘
```
**NoteIndicator.jsx**
```javascript
// Props:
- totalNotes: number
- currentNoteIndex: number
- markedNotes: array
// Behavior:
- Display: "Note 1/4: [●] Note 2/4: [ ] Note 3/4: [ ] Note 4/4: [ ]"
- Current note is highlighted/active
- Marked notes show checkmark [✓]
```
**NoteSelector.jsx** (for "free" mode)
```javascript
// Props:
- totalNotes: number
- selectedNoteIndex: number
- onNoteSelect: function(index)
// Behavior:
- Render buttons: [1] [2] [3] [4]
- Highlight selected button
- Click to change selection
```
**Exercise2Settings.jsx**
```javascript
// Props:
- isOpen: boolean
- settings: object
- onSettingsChange: function
- onClose: function
- onReset: function
// Behavior:
- All settings controls
- Validate constraints
- Real-time updates
```
#### 5.7.4 Random Melody Generation Algorithm
```javascript
function generateRandomMelody(settings) {
const {
numNotes,
availableNotes,
octaveRange,
movement,
frets,
strings
} = settings;
const melody = {
id: Date.now(),
name: "Random melody",
difficulty: null,
notes: [],
tags: ["random"]
};
// Get available strings as array
const availableStrings = Object.keys(strings)
.filter(s => strings[s])
.map((s, i) => i); // [0,1,2,3,4,5]
// Get available notes as array
const noteNames = Object.keys(availableNotes)
.filter(n => availableNotes[n]);
for (let i = 0; i < numNotes; i++) {
let note, octave, string, fret;
let validNote = false;
// Try to generate a valid note
while (!validNote) {
// Random note from available
note = noteNames[Math.floor(Math.random() * noteNames.length)];
// Random octave within range
octave = 4 + Math.floor(Math.random() * octaveRange);
// Random string from available
string = availableStrings[Math.floor(Math.random() * availableStrings.length)];
// Calculate fret for this note on this string
fret = calculateFretboardPosition(note, octave, string);
// Check if fret is in range
if (fret !== null && fret >= frets.from && fret <= frets.to) {
// Check movement constraint if not first note
if (i > 0 && movement !== 'mixed') {
const prevNote = melody.notes[i-1];
const interval = Math.abs(
noteToMidi(note, octave) - noteToMidi(prevNote.note, prevNote.octave)
);
if (movement === 'steps' && interval > 2) continue;
if (movement === 'leaps' && interval <= 2) continue;
}
validNote = true;
}
}
melody.notes.push({
note,
octave,
string,
fret,
fullNote: `${note}${octave}`
});
}
return melody;
}
// Helper function
function noteToMidi(note, octave) {
const noteValues = {
'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};
return (octave + 1) * 12 + noteValues[note];
}
function calculateFretboardPosition(note, octave, string) {
// Standard tuning
const stringNotes = [
{ note: 'E', octave: 2 }, // String 0
{ note: 'A', octave: 2 }, // String 1
{ note: 'D', octave: 3 }, // String 2
{ note: 'G', octave: 3 }, // String 3
{ note: 'B', octave: 3 }, // String 4
{ note: 'E', octave: 4 } // String 5
];
const targetMidi = noteToMidi(note, octave);
const openStringMidi = noteToMidi(
stringNotes[string].note,
stringNotes[string].octave
);
const fret = targetMidi - openStringMidi;
// Valid fret range: 0-24
if (fret >= 0 && fret <= 24) {
return fret;
}
return null; // Not playable on this string
}
```
#### 5.7.5 Recommended Libraries
**Audio:**
- **Tone.js** - for playing melodies with precise timing
**Visualization:**
- **Canvas API** or **SVG** for drawing fretboard
- Or dedicated fretboard library (if available)
**Animation:**
- **CSS transitions** for flashes and fade effects
- **requestAnimationFrame** for audio sync
---
## 6. Shared Components
### 6.1 Header Component
```javascript
// Props:
- title: string
- showSettings: boolean
- showStop: boolean
- currentQuestion: number | null
- totalQuestions: number | null
- onSettingsClick: function
- onStopClick: function
// Renders:
┌─────────────────────────────────────────────┐
│ ⚙️ [Settings] [X Stop] Question 3/10 │
└─────────────────────────────────────────────┘
```
### 6.2 ProgressBar Component
```javascript
// Props:
- current: number
- total: number
- showPercentage: boolean
// Renders:
████████░░░░░░ 70%
// Calculation:
percentage = (current / total) * 100
```
### 6.3 AudioPlayer Utility
```javascript
/**
* Centralized audio management
*/
class AudioPlayer {
constructor() {
// Initialize Tone.js or audio context
}
playNote(note, duration = 1) {
// Play single note
}
playSequence(notes, tempo = 100, onNoteStart = null) {
// Play sequence of notes
// Call onNoteStart(index, timing) for each note
}
stop() {
// Stop all audio
}
}
```
### 6.4 Storage Utility
```javascript
/**
* LocalStorage management
*/
const Storage = {
saveSettings(exerciseId, settings) {
const key = `exercise${exerciseId}Settings`;
localStorage.setItem(key, JSON.stringify(settings));
},
loadSettings(exerciseId, defaults) {
const key = `exercise${exerciseId}Settings`;
const saved = localStorage.getItem(key);
return saved ? JSON.parse(saved) : defaults;
},
saveProgress(exerciseId, progress) {
const key = `exercise${exerciseId}Progress`;
localStorage.setItem(key, JSON.stringify(progress));
},
loadProgress(exerciseId) {
const key = `exercise${exerciseId}Progress`;
const saved = localStorage.getItem(key);
return saved ? JSON.parse(saved) : null;
},
clearAll() {
localStorage.clear();
}
};
```
---
## 7. Technical Requirements
### 7.1 Supported Browsers
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
### 7.2 Required Features
**Web Audio API / Tone.js:**
- Play musical notes
- Precise timing
- Sequencer for melodies
**LocalStorage:**
- Save settings
- Save progress (optional)
**Responsive Design:**
- Mobile and tablet support
- Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
### 7.3 File Structure
```
/public
/audio (optional - if using audio files)
/notes
C4.mp3
D4.mp3
...
/src
/components
/common
Header.jsx
SettingsPanel.jsx
ProgressBar.jsx
SummaryScreen.jsx
/home
HomePage.jsx
ExerciseCard.jsx
/exercise1
Exercise1.jsx
NoteButtons.jsx
Exercise1Settings.jsx
/exercise2
Exercise2.jsx
Fretboard.jsx
NoteIndicator.jsx
NoteSelector.jsx
Exercise2Settings.jsx
/utils
AudioPlayer.js
Storage.js
noteGeneration.js
melodyGeneration.js
fretboardCalculations.js
/constants
notes.js
defaults.js
melodyLibrary.js
/styles
global.css
variables.css
animations.css
App.jsx
main.jsx
package.json
```
### 7.4 Recommended Dependencies
```json
{
"dependencies": {
"react": "^18.x",
"react-dom": "^18.x",
"react-router-dom": "^6.x",
"tone": "^14.x"
},
"devDependencies": {
"vite": "^4.x",
"@vitejs/plugin-react": "^4.x"
}
}
```
### 7.5 Constants
**notes.js**
```javascript
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const REFERENCE_NOTE = 'C4';
export const GUITAR_STRINGS = [
{ name: 'E', openNote: 'E2', index: 0 },
{ name: 'A', openNote: 'A2', index: 1 },
{ name: 'D', openNote: 'D3', index: 2 },
{ name: 'G', openNote: 'G3', index: 3 },
{ name: 'B', openNote: 'B3', index: 4 },
{ name: 'e', openNote: 'E4', index: 5 }
];
export const FRET_DOTS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
export const DOUBLE_DOTS = [12, 24];
```
**defaults.js**
```javascript
export const DEFAULT_EXERCISE1_SETTINGS = {
availableNotes: {
C: true, 'C#': true, D: true, 'D#': true, E: true, F: true,
'F#': true, G: true, 'G#': true, A: true, 'A#': true, B: true
},
octaveRange: 2,
playC: 'everyTime',
transition: 'auto',
numQuestions: 10
};
export const DEFAULT_EXERCISE2_SETTINGS = {
source: 'library',
numNotes: 3,
availableNotes: {
C: true, 'C#': true, D: true, 'D#': true, E: true, F: true,
'F#': true, G: true, 'G#': true, A: true, 'A#': true, B: true
},
octaveRange: 2,
movement: 'mixed',
frets: { from: 0, to: 12 },
strings: {
E: true, A: true, D: true, G: true, B: true, e: true
},
display: {
noteNames: true,
dots: true
},
marking: 'inOrder',
help: {
enabled: true,
afterAttempts: 3
},
transition: 'auto',
numQuestions: 10
};
```
### 7.6 Styling and Design
**Global Variables (variables.css)**
```css
:root {
/* Colors */
--color-primary: #2196F3;
--color-success: #4CAF50;
--color-error: #F44336;
--color-warning: #FFC107;
--color-hint: #FFD54F;
--color-bg: #FFFFFF;
--color-bg-secondary: #F5F5F5;
--color-text: #212121;
--color-text-secondary: #757575;
/* Spacing */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
/* Typography */
--font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 20px;
--font-size-xl: 24px;
/* Transitions */
--transition-fast: 0.15s ease;
--transition-normal: 0.3s ease;
--transition-slow: 0.5s ease;
/* Borders */
--border-radius: 8px;
--border-color: #E0E0E0;
}
```
**Animations (animations.css)**
```css
/* Fade in */
@keyframes fadeIn {
from { opacity: 0; }
to { opacity: 1; }
}
/* Slide in from right */
@keyframes slideInRight {
from { transform: translateX(100%); }
to { transform: translateX(0); }
}
/* Flash/pulse */
@keyframes flash {
0%, 100% { opacity: 1; }
50% { opacity: 0.3; }
}
/* Success pulse */
@keyframes successPulse {
0% { transform: scale(1); }
50% { transform: scale(1.1); }
100% { transform: scale(1); }
}
```
### 7.7 Accessibility
**Guidelines:**
- All buttons with appropriate `aria-label`
- Keyboard navigation support (Tab, Enter, Escape)
- Color contrast according to WCAG AA
- Clear focus indicators
- Status messages with `aria-live`
**Examples:**
```html
<button aria-label="Play C">🔊 Play C</button>
<button aria-label="Settings">⚙️</button>
<div role="status" aria-live="polite">Correct! ✅</div>
```
### 7.8 Performance
**Optimizations:**
- Lazy loading of exercises
- Memoization of heavy components (Fretboard)
- Debounce on settings changes
- Audio preloading (if using audio files)
- Virtual scrolling for long lists
---
## Summary
This document provides complete and detailed specifications for:
- **Home Screen** - entry point with pedagogical information
- **Exercise 1 - Interval Recognition** - developing relative pitch
- **Exercise 2 - Fretboard Mapping** - connecting hearing to guitar space
The document includes:
✅ Detailed screen structures
✅ All settings and parameters
✅ Step-by-step workflows
✅ Technical data structures
✅ Functions and algorithms
✅ UI components
✅ Technical requirements
✅ Library recommendations
The document is ready for use in developing the application.
**Next version will include:**
- Exercise 3 - Melody over Chords (after specification)
- Management page (optional)
- Level and progress system (optional)
---
**Creation Date:** November 2025
**Author:** Mario (with Claude)
**Status:** Approved for Development