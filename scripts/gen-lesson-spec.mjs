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
  COURSE, LESSONS, TRACKS, TRACKS_BY_ID, TRACK_TYPES, NECKS, trackBars, exportPlanFor, variantOf,
  TARGET_SEC, MIN_SEC, MAX_SEC, INTRO_ENDING_ALLOWANCE_SEC,
} from '../src/data/lessonBackingTracks.js'
import { shapeCells, shapeSet } from '../src/constants/neckShapes.js'
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

const groupText = (ids) => ids.length > 1 ? ids.map(id => SHAPE_NAME[id].replace(/^CAGED /, '')).join(' + ') : SHAPE_NAME[ids[0]]
function variantText(v) {
  return v.necks === 2 ? `2 necks [${v.groups.map(groupText).join(' | ')}]` : v.groups.length > 1 ? `1 neck, rotating ${v.groups.map(groupText).join(' → ')}` : `1 neck ${groupText(v.groups[0])}`
}

function viewsText(views, necks = 1) {
  const v = views[0]
  const hl = v.emphasis === 'pentatonic' ? ', pentatonic highlighted on top' : v.emphasis === 'arpeggio' ? ', arpeggios highlighted on top' : ', chord tones coloured on top'
  const scale = `full ${SCALE_NAME[v.scaleId] ?? v.scaleId}, root ${v.root}${hl}`
  const shapes = necks === 2
    ? `**2 necks**: ${views.map(x => groupText(x.shapeIds)).join(' | ')}`
    : views.map(x => groupText(x.shapeIds)).join(' → ')
  return `${shapes}; ${scale}; shape key ${v.shapeKey}`
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
p('| **App style** | The app\'s own backing-track style. Mario (answer 1): Band-in-a-Box styles and app styles are different things — no style correspondence is implied; the app styles are simply chosen to vary. |')
p('| **[easy]** | Beginner track for lessons 1–3 (Mario, 2026-11): 2 bars per chord (Am Am G7 G7 / C C G7 G7), calm style, ≤ 100 BPM. |')
p('| **BPM** | The APP tempo, chosen to suit the app style (within ±15 % of the style\'s own tempo — copying the video BPM onto a different style made some tracks rushed). Lessons 1–4 stay ≤ 100 BPM. When it differs, the video\'s measured BPM is shown in the Source column. |')
p('| **[new]** | Extra style/variant suggested here so each track type has ≥ 5 styles (inferred; not in Mario\'s material). |')
p('| **[lesson-inferred]** | The lesson text has no backing-track link; the list is our suggestion (see open questions). |')
p('| Neck shapes | Octave positions: cells copied from Mario\'s Guitar Scientist diagram data (read). CAGED windows: the app\'s existing Positions-tab ranges (read from code; consistent with the "AM-G7_C-G7 - CAGED" PDF fret labels). 3NPS: computed (inferred — lesson 12 only names the idea). |')
p()
p('Time signature: every source chart is 4/4 (BIAB 4-beat bars; measured bar lengths match 4 beats at round BPMs). "C F G - Spanish dance" stays C–G–F–C in 4/4 with an app style (Mario, answer 3).')
p()

p('## 1. How to batch-export with the 🎬 dialog (PR #13)')
p()
p('For **every row** in the lesson tables below:')
p()
p('1. Open **Backing Tracks** → bottom tab **Templates** (📄) → tab **🎓 Lessons / שיעורים**.')
p('2. Press the lesson number. Each row is one preset; under it are its **🎬 video versions** (chips). Press the chip of the version to export (the first one is the default; **Load / טען** = default). This fills style, chords, tempo, key, the live neck view **and the 🎬 export settings** for that version. It never starts playback.')
p('3. Press **🎬** (info strip). The dialog is already filled: *Repetitions*, *Change neck view every*, *Necks on screen* (1 or 2) and the *Neck views* list (per view: shape or position combo, shape key, scale + root, pentatonic highlight, display "Note names").')
p('4. *Video size*: **720p** (≈ 2.5 Mbit/s video + 160 kbit/s audio → ≈ 160 MB for 8 min). Press **Start export**, keep the tab in front, then **Download**. Identical rows in different lessons (same track + neck + version) are the same video — export once (see the unique-video count in §5).')
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

p('### Two-neck video layout (Mario, answers 2 and 8)')
p()
p('*Necks on screen = 2* shows two aligned necks (same fret range, same fret at the same x). The chord header is compacted to one row (current chord large, next chord + beat dots on the right) and the chord strip stays, so it is always clear which chord plays; the logo/side panel is unchanged.')
p()
p('- **All CAGED positions**: neck 1 = C · G · D, neck 2 = A · E. These windows never overlap (C 0–3, G 4–8, D 9–13 / A 2–6, E 7–10 in C; shifted per key, the second neck uses the octave closest to the first).')
p('- **Octave positions**: neck 1 = 1-3-4, neck 2 = 1-2-4 (their union is the hybrid, which is also its own single-neck video).')
p('- Each position is outlined by a coloured, labelled frame (C orange, A yellow, G green, E blue, D purple; octave boxes one frame per string pair). Dots, roots and chord tones keep their usual colours.')
p('- *Full scale + pentatonic* (answer 6): every note of the full scale is shown; notes outside the pentatonic are drawn smaller and fainter (extra legend row).')
p('- **Rule (round 3): the full working scale is always visible** — in the video and in the live neck. Arpeggio lessons (5–8) highlight the arpeggio on top (other scale notes smaller/fainter, legend "Other scale notes"); blues lessons highlight the pentatonic on top; the other necks colour the chord tones over the normal scale. A view without a scale uses the track key\'s scale, so a chord-tones-only or pentatonic-only neck cannot occur (unit- and e2e-tested).')
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
p('Resolved (answer 2): the C–G7 videos use the octave positions 1-3-4, 1-2-4 and hybrid with these cells (the C-major diagram jy3vghd differs slightly — no slide notes 4:5 / 2:8 — and is not used).')
p('Previously noted — the C-major diagram "Octave Positions - C (red) G7 (orange)" (guitarscientist.com/diagrams/jy3vghd) is not identical to the A-minor one (its 1-3-4 board omits the two slide notes, 4:5 and 2:8). The app uses the A-minor diagram cells for both keys (open question 2).')
p()

p('## 4. Lessons')
p()
let totalItems = 0
const uniqueVideos = new Set()
let allVersionExports = 0
for (const lesson of LESSONS) {
  p(`### Lesson ${lesson.n} — ${lesson.titleHe} / ${lesson.titleEn}${lesson.inferred ? ' **[lesson-inferred]**' : ''}`)
  p()
  const necks = [...new Set(lesson.items.map(i => i.neck))]
  for (const n of necks) {
    p(`- Neck **${n}** — lesson diagram: ${NECKS[n].diagram}. Video versions: ${NECKS[n].variants.map((v, k) => `\`${v.id}\`${k === 0 ? ' (default)' : ''} = ${variantText(v)}`).join('; ')}.`)
  }
  p()
  p('| # | Preset (group → app style) | Bars (1 bar = 4/4; ½+½ = two 2-beat chords) | Form | Key | BPM | App style | Source | 🎬 Repetitions — math → length | Change view every | Neck views |')
  p('|---|---|---|---|---|---|---|---|---|---|---|')
  lesson.items.forEach((item, i) => {
    const t = TRACKS_BY_ID[item.trackId]
    const bars = trackBars(t)
    const plan = exportPlanFor(t, item.neck)
    const variants = NECKS[item.neck].variants
    for (const v of variants) uniqueVideos.add(`${t.id}|${item.neck}|${v.id}`)
    allVersionExports += variants.length
    const src = t.source.kind === 'youtube'
      ? `[YT] [${t.source.videoId}](https://youtu.be/${t.source.videoId}) "${t.source.title}" (${t.source.measured.repeats}× in video${t.source.measured.bpm !== t.tempo ? `, video ${t.source.measured.bpm} BPM` : ''})`
      : t.source.kind === 'easy' ? '[easy]' : '[new]'
    const app = STYLE_LABEL[t.genre] ?? t.genre
    p(`| ${i + 1} | ${TRACK_TYPES[t.type].labelEn} → ${app} | ${formText(bars)} | ${bars.length}-bar form | ${keyLabel(t.key)} | ${t.tempo} | \`${t.genre}\` (${app}) | ${src} | ${plan.repetitions} × (${bars.length * 4}×60/${t.tempo} = ${r1(plan.repSec)} s) = ${r1(plan.musicSec)} s → **${sec(plan.musicSec)}** (dialog ${sec(plan.dialogEstimateSec)}) | ${plan.viewChanges ? `${plan.rotateEvery} rep (${plan.viewChanges} changes)` : '— (no rotation)'} | ${viewsText(plan.views, plan.necksPerScreen)} (+ ${variants.length - 1} other version${variants.length === 2 ? '' : 's'}) |`)
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
p(`Totals: **${LESSONS.length} lessons, ${TRACKS.length} distinct tracks, ${totalItems} lesson presets**. Default videos: ${totalItems}; all video versions: ${allVersionExports}; **unique videos** (same track + neck + version counted once across lessons): ${uniqueVideos.size}.`)
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

p('## 7. Questions for Mario — answered (round 2, 2026-11-17)')
p()
p('| # | Question | Mario\'s answer (summary) | What changed |')
p('|---|---|---|---|')
p('| 1 | Do the app styles match the BIAB styles? | They don\'t correspond — BIAB styles and app styles are different. | **Resolved.** No "closest match" claim any more; presets are named by their app style; styles are chosen for variety. |')
p('| 2 | C–G7: use the C-major octave diagram exactly? | Use the octave positions 1-3-4, 1-2-4 and hybrid — each a separate video, or 2–3 in one video if it stays uncluttered (spacious, logo kept, clear which chord plays). | **Resolved.** Octave presets now have 4 video versions: default **2 necks (1-3-4 \| 1-2-4)**, plus single-neck 1-3-4, 1-2-4, hybrid. New two-neck layout (§2). |')
p('| 3 | "Spanish dance": 4/4 or 3/4? | Doesn\'t matter; keep C, F and G and use the app\'s styles. | **Resolved.** Stays C–G–F–C, 4/4, app style Organ Cha-Cha. |')
p('| 4 | Add B♭m and Bm blues? | Yes — blues in all keys. | **Resolved.** All 12 major + 12 minor keys. |')
p('| 5 | Blues styles across keys? | Vary the styles; repeats are OK but not the same style on neighbouring keys. | **Resolved.** 8 styles rotate over 12 keys (major and minor each); a unit test checks no two neighbouring keys (incl. B→C) share a style. |')
p('| 6 | Blues: pentatonic only or full scale? | Prefer full-scale versions; highlight the pentatonic or the full scale as the lesson instructs. | **Resolved.** Lessons 4 and 12 (blues): full scale with the **pentatonic highlighted** (lesson 4 says start from pentatonic). Lesson 9: full scale. |')
p('| 7 | Lessons 9–12 suggestions? | Trusts Claude\'s suggestions; will review later. | **Resolved for now** (kept as suggestions, marked [lesson-inferred]). |')
p('| 8 | Lesson 6: only G and E? | If the text names only two positions, use two; in principle all can be shown. Let the student choose what to look at — e.g. 2 necks, C·G·D on one and A·E on the other, coloured rectangles marking each position. | **Resolved.** Lesson 6 default = 2 necks G \| E; alternative = all positions on 2 necks. Every CAGED preset (lessons 3–5, 7–11) now defaults to **all positions on 2 necks** with "one position at a time" as the alternative. |')
p('| 9 | Target length? | 6 min is fine; leans to ~8, toward 10; anything above 5. | **Resolved.** Target 8 min (all presets 5–10 min); dialog length buttons ≈5 / ≈8 / ≈10 min. |')
p()
p('### Round 3 answers (2026-11-18)')
p()
p('Mario: "What is there now is excellent. Make the videos of the first 8 lessons for now, without the suggestions for the next lessons. The full scale being worked on must always be visible, with the arpeggios highlighted on top of it (or the pentatonic highlighted on top, but always with the full scale in the background)."')
p()
p('| Round-2 open question | Status |')
p('|---|---|')
p('| 1. Export defaults only or all versions? | **Resolved** — default version of every preset in lessons 1–8 only, for now. |')
p('| 2. 3 necks for octave positions? | **Resolved** — no; the current two-neck default stays ("what\'s there is excellent"). |')
p('| 3. Pentatonic highlight in the live neck too? | **Resolved** — yes: the live neck now shows the same full scale + highlight as the video. |')
p('| 4. Review lessons 9–12 suggestions? | **Deferred** — not worked on this round; lessons 9–12 are not exported. |')
p()
p('### New open questions')
p()
p('1. Lessons 3 and 8 (CAGED + scale) and 1–2 (octave positions) colour the chord tones over a normal-size scale (no arpeggio softening), because those lessons are about the scale/position itself. Should they also use the arpeggio highlight (other scale notes fainter)?')
p('2. Lessons 9–12 remain suggestions; when should they be reviewed and exported?')
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
