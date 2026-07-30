# Partial Chords Tab — Implementation Spec

## Overview

Add a new tab called **"Partial Chords"** to `ScalePositionsPage`, alongside the existing Positions / Arpeggios / All Scales tabs.

The tab lets the user build a chord progression (sequence of chords), and for each chord it shows navigation cards — one per chord — where each card displays a mini fretboard diagram of a specific voicing (partial chord shape). The user can flip between CAGED shapes and string sets within each card.

---

## What Are Partial Chords

A **partial chord** (אקורד חלקי) is a subset of 3 adjacent strings taken from a full CAGED arpeggio shape, played simultaneously as a chord voicing — not as a solo line.

### The 5 CAGED Arpeggio Shapes

Each CAGED shape defines which chord tone (1, 3, 5 for major; 1, b3, 5 for minor) sits on each of the 6 strings, and at which fret *within the shape*. The fret positions below are **relative offsets from the shape's starting fret** (i.e. fret 0 = the nut or barre position of the shape):

#### Major shapes

| Shape | String 6 | String 5 | String 4 | String 3 | String 2 | String 1 |
|-------|----------|----------|----------|----------|----------|----------|
| C     | —        | 1 (f0)   | 5 (f2)   | 1 (f2)   | 3 (f1)   | 5 (f0)   |
| A     | —        | 1 (f0)   | 5 (f2)   | 1 (f2)   | 3 (f2)   | —        |
| G     | 3 (f2)   | 1 (f0)   | 5 (f0)   | 1 (f0)   | 3 (f0)   | 1 (f0)   |
| E     | 1 (f0)   | 5 (f2)   | 1 (f2)   | 3 (f1)   | 5 (f0)   | 1 (f0)   |
| D     | —        | —        | 1 (f0)   | 5 (f2)   | 1 (f3)   | 3 (f2)   |

#### Minor shapes (same fret offsets, b3 replaces 3)

| Shape | String 6 | String 5 | String 4 | String 3 | String 2 | String 1 |
|-------|----------|----------|----------|----------|----------|----------|
| C     | —        | 1 (f0)   | 5 (f2)   | 1 (f2)   | b3 (f1)  | 5 (f0)   |
| A     | —        | 1 (f0)   | 5 (f2)   | 1 (f2)   | b3 (f1)  | —        |
| G     | b3 (f2)  | 1 (f0)   | 5 (f0)   | 1 (f0)   | b3 (f0)  | 1 (f0)   |
| E     | 1 (f0)   | 5 (f2)   | 1 (f2)   | b3 (f0)  | 5 (f0)   | 1 (f0)   |
| D     | —        | —        | 1 (f0)   | 5 (f2)   | 1 (f3)   | b3 (f1)  |

**Note on Am shape:** The original Am open chord has b3 on string 2 at fret 1 (not fret 2 like the major A shape). Adjust accordingly.

### The 4 String Sets

Within each shape, the user selects one of 4 groups of 3 adjacent strings:

| Set name    | Strings (low→high) |
|-------------|-------------------|
| Strings 6-4 | 6, 5, 4           |
| Strings 5-3 | 5, 4, 3           |
| Strings 4-2 | 4, 3, 2           |
| Strings 3-1 | 3, 2, 1           |

The diagram highlights the 3 strings of the active set; the other strings are shown dimly for context.

### Set Types (important for pedagogy, display only — not needed for logic)

- **Type A (full):** The 3 highlighted strings contain all 3 chord tones (1, 3/b3, 5) in some order
- **Type B (partial):** The 3 highlighted strings contain the root twice (as octave) + one other tone

The UI can optionally display a badge "A" or "B" below each card, but this is not critical for v1.

---

## Translating CAGED Shapes to Actual Fret Positions

The app already has the full infrastructure to do this. The key utility is:

```js
// src/utils/positionCalculations.js
getPositionRanges(position, selectedRoot, selectedType)
// → returns [{name, fretStart, fretEnd}, ...] (primary + octave mirrors)

getSemitoneOffsetFromC(selectedRoot, selectedType)
// → how many semitones to shift all C/Am base fret offsets
```

The base fret ranges for C/Am are in `C_AM_POSITION_RANGES`:
```js
C: { fretStart: 0, fretEnd: 3 }
A: { fretStart: 2, fretEnd: 6 }
G: { fretStart: 4, fretEnd: 8 }
E: { fretStart: 7, fretEnd: 10 }
D: { fretStart: 9, fretEnd: 13 }
```

To get the actual fret of a note within a shape for any key:
```
actualFret = shapeBaseFret + relativeOffset + semitoneOffsetFromC
```

Where `shapeBaseFret = C_AM_POSITION_RANGES[shape].fretStart`.

**Example:** Shape E, String 5, tone "5" is at relative offset f2.
For A minor: semitoneOffset = 0 (Am is relative to C major, offset = 0).
actualFret = 7 + 2 + 0 = fret 9.

For D minor: semitoneOffset = 2 (D major is 2 semitones above C).
actualFret = 7 + 2 + 2 = fret 11.

Notes at f0 (open string / barre) go *above* the nut line in the diagram (standard chord diagram convention).

---

## Fretboard Diagram in Cards

Each card shows a **mini chord diagram** (vertical orientation, not horizontal like the main fretboard):

- 6 vertical lines = 6 strings (string 6 leftmost, string 1 rightmost)
- 4 horizontal lines = 4 frets of the shape's window
- Nut/barre line at the top (thick)
- Dots on the correct fret positions of the full shape (all 6 strings, dimmed where not in the active set)
- Dots for the 3 active strings: larger, colored, labeled with tone name (1, 3/b3, 5)
- Muted strings (— in the shape tables): show an "x" above the nut

The diagram does **not** need to know actual pitch names — it only needs the relative fret offsets and which strings are active in the current set.

---

## UI Structure

### Tab Header

Add a 4th tab button:
```jsx
<button className={`tab-btn ${activeTab === 'partialchords' ? 'active' : ''}`}
        onClick={() => handleTabChange('partialchords')}>
  Partial Chords
</button>
```

### State to Add in ScalePositionsPage

```js
// Chord progression: array of { root, quality, cagedIdx, setIdx }
const [partialChordsProgression, setPartialChordsProgression] = useState([]);
```

`cagedIdx` = index into ['C','A','G','E','D'] (0–4)
`setIdx` = index into the 4 string sets (0–3)

### Tab Content Layout

```
┌─────────────────────────────────────────┐
│  Root: [select]  Quality: [Maj] [Min]   │
│  [+ Add]  [Clear]                       │
├─────────────────────────────────────────┤
│  Progression pills: [Am] [G] [C] [F] … │
├─────────────────────────────────────────┤
│  Cards row (horizontal scroll):         │
│  ┌──────────┐ ┌──────────┐             │
│  │ Am       │ │ G        │             │
│  │ CAGED: ‹E›│ │ CAGED: ‹G›│          │
│  │[diagram] │ │[diagram] │             │
│  │ ‹ 3-1 › │ │ ‹ 5-3 › │             │
│  │ 1+b3+5  │ │ 5+1+3   │             │
│  └──────────┘ └──────────┘             │
└─────────────────────────────────────────┘
```

### Card Component: `PartialChordCard`

Props:
- `chord` — `{ root, quality, cagedIdx, setIdx }`
- `isActive` — boolean (highlighted border)
- `onSelect` — click handler
- `onNavCaged(dir)` — +1 / -1
- `onNavSet(dir)` — +1 / -1

The card is split into two visual sections:

**Top section (CAGED shape):**
- Chord name (e.g. "Am")
- Label "CAGED:"
- `‹ E ›` nav arrows + current letter

**Bottom section (string set):**
- Set label (e.g. "Strings 3-1") with `‹ ›` nav arrows
- Mini fretboard diagram (SVG)
- Tone label line: "1 + b3 + 5" or "1 + 5 + 1" etc.

---

## New Files to Create

```
src/components/positions/
  PartialChordsTab.jsx        — main tab container (progression builder + cards row)
  PartialChordsTab.css
  PartialChordCard.jsx        — individual chord card
  PartialChordCard.css
```

And a new utility function (add to `positionCalculations.js` or a new file):

```js
/**
 * Get the partial chord shape data for a given chord and CAGED shape.
 * Returns an array of 6 entries (one per string, index 0 = string 6):
 *   null  → string not played in this shape
 *   { tone: '1'|'3'|'b3'|'5', fretOffset: number }
 *
 * fretOffset is relative to the shape's fretStart in C/Am.
 * To get actual fret: add getSemitoneOffsetFromC(root, quality).
 */
function getPartialChordShape(cagedLetter, quality)
```

The raw data for this function is the table in the "CAGED Arpeggio Shapes" section above — just hardcode it as a JS object.

---

## What NOT to Build in v1

- No audio playback from the cards
- No "type A / type B" badge (nice to have, not required)
- No drag-to-reorder progression pills
- No saving/loading progressions

---

## Integration Checklist

- [ ] Add `partialchordsProgression` state and handlers to `ScalePositionsPage`
- [ ] Add "Partial Chords" tab button (4th button)
- [ ] Add tab content branch in JSX
- [ ] Create `PartialChordsTab.jsx` + CSS
- [ ] Create `PartialChordCard.jsx` + CSS (with SVG mini diagram)
- [ ] Add `getPartialChordShape()` utility
- [ ] Verify fret calculation matches existing shapes for Am / C / G roots as sanity check
