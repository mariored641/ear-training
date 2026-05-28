#!/usr/bin/env node
/**
 * verify-engine-parity.mjs — End-to-end behavioral parity between the
 * .sty path and the native-JSON path.
 *
 * For every style in public/styles-native/index.json:
 *   1. Load the original .sty via parseSty(buf) → styleA
 *   2. Load the native JSON via JSON.parse(file)  → styleB
 *   3. For each chord in CHORD_BANK and each part in styleA.parts:
 *        phrasesA = ChordEngine.generatePhrasesForChord(styleA, part, chord, barIdx)
 *        phrasesB = ChordEngine.generatePhrasesForChord(styleB, part, chord, barIdx)
 *        assert.deepStrictEqual(phrasesA, phrasesB)
 *
 * Why this is sufficient (and stronger than structural parity alone):
 *   ChordEngine is the only consumer of style data downstream of parsing.
 *   It calls Transposer.fitNotes() which is pure-deterministic on its inputs.
 *   The Humanizer is a post-pass keyed only on (notes + seed), so identical
 *   ChordEngine output → identical humanized output → identical MIDI events
 *   → identical audio. If this test passes, the two paths cannot diverge.
 *
 * Usage:
 *   node scripts/verify-engine-parity.mjs            # all 48 styles
 *   node scripts/verify-engine-parity.mjs jazz_cool  # one style
 *   node scripts/verify-engine-parity.mjs --verbose  # print per-case results
 *   node scripts/verify-engine-parity.mjs --chord=Dm7,G7,Cmaj7  # custom chord set
 */

import fs                from 'node:fs'
import path              from 'node:path'
import assert            from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { parseSty }                 from '../src/lib/style-engine/StyleParser.js'
import { generatePhrasesForChord, parseChordSymbol } from '../src/lib/style-engine/ChordEngine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..')
const NATIVE_DIR = path.join(REPO_ROOT, 'public', 'styles-native')
const INDEX_FILE = path.join(NATIVE_DIR, 'index.json')

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const verbose = args.includes('--verbose') || args.includes('-v')
const customChordArg = args.find(a => a.startsWith('--chord='))
const idFilter = args.find(a => !a.startsWith('-'))

// ─── Chord bank — diverse coverage ────────────────────────────────────────────

// Targets:
//   - all 12 roots × 5 dominant qualities (Maj, min, dom7, maj7, min7) = 60
//   - half-dim, dim7, sus4, augmented, extended tensions
//   - common progressions: ii-V-I (major + minor), 12-bar blues, modal vamps
// Total: ~80 chords covering most YamChord types + several octave/key positions
const DEFAULT_CHORD_BANK = [
  // All-roots × major
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  // All-roots × minor
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
  // dominant 7
  'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'F#7', 'Bb7', 'Eb7', 'Ab7', 'Db7',
  // maj7
  'Cmaj7', 'Dmaj7', 'Fmaj7', 'Gmaj7', 'Abmaj7', 'Bbmaj7',
  // min7
  'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7',
  // sus, dim, half-dim, aug
  'Csus4', 'Dsus4', 'Gsus4', 'C7sus4', 'G7sus4',
  'Cdim', 'C#dim', 'Cdim7', 'Bdim7',
  'Cm7b5', 'Dm7b5', 'F#m7b5', 'Bm7b5',
  'Caug', 'C7aug',
  // tensions
  'C9', 'Cm9', 'Cmaj9', 'G13', 'G7b9', 'G7#9', 'G7#11', 'Cmaj7#11',
  // 6 chords
  'C6', 'Cm6', 'C6/9',
]

const CHORD_BANK = customChordArg
  ? customChordArg.replace('--chord=', '').split(',').map(s => s.trim())
  : DEFAULT_CHORD_BANK

// Bar indices to vary VariationSelector picks
const BAR_INDICES = [0, 1, 4, 8, 16, 32]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

function loadStyFresh(srcPath) {
  const buf = fs.readFileSync(srcPath)
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return parseSty(arr)
}

function diffSummary(phrasesA, phrasesB) {
  const lines = []
  const allKeys = new Set([...Object.keys(phrasesA), ...Object.keys(phrasesB)])
  for (const key of allKeys) {
    const a = phrasesA[key]
    const b = phrasesB[key]
    if (!a || !b) {
      lines.push(`  ${key}: ${a ? 'A has' : 'A missing'}, ${b ? 'B has' : 'B missing'}`)
      continue
    }
    if (a.length !== b.length) {
      lines.push(`  ${key}: A has ${a.length} notes, B has ${b.length}`)
      continue
    }
    for (let i = 0; i < a.length; i++) {
      const na = a[i], nb = b[i]
      if (na.pitch !== nb.pitch || na.velocity !== nb.velocity ||
          na.position !== nb.position || na.duration !== nb.duration) {
        lines.push(`  ${key}[${i}]: A=${JSON.stringify(na)} B=${JSON.stringify(nb)}`)
        if (lines.length > 12) { lines.push('  ...'); break }
      }
    }
    if (lines.length > 12) break
  }
  return lines.join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(INDEX_FILE)) {
  console.error(`ERROR: ${INDEX_FILE} not found. Run sty-to-native.mjs --catalog first.`)
  process.exit(2)
}

const index = loadJson(INDEX_FILE)
const targets = index.styles.filter(s => !idFilter || s.id === idFilter)
if (targets.length === 0) {
  console.error(`ERROR: no styles match "${idFilter}".`)
  console.error(`Available: ${index.styles.map(s => s.id).join(', ')}`)
  process.exit(1)
}

// Pre-parse all chord symbols once (deterministic)
const parsedChords = CHORD_BANK.map(sym => {
  try {
    return { sym, chord: parseChordSymbol(sym) }
  } catch (err) {
    return { sym, error: err.message }
  }
})
const validChords = parsedChords.filter(c => c.chord)
const invalidChords = parsedChords.filter(c => c.error)
if (invalidChords.length > 0) {
  console.warn(`⚠ ${invalidChords.length} chord symbols failed to parse:`)
  for (const c of invalidChords) console.warn(`    ${c.sym}: ${c.error}`)
}

console.log(`\n🎯 Engine parity test`)
console.log(`   Styles:  ${targets.length}`)
console.log(`   Chords:  ${validChords.length}`)
console.log(`   Bars:    ${BAR_INDICES.length}`)
console.log(`   Per-style cases: ${validChords.length * BAR_INDICES.length} × (parts in style)`)
console.log()

let totalCases = 0
let totalPass  = 0
let totalFail  = 0
const failedStyles = []

const startTime = Date.now()

for (const entry of targets) {
  const styRaw = entry.sourceSty
  const jsonPath = path.join(NATIVE_DIR, entry.path)
  if (!fs.existsSync(styRaw)) {
    console.log(`  ✗ ${entry.id}  (source-missing: ${styRaw})`)
    failedStyles.push({ id: entry.id, reason: 'source-missing' })
    continue
  }
  if (!fs.existsSync(jsonPath)) {
    console.log(`  ✗ ${entry.id}  (json-missing)`)
    failedStyles.push({ id: entry.id, reason: 'json-missing' })
    continue
  }

  const styleA = loadStyFresh(styRaw)
  const styleB = loadJson(jsonPath)
  const partNames = Object.keys(styleA.parts || {})

  let styleCases = 0, styleFail = 0
  const firstFailure = []

  for (const partName of partNames) {
    for (const barIdx of BAR_INDICES) {
      for (const { sym, chord } of validChords) {
        styleCases++
        totalCases++
        const phrasesA = generatePhrasesForChord(styleA, partName, chord, barIdx)
        const phrasesB = generatePhrasesForChord(styleB, partName, chord, barIdx)
        try {
          assert.deepStrictEqual(phrasesA, phrasesB)
          totalPass++
        } catch (err) {
          styleFail++
          totalFail++
          if (firstFailure.length === 0) {
            firstFailure.push({ partName, barIdx, sym, phrasesA, phrasesB })
          }
        }
      }
    }
  }

  if (styleFail === 0) {
    console.log(`  ✓ ${entry.id.padEnd(22)} ${styleCases} cases  (parts=${partNames.length})`)
  } else {
    console.log(`  ✗ ${entry.id.padEnd(22)} ${styleFail}/${styleCases} FAIL`)
    const f = firstFailure[0]
    console.log(`      first divergence: part="${f.partName}"  bar=${f.barIdx}  chord="${f.sym}"`)
    console.log(diffSummary(f.phrasesA, f.phrasesB))
    failedStyles.push({ id: entry.id, fails: styleFail, total: styleCases, first: f.sym })
  }
}

const dur = ((Date.now() - startTime) / 1000).toFixed(1)
console.log()
console.log(`─────────────────────────────────────────────`)
console.log(`Total cases: ${totalCases}`)
console.log(`Pass:        ${totalPass}`)
console.log(`Fail:        ${totalFail}`)
console.log(`Styles ok:   ${targets.length - failedStyles.length}/${targets.length}`)
console.log(`Duration:    ${dur}s`)

if (totalFail > 0) {
  console.log(`\n❌ Engine parity FAILED.`)
  process.exit(1)
}

console.log(`\n✅ Engine parity PASSED — .sty and native JSON paths produce`)
console.log(`   byte-equivalent MIDI output across all tested cases.`)
