#!/usr/bin/env node
/**
 * derive-genre-profile.mjs — Mine the converted JSON corpus to derive a
 * canonical "genre profile" per category, which the genre-style-builder
 * skill uses as a template for creating new styles from scratch.
 *
 * The profile per genre includes:
 *   - typical tempo range + median
 *   - dominant time signature + division
 *   - source-chord convention (root + type, usually C / Maj)
 *   - per-AccType channel layout: GM program guess, CTAB defaults
 *     (ntr, ntt, noteLowLimit, noteHighLimit, rtr, chordRootUpperLimit)
 *   - standard parts to compose + their typical sizeInBeats
 *
 * Usage:
 *   node scripts/derive-genre-profile.mjs              # writes all 6 profiles
 *   node scripts/derive-genre-profile.mjs jazz         # writes just jazz
 *   node scripts/derive-genre-profile.mjs --stdout     # prints, doesn't write
 *
 * Output: ~/.claude/skills/genre-style-builder/profiles/<genre>.json
 */

import fs   from 'node:fs'
import path from 'node:path'
import os   from 'node:os'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..')
const NATIVE_DIR = path.join(REPO_ROOT, 'public', 'styles-native')
const INDEX_FILE = path.join(NATIVE_DIR, 'index.json')

const PROFILES_DIR = path.join(os.homedir(), '.claude', 'skills', 'genre-style-builder', 'profiles')

// Map our 6 internal categories to natural-language genre keys for the skill
const CATEGORY_TO_GENRE = {
  jazz:    'jazz',
  latin:   'latin',
  blues:   'blues',
  rock:    'rock',
  country: 'country',
}

// AccType → typical GM program (best guess for new-style authoring).
// Source: see src/constants/genreInstrumentMap.js + JJazzLab SF2 conventions.
const ACCTYPE_TO_GM = {
  RHYTHM:    null,  // ch 9 — drum kit (no program; SF2 channel is GM Drum)
  SUBRHYTHM: null,
  BASS:      32,    // Acoustic Bass
  CHORD1:    0,     // Acoustic Grand Piano (jazz/latin) — rock overrides to 2
  CHORD2:    26,    // Jazz Guitar (jazz/latin) — rock overrides to 29
  PAD:       48,    // Strings 1
  PHRASE1:   65,    // Alto Sax
  PHRASE2:   57,    // Trombone
}

const ACCTYPE_TO_CHANNEL = {
  // Approximation of how the BackingTrackEngine maps AccType → MIDI channel today
  // (see ChordEngine.js + BackingTrackEngine.js for the real mapping). Kept here
  // for documentation; new styles should follow these conventions.
  RHYTHM:    9,
  SUBRHYTHM: 9,
  BASS:      1,
  CHORD1:    0,
  CHORD2:    2,
  PAD:       3,
  PHRASE1:   4,
  PHRASE2:   5,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

function median(arr) {
  if (arr.length === 0) return null
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function mode(arr) {
  if (arr.length === 0) return null
  const counts = {}
  for (const v of arr) counts[v] = (counts[v] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function median255(arr) {
  // For limit fields (0-127); fall back to null if empty
  return median(arr.filter(n => typeof n === 'number'))
}

// ─── Per-genre extraction ─────────────────────────────────────────────────────

function buildProfile(genre, styleEntries) {
  const tempos = []
  const sigs   = []
  const divs   = []
  const sourceRoots = []
  const sourceTypes = []

  // For each AccType, collect: ntr, ntt, noteLow, noteHigh, rtr, chordRootUpperLimit
  const acc = {}     // accType → { ntr:[], ntt:[], noteLow:[], noteHigh:[], rtr:[], cru:[] }

  let partsSeen = {}        // partName → count
  let partSizes = {}        // partName → [sizeInBeats]

  for (const entry of styleEntries) {
    const jsonPath = path.join(NATIVE_DIR, entry.path)
    if (!fs.existsSync(jsonPath)) continue
    const style = loadJson(jsonPath)

    if (style.tempo) tempos.push(style.tempo)
    if (style.timeSignature) sigs.push(style.timeSignature)
    if (style.division) divs.push(style.division)

    for (const [partName, part] of Object.entries(style.parts || {})) {
      partsSeen[partName] = (partsSeen[partName] || 0) + 1
      if (part.sizeInBeats) {
        partSizes[partName] = partSizes[partName] || []
        partSizes[partName].push(part.sizeInBeats)
      }
      for (const chData of Object.values(part.channels || {})) {
        const ctab = chData.ctab
        if (!ctab) continue
        const a = ctab.accType
        if (!a) continue
        acc[a] = acc[a] || { ntr: [], ntt: [], noteLow: [], noteHigh: [], rtr: [], cru: [] }
        const m = ctab.ctb2Main || {}
        acc[a].ntr.push(m.ntr)
        acc[a].ntt.push(m.ntt)
        acc[a].noteLow.push(m.noteLowLimit)
        acc[a].noteHigh.push(m.noteHighLimit)
        acc[a].rtr.push(m.rtr)
        acc[a].cru.push(m.chordRootUpperLimit)
        if (ctab.sourceChordNote != null) sourceRoots.push(ctab.sourceChordNote)
        if (ctab.sourceChordType) sourceTypes.push(ctab.sourceChordType)
      }
    }
  }

  // Build accType-keyed channel list
  const channels = []
  for (const [accType, vals] of Object.entries(acc)) {
    channels.push({
      accType,
      midiChannel: ACCTYPE_TO_CHANNEL[accType] ?? null,
      gmProgram:   ACCTYPE_TO_GM[accType] ?? null,
      ctabDefault: {
        ntr:                  mode(vals.ntr),
        ntt:                  mode(vals.ntt),
        noteLowLimit:         median255(vals.noteLow),
        noteHighLimit:        median255(vals.noteHigh),
        rtr:                  mode(vals.rtr),
        chordRootUpperLimit:  median255(vals.cru),
        bassOn:               accType === 'BASS',
      },
    })
  }

  // Standard parts to compose (top 5 by count, ensure Main_A and Main_B are present)
  const partsSorted = Object.entries(partsSeen).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  const partsToCompose = ['Main_A', 'Main_B', 'Fill_In_AA', 'Intro_A', 'Ending_A']
    .filter(p => partsSorted.includes(p))
  const partSizesMap = {}
  for (const p of partsToCompose) partSizesMap[p] = median(partSizes[p] || []) ?? 8

  const profile = {
    id:           genre,
    displayName:  genre.charAt(0).toUpperCase() + genre.slice(1),
    derivedFrom:  styleEntries.map(e => e.id),
    sampleSize:   styleEntries.length,
    tempoRange:   [Math.min(...tempos), Math.max(...tempos)],
    defaultTempo: median(tempos),
    timeSignature: mode(sigs),
    division:     mode(divs),
    sourceChord:  { root: parseInt(mode(sourceRoots.map(String))) || 0, type: mode(sourceTypes) || 'Maj' },
    channels,
    partsToCompose,
    partSizes:    partSizesMap,
  }
  return profile
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const toStdout = args.includes('--stdout')
const genreFilter = args.find(a => !a.startsWith('-'))

if (!fs.existsSync(INDEX_FILE)) {
  console.error(`ERROR: ${INDEX_FILE} not found. Run sty-to-native.mjs --catalog first.`)
  process.exit(2)
}

const index = loadJson(INDEX_FILE)

// Group styles by category → derived genre
const byGenre = {}
for (const s of index.styles) {
  const genre = CATEGORY_TO_GENRE[s.category] || s.category
  byGenre[genre] = byGenre[genre] || []
  byGenre[genre].push(s)
}

if (!toStdout) fs.mkdirSync(PROFILES_DIR, { recursive: true })

for (const [genre, entries] of Object.entries(byGenre)) {
  if (genreFilter && genre !== genreFilter) continue
  const profile = buildProfile(genre, entries)
  const outFile = path.join(PROFILES_DIR, `${genre}.json`)
  if (toStdout) {
    console.log(`\n=== ${genre} (n=${entries.length}) ===`)
    console.log(JSON.stringify(profile, null, 2))
  } else {
    fs.writeFileSync(outFile, JSON.stringify(profile, null, 2))
    console.log(`✓ ${genre.padEnd(8)}  n=${entries.length}  → ${outFile}`)
  }
}
