/**
 * Generates docs/lesson-backing-tracks-spec.md from src/data/lessonBackingTracks.js
 * (the single source of truth). Do not edit the .md by hand — edit the data / this script.
 *
 *   node scripts/gen-lesson-spec.mjs          # write
 *   node scripts/gen-lesson-spec.mjs --check  # exit 1 if the committed doc is stale
 */
import fs from 'fs'
import path from 'path'
import {
  COURSE, LESSONS, TRACKS, TRACKS_BY_ID, TRACK_TYPES, NECKS, trackBars, exportPlanFor,
  TARGET_SEC, MIN_SEC, MAX_SEC, INTRO_ENDING_ALLOWANCE_SEC,
} from '../src/data/lessonBackingTracks.js'
import { shapeCells, majorRootOf } from '../src/constants/neckShapes.js'
import { C_AM_POSITION_RANGES } from '../src/constants/positionData.js'
import { formatDuration, MAX_REPETITIONS, MAX_ROTATE_EVERY, MAX_EXPORT_SEC, VIDEO_BITRATES, AUDIO_BITRATE } from '../src/lib/video-export/exportPlan.js'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(ROOT, 'docs/lesson-backing-tracks-spec.md')

// App style labels, read from the genre catalog source (that module is browser-only).
const engineSrc = fs.readFileSync(path.join(ROOT, 'src/components/backing-tracks/useBackingTrackEngine.js'), 'utf8')
const STYLE_LABEL = {}
for (const m of engineSrc.matchAll(/\{ id: '([a-z0-9_]+)',\s*label: (['"])(.*?)\2/g)) STYLE_LABEL[m[1]] = m[3]

const keyLabel = (k) => `${k.root}${k.type === 'minor' ? 'm' : ''}`
const sec = (s) => `${formatDuration(s)}`
const r1 = (x) => (Math.round(x * 100) / 100).toString()
const SHAPE_NAME = {
  caged_C: 'CAGED C', caged_A: 'CAGED A', caged_G: 'CAGED G', caged_E: 'CAGED E', caged_D: 'CAGED D',
  octave_134: 'Octave 1-3-4', octave_124: 'Octave 1-2-4', octave_hybrid: 'Octave hybrid',
  nps3_1: '3NPS from 1', nps3_2: '3NPS from 2', nps3_3: '3NPS from 3', nps3_4: '3NPS from 4',
  nps3_5: '3NPS from 5', nps3_6: '3NPS from 6', nps3_7: '3NPS from 7',
}
const SCALE_NAME = { aeolian: 'Aeolian (Minor scale)', ionian: 'Ionian (Major scale)', major_pent: 'Major pentatonic', minor_pent: 'Minor pentatonic' }

function formText(bars) {
  // Run-length "bars per chord": e.g. Am(2) G7(2) …
  const out = []
  for (const b of bars) {
    const last = out[out.length - 1]
    if (last && last.c === b) last.n++
    else out.push({ c: b, n: 1 })
  }
  return out.map(x => (x.c.includes(' ') ? `[${x.c.replace(' ', ' / ')}]½+½` : x.c) + (x.n > 1 ? `×${x.n}` : '')).join(' · ')
}

function cellsByString(list) {
  const by = {}
  for (const [s, f] of list) (by[s] ||= []).push(f)
  return [6, 5, 4, 3, 2, 1].map(s => `${s}: ${(by[s] || []).join(',') || '–'}`).join(' │ ')
}

function viewsText(views) {
  const v = views[0]
  const scale = v.scaleId ? `${SCALE_NAME[v.scaleId] ?? v.scaleId}, root ${v.root}` : 'chord tones only (scale "none")'
  return `${views.map(x => SHAPE_NAME[x.shapeId]).join(' → ')}; ${scale}; shape key ${v.shapeKey}; display "Note names"`
}

const L = []
const p = (s = '') => L.push(s)

p(`# Lesson backing tracks — "${COURSE.titleHe}" (${COURSE.titleEn})`)
p()
p('> **Generated file** — `node scripts/gen-lesson-spec.mjs` from `src/data/lessonBackingTracks.js` (single source of truth for this spec *and* the in-app lesson module). Do not hand-edit; `npm test` fails if this file is stale.')
p()
p(`Source: ${COURSE.sourceDoc} (lesson summaries, exported 2026-11). YouTube metadata/frames saved outside the repo (\`/workspace/night-build-11-17/yt/\`).`)
p()
p('## 0. Legend — what is read vs. inferred')
p()
p('| Mark | Meaning |')
p('|---|---|')
p('| **[YT]** | Read from Mario\'s YouTube video: chords + form read off the Band-in-a-Box chord chart shown on screen; BPM **measured** from the bar-highlight timing (frame-difference events, 97–322 bar changes per video, all intervals within 10 % of the median; BPM = 240 / bar-seconds, assuming 4/4); source repeats = (bars played) / (form length). |')
p('| **[style≈]** | The BIAB style name comes from the video title; the **app style** chosen to replace it is *our* closest match (inferred). |')
p('| **[new]** | Extra style/variant suggested here so each track type has ≥ 5 styles (inferred; not in Mario\'s material). |')
p('| **[lesson-inferred]** | The lesson text has no backing-track link; the list is our suggestion (see open questions). |')
p('| Neck shapes | Octave positions: cells copied from Mario\'s Guitar Scientist diagram data (read). CAGED windows: the app\'s existing Positions-tab ranges (read from code; consistent with the "AM-G7_C-G7 - CAGED" PDF fret labels). 3NPS: computed (inferred — lesson 12 only names the idea). |')
p()
p('Time signature: every source chart is 4/4 (BIAB 4-beat bars; measured bar lengths match 4 beats at round BPMs). Exception to verify: "C F G - Spanish dance" could be 3/4 at 90 BPM — it is specced as 4/4 at 120 (open question).')
p()

p('## 1. How to batch-export with the 🎬 dialog (PR #13)')
p()
p('For **every row** in the lesson tables below:')
p()
p('1. Open **Backing Tracks** → bottom tab **Templates** (📄) → tab **🎓 Lessons / שיעורים**.')
p('2. Press the lesson number, then **Load / טען** on the row\'s preset (group = progression, title = app style). This fills style, chords, tempo, key, the live neck view **and the 🎬 export settings**. It never starts playback.')
p('3. Press **🎬** (info strip). The dialog is already filled with the values in the row: *Repetitions*, *Change neck view every*, and the *Neck views* list (each view: shape select = the listed shape, shape key = listed key, scale + root as listed, display "Note names").')
p('4. Leave *Video size* at **720p** (≈ 2.5 Mbit/s video + 160 kbit/s audio → ≈ 120 MB for 6 min). Press **Start export**, keep the tab in front, then **Download**.')
p()
p(`Duration math (shown per row): *rep* = beats × 60 / BPM; repetitions = round(${TARGET_SEC} s / rep) nudged into [${MIN_SEC}, ${MAX_SEC - INTRO_ENDING_ALLOWANCE_SEC}] s so that count-in (style intro) + ending (≈ ${INTRO_ENDING_ALLOWANCE_SEC} s allowance) still land inside 5–10 min; neck view changes every round(60 s / rep) repetitions (≈ once a minute). "Dialog" = the dialog's own estimate (adds a 1-bar count-in).`)
p()

p('## 2. Exporter check for 5–10 minute videos (done on this branch)')
p()
p('| Risk found in PR #13 | Fix |')
p('|---|---|')
p(`| Repetitions capped at 32 → a 4-bar vamp at 190 BPM maxed out at ~2:42 | \`MAX_REPETITIONS\` = ${MAX_REPETITIONS}; real limit is now duration: \`MAX_EXPORT_SEC\` = ${MAX_EXPORT_SEC / 60} min (Start disabled + message above it) |`)
p(`| Only a ± stepper — reaching 119 repetitions meant 119 taps | One-tap **≈5 / ≈7 / ≈10 min** buttons (\`repetitionsForMinutes\`) |`)
p(`| "Change view every" capped at 16 | \`MAX_ROTATE_EVERY\` = ${MAX_ROTATE_EVERY} |`)
p(`| 4 / 8 Mbit/s video → ~300–600 MB for 10 min held in memory | ${VIDEO_BITRATES['720p'] / 1e6} / ${VIDEO_BITRATES['1080p'] / 1e6} Mbit/s (mostly static graphics) + ${AUDIO_BITRATE / 1000} kbit/s audio; size estimate shown; chunk array released after the Blob is built |`)
p('| Screen sleep / background tab throttles timers → frozen video on long runs | Screen Wake Lock held during export (re-taken when the tab returns); time spent hidden is measured and a warning is shown with the result |')
p('| Timers (`export-timeout` = 2 × planned + 60 s, 90 s start timeout) | Verified OK for 10 min; unchanged |')
p()
p('Tests: `unit-tests/videoExport.test.js` runs a full **10-minute export in virtual time** (≈600 one-second recorder chunks, progress to 100 %, view rotation, 30 s hidden tab measured, wake lock) and checks the too-long guard; the e2e suite runs a real (short) export in Chromium.')
p()

p('## 3. Neck shapes (non-CAGED positions added to the app)')
p()
p('Strings numbered 1 = high E … 6 = low E (same orientation everywhere). Cells listed per string as frets, **drawn for C major / A minor**; for another key every cell shifts by the same number of frets (−5…+6, keeps the shape on the neck).')
p()
p('| Shape | Source | Cells (string: frets) |')
p('|---|---|---|')
for (const id of ['octave_134', 'octave_124', 'octave_hybrid']) {
  p(`| ${SHAPE_NAME[id]} | Mario, "Octave position - AM (red) G7 (orange)" → guitarscientist.com/diagrams/poo7u47 | ${cellsByString(shapeCells(id, 'C').list)} |`)
}
for (let d = 1; d <= 7; d++) p(`| ${SHAPE_NAME[`nps3_${d}`]} | computed (3 consecutive major-scale notes per string from degree ${d} on string 6) | ${cellsByString(shapeCells(`nps3_${d}`, 'C').list)} |`)
p()
p('CAGED windows (C major / A minor; all strings, frets inclusive): ' + Object.entries(C_AM_POSITION_RANGES).map(([k, r]) => `${k} ${r.fretStart}–${r.fretEnd}`).join(', ') + '. Other keys shift by the major-root distance from C (a window ending above fret 15 drops an octave).')
p()
p('Where they appear: **Positions → Positions/Arpeggios tabs** (new "Octave positions" and "3 notes per string" button rows), **Backing Tracks → neck panel** ("Position shape" select, placed in the backing-track key), and the **🎬 export** (per-view shape + shape key; window = shape ±1 fret).')
p()
p('Note — the C-major diagram "Octave Positions - C (red) G7 (orange)" (guitarscientist.com/diagrams/jy3vghd) is not identical to the A-minor one (its 1-3-4 board omits the two slide notes, 4:5 and 2:8). The app uses the A-minor diagram cells for both keys (open question 2).')
p()

p('## 4. Lessons')
p()
let totalItems = 0
for (const lesson of LESSONS) {
  p(`### Lesson ${lesson.n} — ${lesson.titleHe} / ${lesson.titleEn}${lesson.inferred ? ' **[lesson-inferred]**' : ''}`)
  p()
  const necks = [...new Set(lesson.items.map(i => i.neck))]
  for (const n of necks) p(`- Neck diagram: **${n}** — ${NECKS[n].shapes.map(s => SHAPE_NAME[s]).join(', ')}; lesson diagram: ${NECKS[n].diagram}.`)
  p()
  p('| # | Preset (group → Load) | Bars (1 bar = 4/4; ½+½ = two 2-beat chords) | Form | Key | BPM | App style | Source | 🎬 Repetitions — math → length | Change view every | Neck views |')
  p('|---|---|---|---|---|---|---|---|---|---|---|')
  lesson.items.forEach((item, i) => {
    const t = TRACKS_BY_ID[item.trackId]
    const bars = trackBars(t)
    const plan = exportPlanFor(t, item.neck)
    const src = t.source.kind === 'youtube'
      ? `[YT] [${t.source.videoId}](https://youtu.be/${t.source.videoId}) "${t.source.title}" (${t.source.measured.repeats}× in video) [style≈]`
      : '[new]'
    p(`| ${i + 1} | ${TRACK_TYPES[t.type].labelEn} → ${t.styleLabel} | ${formText(bars)} | ${bars.length}-bar form | ${keyLabel(t.key)} | ${t.tempo} | \`${t.genre}\` (${STYLE_LABEL[t.genre] ?? '?'}) | ${src} | ${plan.repetitions} × (${bars.length * 4}×60/${t.tempo} = ${r1(plan.repSec)} s) = ${r1(plan.musicSec)} s → **${sec(plan.musicSec)}** (dialog ${sec(plan.dialogEstimateSec)}) | ${plan.rotateEvery} rep (${plan.viewChanges} changes) | ${viewsText(plan.views)} |`)
    totalItems++
  })
  p()
}

p('## 5. Style coverage per track type (≥ 5 required)')
p()
p('| Type | Tracks | Distinct app styles | From YouTube | New |')
p('|---|---|---|---|---|')
for (const [type, info] of Object.entries(TRACK_TYPES)) {
  const ts = TRACKS.filter(t => t.type === type)
  p(`| ${info.labelEn} | ${ts.length} | ${new Set(ts.map(t => t.genre)).size} (${[...new Set(ts.map(t => t.genre))].join(', ')}) | ${ts.filter(t => t.source.kind === 'youtube').length} | ${ts.filter(t => t.source.kind !== 'youtube').length} |`)
}
p()
p(`Totals: **${LESSONS.length} lessons, ${TRACKS.length} distinct tracks, ${totalItems} lesson presets (= exports)**.`)
p()

p('## 6. Links followed')
p()
p('| Link (lesson) | Result |')
p('|---|---|')
p('| playlist PLGbDimR-IpycLpAdX6N-FgXqPHU81wJxF "Am-G7" (1) | OK — 9 videos |')
p('| playlist PLGbDimR-Ipyd5oVXb6BB1tSJVr54IZYK2 "Am-G7\\C-G7" (2, 3, 8) | OK — 14 videos (9 Am-G7 + 4 C-G7 + "Am G7 - example" sjtagjFC9Ss, a play-along demo, not a track) |')
p('| playlist PLGbDimR-IpyfBkEpEbvLcskUvhPmlLzV6 "12 bar blues - Major" (4) | OK — 12 keys + demo ISGRxN0mYF0 ("Pentatonic Example - Movable Shapes - Em improv", demo) |')
p('| playlist PLGbDimR-IpydFSp1gdDt68wdIomlYMepR "12 bar blues - Minor" (4) | OK — 10 keys (no Bm, B♭m) + the same demo |')
p('| playlist PLGbDimR-IpycC8C1Pa51QqMERp6ffrOzZ "C-F-G" (5) | OK — 5 videos |')
p('| playlist PLGbDimR-IpyckLjrgSUmdENsrbn1rouau "Am-Dm-Em" (6) | OK — 5 videos |')
p('| playlist PLGbDimR-IpycRPzylaVFIihuBu4FIQ-Yx "C\\Am Chords - for arpeggios" (7) | OK — 4 videos |')
p('| playlist PLGbDimR-IpydlSZ9BMALIjSy5jm_T_sIb "Melody Building Blocks" (8) | OK — 14 videos, all already in the C-F-G / Am-Dm-Em / C\\Am playlists |')
p('| youtu.be/SzPklzLpKGk, -Xsuwj5X_zU, dl9ittae9Aw (alt. lesson 5 draft) | OK — same Am-Dm-Em videos |')
p('| app.upay.co.il payment link (trial lesson) | **Not opened** — a payment link, not homework material |')
p('| Diagram PDFs (named only in the doc) | Not links in the export; found by name in Mario\'s Google Drive (read-only). Octave diagrams decoded from their public Guitar Scientist pages (poo7u47, jy3vghd). |')
p()
p('All 51 videos: no description, chapters or subtitles (auto-captions only exist for some, music only) — so chords/form/BPM come from the on-screen chart and timing. One download returned HTTP 403 once (CVbakqNZVhY) and succeeded on retry.')
p()

p('## 7. Open questions for Mario')
p()
p('1. **Style matches**: the app styles are our closest guesses to the BIAB style names (e.g. "Latin" → Samba 3, "Spanish dance" → Organ Cha-Cha). Swap any you dislike in the data file — the spec regenerates.')
p('2. **C-major octave diagram** differs from the A-minor one (no slide notes 4:5 / 2:8 in "1-3-4"; different 1-2-4 board). Should C–G7 videos use the C diagram cells exactly?')
p('3. **"C F G - Spanish dance"**: 4/4 at 120 BPM or 3/4 at 90 BPM? (bar = 2.0 s either way).')
p('4. **Blues keys B♭m and Bm** have no video — we added them (110 / 95 BPM, new styles). OK?')
p('5. **12-bar blues styles**: titles don\'t name the BIAB style; we rotate 6 blues/shuffle styles across keys (major) and 6 grooves (minor). OK, or should all keys use one style?')
p('6. **Blues neck views**: we show CAGED windows + pentatonic (major pent. for major blues, minor pent. for minor). Lesson 4 also mentions the full scale — want full-scale videos too?')
p('7. **Lessons 9–12** have no backing-track links: our lists are suggestions (9: blues in all keys + full scale; 10: contrasting grooves; 11: Cmaj7–Am7–Dm7–G7 in 5 styles; 12: 3-notes-per-string warm-up). Confirm or send the intended tracks.')
p('8. Lesson 6 focuses on positions **G and E** only (as the text says) — add the other three?')
p('9. Video length target: we aim at ~6 min. Prefer ~5 or ~10?')
p()
p('## 8. Not covered')
p()
p('- Tempo/feel details inside BIAB styles (swing %, fills) cannot be reproduced exactly; the app engine plays its own styles.')
p('- Bar-highlight BPM assumes 4/4; the slow forms (60 BPM) were cross-checked by bar count × repeats against the video length.')

const doc = L.join('\n') + '\n'
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
  if (cur !== doc) { console.error('docs/lesson-backing-tracks-spec.md is stale — run node scripts/gen-lesson-spec.mjs'); process.exit(1) }
  console.log('lesson spec up to date')
} else {
  fs.writeFileSync(OUT, doc)
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${LESSONS.length} lessons, ${TRACKS.length} tracks, ${totalItems} presets`)
}
export { doc }
