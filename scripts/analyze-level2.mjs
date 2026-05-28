#!/usr/bin/env node
/**
 * analyze-level2.mjs — Survey our converted JSON corpus for fields/features
 * present in the parsed .sty data but NOT (yet) consumed by the engine.
 *
 * Output is corpus statistics that feed into docs/jjazzlab-engine/LEVEL2_DEFERRED.md.
 *
 * Today's engine (level 1, SFF1 parity) reads from each channel's `ctab` mainly:
 *   - accType
 *   - mutedChords
 *   - sourceChordNote / sourceChordType
 *   - ctb2Main.{ntr, ntt, noteLowLimit, noteHighLimit}
 *
 * Things the parser populates but the engine does not (yet) act on:
 *   - ctb2Low, ctb2High      (pitch-band conditional re-mapping)
 *   - ctab.mutedNotes        (per-pitch mute mask)
 *   - ctab.ctb2Main.rtr      (retrigger behaviour beyond default)
 *   - ctab.ctb2Main.chordRootUpperLimit
 *   - ctab.ctb2Main.bassOn
 *   - ctab.ctb2MiddleLowPitch / ctb2MiddleHighPitch (SFF2)
 *   - NTT variants beyond MELODY/CHORD/BYPASS (HARMONIC_MINOR_*, DORIAN_*, etc.)
 *   - GUITAR-NTR sub-rules (ALL_PURPOSE / STROKE / ARPEGGIO)
 *
 * Usage:
 *   node scripts/analyze-level2.mjs           # prints summary table
 *   node scripts/analyze-level2.mjs --json    # emits machine-readable JSON
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..')
const NATIVE_DIR = path.join(REPO_ROOT, 'public', 'styles-native')
const INDEX_FILE = path.join(NATIVE_DIR, 'index.json')

const asJson = process.argv.includes('--json')

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

// ─── Bucket counters ──────────────────────────────────────────────────────────

function newStats() {
  return {
    totalStyles: 0,
    totalChannels: 0,
    sffType:           { SFF1: 0, SFF2: 0 },
    division:          { BINARY: 0, EIGHTH_TRIPLET: 0, EIGHTH_SHUFFLE: 0 },
    timeSig:           {},
    accTypes:          {},
    ntr:               {},
    ntt:               {},
    rtr:               {},
    ctb2LowPresent:    0,   // channels with non-null ctb2Low
    ctb2HighPresent:   0,
    ctb2MiddleSet:     0,   // channels where the middle pitch range is set
    mutedNotesUsed:    0,   // channels with non-empty mutedNotes
    mutedChordsUsed:   0,
    bassOnTrue:        0,
    chordRootUpperLimitNon127: 0,
    nonCmajSource:     [],  // {styleId, ch, root, type}
    multiChannelMainA: {},  // styleId → count of channels in Main_A
    nttPerAccType:     {},  // accType → ntt → count
    guitarNttUsed:     0,   // channels with GUITAR ntr + GUITAR-specific ntt
    stylesWithCtb2Low: [],
    stylesWithCtb2High: [],
  }
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1
}

function scanCtab(stats, styleId, partName, chKey, ctab) {
  stats.totalChannels++
  bump(stats.accTypes, ctab.accType || '(none)')

  const m = ctab.ctb2Main || null
  if (m) {
    bump(stats.ntr, m.ntr || '(none)')
    bump(stats.ntt, m.ntt || '(none)')
    bump(stats.rtr, m.rtr || '(none)')

    // ntt distribution per accType
    const acc = ctab.accType || '(none)'
    stats.nttPerAccType[acc] = stats.nttPerAccType[acc] || {}
    bump(stats.nttPerAccType[acc], m.ntt || '(none)')

    if (m.bassOn === true) stats.bassOnTrue++
    if (typeof m.chordRootUpperLimit === 'number' && m.chordRootUpperLimit !== 127) {
      stats.chordRootUpperLimitNon127++
    }

    // GUITAR-NTR sub-rules
    if (m.ntr === 'GUITAR' && ['ALL_PURPOSE', 'STROKE', 'ARPEGGIO'].includes(m.ntt)) {
      stats.guitarNttUsed++
    }
  }

  if (ctab.ctb2Low)  { stats.ctb2LowPresent++;  if (!stats.stylesWithCtb2Low.includes(styleId))  stats.stylesWithCtb2Low.push(styleId) }
  if (ctab.ctb2High) { stats.ctb2HighPresent++; if (!stats.stylesWithCtb2High.includes(styleId)) stats.stylesWithCtb2High.push(styleId) }
  if (typeof ctab.ctb2MiddleLowPitch === 'number' || typeof ctab.ctb2MiddleHighPitch === 'number') {
    stats.ctb2MiddleSet++
  }

  if (Array.isArray(ctab.mutedNotes)  && ctab.mutedNotes.length  > 0) stats.mutedNotesUsed++
  if (Array.isArray(ctab.mutedChords) && ctab.mutedChords.length > 0) stats.mutedChordsUsed++

  // Source chord — typically C / Maj
  const srcRoot = ctab.sourceChordNote
  const srcType = ctab.sourceChordType
  if (srcRoot != null && (srcRoot !== 0 || (srcType && srcType !== 'Maj'))) {
    stats.nonCmajSource.push({ styleId, partName, ch: chKey, root: srcRoot, type: srcType })
  }
}

// ─── Main scan ────────────────────────────────────────────────────────────────

function scan() {
  const index = loadJson(INDEX_FILE)
  const stats = newStats()

  for (const entry of index.styles) {
    const jsonPath = path.join(NATIVE_DIR, entry.path)
    if (!fs.existsSync(jsonPath)) continue
    const style = loadJson(jsonPath)
    stats.totalStyles++
    bump(stats.sffType, style.sffType || '(none)')
    bump(stats.division, style.division || '(none)')
    bump(stats.timeSig, style.timeSignature || '(none)')

    const mainA = style.parts?.Main_A
    if (mainA?.channels) stats.multiChannelMainA[entry.id] = Object.keys(mainA.channels).length

    for (const [partName, part] of Object.entries(style.parts || {})) {
      for (const [chKey, chData] of Object.entries(part.channels || {})) {
        if (!chData?.ctab) continue
        scanCtab(stats, entry.id, partName, chKey, chData.ctab)
      }
    }
  }

  return stats
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function formatRow(label, value) {
  return `  ${label.padEnd(38)} ${value}`
}

function report(stats) {
  if (asJson) { console.log(JSON.stringify(stats, null, 2)); return }

  console.log('\n── Corpus overview ──')
  console.log(formatRow('Styles analyzed:',   stats.totalStyles))
  console.log(formatRow('Channels analyzed:', stats.totalChannels))
  console.log(formatRow('SFF1 / SFF2:',       `${stats.sffType.SFF1} / ${stats.sffType.SFF2}`))
  console.log(formatRow('Division:',          JSON.stringify(stats.division)))
  console.log(formatRow('Time signatures:',   JSON.stringify(stats.timeSig)))

  console.log('\n── AccType distribution ──')
  for (const [k, v] of Object.entries(stats.accTypes).sort((a,b)=>b[1]-a[1])) {
    console.log(formatRow(k, v))
  }

  console.log('\n── NTR distribution ──')
  for (const [k, v] of Object.entries(stats.ntr).sort((a,b)=>b[1]-a[1])) {
    console.log(formatRow(k, v))
  }

  console.log('\n── NTT distribution ──')
  for (const [k, v] of Object.entries(stats.ntt).sort((a,b)=>b[1]-a[1])) {
    console.log(formatRow(k, v))
  }

  console.log('\n── RTR distribution ──')
  for (const [k, v] of Object.entries(stats.rtr).sort((a,b)=>b[1]-a[1])) {
    console.log(formatRow(k, v))
  }

  console.log('\n── Level-2 feature presence ──')
  console.log(formatRow('Channels with ctb2Low:',           `${stats.ctb2LowPresent}  (${stats.stylesWithCtb2Low.length} styles)`))
  console.log(formatRow('Channels with ctb2High:',          `${stats.ctb2HighPresent}  (${stats.stylesWithCtb2High.length} styles)`))
  console.log(formatRow('Channels with ctb2Middle pitch:',  stats.ctb2MiddleSet))
  console.log(formatRow('Channels with mutedNotes set:',    stats.mutedNotesUsed))
  console.log(formatRow('Channels with mutedChords set:',   stats.mutedChordsUsed))
  console.log(formatRow('Channels with bassOn=true:',       stats.bassOnTrue))
  console.log(formatRow('Channels with chordRootUpperLimit≠127:', stats.chordRootUpperLimitNon127))
  console.log(formatRow('Channels using GUITAR-NTT:',       stats.guitarNttUsed))
  console.log(formatRow('Non-CMaj source chord channels:',  stats.nonCmajSource.length))

  if (stats.stylesWithCtb2Low.length > 0) {
    console.log('\n── Styles with ctb2Low (sample) ──')
    console.log('  ' + stats.stylesWithCtb2Low.slice(0, 10).join(', '))
  }
  if (stats.stylesWithCtb2High.length > 0) {
    console.log('\n── Styles with ctb2High (sample) ──')
    console.log('  ' + stats.stylesWithCtb2High.slice(0, 10).join(', '))
  }

  console.log('\n── NTT × AccType matrix ──')
  for (const acc of Object.keys(stats.nttPerAccType).sort()) {
    const rows = Object.entries(stats.nttPerAccType[acc]).sort((a,b)=>b[1]-a[1])
    console.log(`  ${acc}: ${rows.map(([k,v]) => `${k}:${v}`).join('  ')}`)
  }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

if (!fs.existsSync(INDEX_FILE)) {
  console.error(`ERROR: ${INDEX_FILE} not found. Run sty-to-native.mjs --catalog first.`)
  process.exit(2)
}
report(scan())
