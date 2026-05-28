# Level 2 — Deferred .sty Features

> Corpus-grounded inventory of every `.sty`-internal field the parser captures
> but the runtime engine does not yet consume. A future session can ask
> "What's in Level 2 that we don't handle?" and use this doc to pick the next
> feature to wire up.
>
> Generated from `scripts/analyze-level2.mjs` against the 48-style corpus in
> `public/styles-native/`. Re-run it whenever the corpus changes.

---

## Corpus snapshot (re-run `node scripts/analyze-level2.mjs` to refresh)

- **Styles:** 48
- **Channels:** 7,579
- **SFF1 / SFF2:** 44 / 4 — four styles ship SFF2 sections
- **Time signatures:** 4/4 (45), 3/4 (2), 5/4 (1)
- **Division:** BINARY (28), EIGHTH_SHUFFLE (14), EIGHTH_TRIPLET (6)

### NTR (Note Transposition Rule) distribution

| NTR | channels | what the engine does today |
|---|---|---|
| `ROOT_TRANSPOSITION` | 4172 | ✅ handled |
| `ROOT_FIXED`         | 3347 | ✅ handled |
| `GUITAR`             |   60 | ⚠ falls back to MELODY-style transposition |

### NTT distribution

| NTT | channels | engine behaviour today |
|---|---|---|
| `BYPASS`            | 3224 | ✅ no transpose, copy through |
| `CHORD`             | 2286 | ✅ fit-chord-phrase logic |
| `MELODY`            | 1420 | ✅ fit-melody-phrase logic |
| `MELODIC_MINOR`     |  185 | ⚠ Level 2 — likely falls back to MELODY |
| `DORIAN_5`          |  172 | ⚠ Level 2 |
| `MELODIC_MINOR_5`   |  146 | ⚠ Level 2 |
| `HARMONIC_MINOR`    |   86 | ⚠ Level 2 |
| `ARPEGGIO`          |   40 | ⚠ Level 2 (GUITAR-only) |
| `ALL_PURPOSE`       |   15 | ⚠ Level 2 (GUITAR-only) |
| `STROKE`            |    5 | ⚠ Level 2 (GUITAR-only) |

8.4% of channels (≈635 / 7,579) use a Level-2 NTT variant. The engine currently
maps these to the closest Level-1 equivalent inside `Transposer.js` — confirm
the exact fallback before claiming "handled".

### RTR (Retrigger Rule) distribution

| RTR | channels | engine behaviour today |
|---|---|---|
| `PITCH_SHIFT`         | 6321 | ✅ default path |
| `PITCH_SHIFT_TO_ROOT` |  913 | ⚠ Level 2 — verify |
| `RETRIGGER`           |  329 | ⚠ Level 2 |
| `STOP`                |   15 | ⚠ Level 2 |
| `RETRIGGER_TO_ROOT`   |    1 | ⚠ Level 2 |
| `NOTE_GENERATOR`      |    0 | not present in corpus |

---

## Section 1 — `ctb2Low` / `ctb2High` (pitch-band conditional re-mapping)

**Status:** parser populates, engine ignores (`Transposer.js` reads `ctb2Main` only).

| Feature | channels | styles |
|---|---|---|
| `ctb2Low` non-null  |  8 | 2 (`country_modern`, `rock_brit`) |
| `ctb2High` non-null | 72 | 2 (`blues_shuffle`, `rock_brit`) |
| `ctb2MiddleLowPitch`/`MiddleHighPitch` set | 574 | many |

**What it means in JJazzLab:** the chord-fitting pipeline can use *different*
NTR/NTT rules depending on whether the destination chord's root sits below
`ctb2MiddleLowPitch` or above `ctb2MiddleHighPitch`. E.g., a bass phrase might
need re-arpeggiation when the chord goes very high (so the bass doesn't blow
the speaker) vs. left alone in the comfortable middle range.

**To implement:** in `Transposer.fitNotes()`, before picking `ctb2Main`, check
destination root against `MiddleLowPitch` / `MiddleHighPitch` and route to
`ctb2Low` / `ctb2High` accordingly. Each subpart has its own ntr/ntt/limits.

**Effort:** ~30 lines in `Transposer.js`. Affects only the 80 channels that
populate Low/High — but those two styles (`rock_brit`, `country_modern`) may
sound noticeably different after.

---

## Section 2 — RTR variants beyond `PITCH_SHIFT`

**Status:** parser captures, engine path is unclear — needs audit.

`PITCH_SHIFT` is the default behavior (transpose notes still ringing when the
chord changes). Other RTR values are:
- `STOP` (15 ch) — kill ringing notes on chord change
- `RETRIGGER` (329 ch) — re-attack same notes at new chord
- `RETRIGGER_TO_ROOT` (1 ch) — re-attack at chord root
- `PITCH_SHIFT_TO_ROOT` (913 ch) — transpose to chord root specifically

**To audit:** read `BackingTrackEngine.scheduleNotes()` and confirm whether
`ctab.ctb2Main.rtr` is read on chord transitions. Likely answer: no — the
engine schedules per-bar phrases independently.

**Effort:** moderate — requires tracking note-on/note-off events across bar
boundaries, then applying the RTR rule at the seam.

---

## Section 3 — Level-2 NTT scale variants

**Status:** parser captures the name, `Transposer.js` likely falls back.

The 14 NTT names are documented in `StyleParser.js:70-85`. Today's engine
handles `BYPASS`, `CHORD`, `MELODY` natively (6930 / 7579 channels = 91.4%).
The other 11 are scale-aware mappings that re-interpret the source phrase
through a different mode:

- `MELODIC_MINOR` / `MELODIC_MINOR_5`
- `HARMONIC_MINOR` / `HARMONIC_MINOR_5`
- `NATURAL_MINOR` / `NATURAL_MINOR_5` (not seen in corpus)
- `DORIAN` / `DORIAN_5`
- `ALL_PURPOSE` / `STROKE` / `ARPEGGIO` (GUITAR-only)

**NTT × AccType matrix** — where the variants live:

```
BASS:    MELODY 698  BYPASS 291  MELODIC_MINOR_5 29  MELODIC_MINOR 22  HARMONIC_MINOR 15  DORIAN_5 14  CHORD 4
CHORD1:  CHORD 656  BYPASS 377  MELODY 212  MELODIC_MINOR_5 27  MELODIC_MINOR 25  HARMONIC_MINOR 15  ALL_PURPOSE 15  DORIAN_5 12  ARPEGGIO 12  STROKE 5
CHORD2:  CHORD 511  BYPASS 324  MELODY 155  DORIAN_5 63  MELODIC_MINOR 50  HARMONIC_MINOR 20  MELODIC_MINOR_5 19  ARPEGGIO 13
PAD:     CHORD 639  BYPASS 211  MELODY 130  MELODIC_MINOR 32  HARMONIC_MINOR 17  DORIAN_5 13  MELODIC_MINOR_5 11
PHRASE1: CHORD 296  BYPASS 218  MELODY 158  DORIAN_5 52  MELODIC_MINOR 42  MELODIC_MINOR_5 30  HARMONIC_MINOR 13  ARPEGGIO 13
PHRASE2: CHORD 180  BYPASS 161  MELODY 67   MELODIC_MINOR_5 30  DORIAN_5 18  MELODIC_MINOR 14  HARMONIC_MINOR 6  ARPEGGIO 2
RHYTHM:    BYPASS 993
SUBRHYTHM: BYPASS 649
```

**Implementation source:** JJazzLab `YamJJazzRhythmGenerator.java` and `YamScales.java`
define the scale tables. Port the tables to JS (one array of intervals per scale).
In `Transposer.fitMelodyPhrase()`, pick the table by `ntt` instead of hard-coding
the major scale.

**Effort:** ~150 lines including scale tables + table-routing logic in fitMelodyPhrase.
The audible change targets phrase channels on minor-key destinations.

---

## Section 4 — `mutedNotes` (per-pitch mute mask)

**Status:** parser captures, `ChordEngine` consults only `mutedChords`.

54 channels in the corpus populate `mutedNotes` (a list of pitch classes 0-11
that should be muted on that channel regardless of chord). Rare, but free to
wire up.

**To implement:** in `ChordEngine.generatePhrasesForChord()`, after computing
the destination phrase, drop notes whose `pitch % 12` is in `ctab.mutedNotes`.

**Effort:** ~10 lines.

---

## Section 5 — `bassOn`, `chordRootUpperLimit`

**Status:** parser captures both. Behaviour today unclear.

- `bassOn=true` appears in 1,033 channels (mostly BASS). JJazzLab: when true,
  the lowest note of the destination chord is replaced with the chord's bass note
  (slash chord support). The engine may or may not honour this.
- `chordRootUpperLimit` is set on **all** 7,579 channels — so this isn't a
  sparse-feature flag, it's a per-channel value. JJazzLab: caps how high the
  chord root can transpose; above the cap, transpose down an octave. Verify
  `Transposer.fitNotes()` applies this.

**Effort:** investigation first (read JJazzLab source on these two); if not
honoured, ~20 lines to wire up.

---

## Section 6 — `GUITAR` NTR sub-rules (ALL_PURPOSE / STROKE / ARPEGGIO)

**Status:** 60 channels in 4-6 styles use `ntr=GUITAR`. The engine currently
transposes them with the generic MELODY/CHORD pipeline.

`ALL_PURPOSE` (15) — guitar phrase usable for any chord, with internal logic to
pick voicings on the fly. `STROKE` (5) — strumming pattern that re-voices per
chord. `ARPEGGIO` (40) — arpeggiated pattern that re-orders notes per chord.

**Implementation:** JJazzLab's `YamGuitarChordVoicings.java` and
`YamGuitarStroke.java`. Most complex of the Level-2 work — proper guitar voicing
requires chord-quality awareness (which strings to mute, which fingering).

**Effort:** high. Likely 300+ lines. Affects audio quality on the styles that
actually use these (mostly Country/Brazilian guitar styles in our corpus).

---

## Section 7 — Non-CMaj source chords

**Status:** 6,399 / 7,579 channels (84%) report `sourceChordNote !== 0` OR
`sourceChordType !== 'Maj'`. This was expected to be rare but turns out to be
the norm.

JJazzLab's convention: most Yamaha styles author phrases against the C / Maj
source chord. Our parser reads `sourceChordNote` and `sourceChordType` straight
from the .sty bytes; the corpus shows authors do **not** uniformly write to
C / Maj.

**Action:** confirm `Transposer.js` reads these fields when computing the source
→ destination delta. If it hard-codes C / Maj, transpositions for the 84%
non-CMaj channels are off by the difference — which would have been audible
already in the 46-style listening QA, so the engine likely handles this
correctly. Treat this section as "verify and remove from Level 2" once confirmed.

---

## Section 8 — Anticipations & accents (Sdec/Cntt subsections)

**Status:** parser does not surface this section yet.

Yamaha styles can specify per-beat *anticipation* (a note attack pulled earlier
to land on a chord change) and *accents* (velocity bumps on specific beats).
`StyleParser.js` walks Sdec / Ctab / Ctb2 / Cntt — anticipation lives in Sdec
flags that our parser may already capture but expose under different field
names, or skip entirely. Audit needed.

**To implement:** read `CASMDataReader.java` § Sdec parsing in JJazzLab; mirror
the bits into our parsed object; have `ChordEngine` shift note positions /
amplify velocity at chord transitions.

**Effort:** moderate. ~50 lines in parser + ~30 in engine.

---

## Section 9 — Multi-phrase channels (variations per part)

**Status:** Unclear whether parser flattens or preserves.

`VariationSelector.js`'s comments hint that some SFF2 styles have multiple
phrases per channel within a single StylePart (so the engine can randomly pick
each loop for variety). Our `parts[X].channels[Y].notes` is a flat array — if
the parser is concatenating multiple phrases without separator, our output is
musically wrong on those channels.

**To audit:** pick a known SFF2 style (`rock_brit`, `country_modern`) and
inspect `Main_A.channels` lengths. Compare to JJazzLab's playback of the same
style.

**Effort:** investigation first; if confirmed, the schema needs to change to
`channels[Y].phrases: [{ notes: [...] }, ...]`, which is a non-trivial schema
extension and engine update.

---

## How to extend this doc

When you add a new Level-2 feature to the engine, **delete its section here**
(or move it to a "Done" archive). Re-run `node scripts/analyze-level2.mjs` so
the corpus snapshot stays current.

When you find a new feature the parser ignores, add a section above with the
same format: name → corpus stats → JJazzLab source pointer → effort estimate.
