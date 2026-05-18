#!/usr/bin/env node
/**
 * analyze-sty.mjs — dumps per-channel pitch stats from a Yamaha .sty file
 *
 * Usage:
 *   node scripts/analyze-sty.mjs <path-to-sty-or-prs>
 *   node scripts/analyze-sty.mjs "public/styles/Pop&Rock/PowerRock.STY"
 */

import fs from 'node:fs'
import path from 'node:path'
import { parseSty } from '../src/lib/style-engine/StyleParser.js'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/analyze-sty.mjs <path-to-sty>')
  process.exit(1)
}

const buf = fs.readFileSync(file)
const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
const style = parseSty(arr)

const PITCH_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
function midiName(p) {
  const oct = Math.floor(p / 12) - 1
  return `${PITCH_NAMES[p % 12]}${oct}`
}

console.log(`\n=== ${path.basename(file)} ===`)
console.log(`name: ${style.name}`)
console.log(`tempo: ${style.tempo}  time: ${style.timeSignature}  sff: ${style.sffType}`)

// Show the main playback parts
const partsToShow = ['Main_A','Main_B','Main_C','Main_D','Intro_A','Ending_A']

for (const partKey of partsToShow) {
  const part = style.parts[partKey]
  if (!part || !part.channels) continue
  console.log(`\n── ${partKey} (size=${part.sizeInBeats} beats) ──`)

  // Group by AccType (since one part may have multiple channels of same accType)
  const byAcc = {}
  for (const [chStr, chData] of Object.entries(part.channels)) {
    const acc = chData.ctab.accType
    if (!byAcc[acc]) byAcc[acc] = []
    byAcc[acc].push({ ch: chStr, ctab: chData.ctab, notes: chData.notes })
  }

  for (const [acc, list] of Object.entries(byAcc)) {
    for (const { ch, ctab, notes } of list) {
      if (!notes || notes.length === 0) {
        console.log(`  [ch${ch}] ${acc.padEnd(9)} ${ctab.name.padEnd(8)} — (empty)`)
        continue
      }
      const pitches = notes.map(n => n.pitch)
      const min = Math.min(...pitches)
      const max = Math.max(...pitches)
      const lo = ctab.ctb2Main?.noteLowLimit ?? 0
      const hi = ctab.ctb2Main?.noteHighLimit ?? 127
      const ntr = ctab.ctb2Main?.ntr
      const ntt = ctab.ctb2Main?.ntt

      // Histogram by octave
      const byOct = {}
      for (const p of pitches) {
        const oct = Math.floor(p / 12) - 1
        byOct[oct] = (byOct[oct] || 0) + 1
      }
      const histo = Object.keys(byOct).sort((a,b)=>+a-+b)
        .map(o => `oct${o}:${byOct[o]}`).join(' ')

      // Count notes ≥ C6 (MIDI 84) — these are likely "high" / piercing
      const veryHigh = pitches.filter(p => p >= 84).length
      const highC5plus = pitches.filter(p => p >= 72).length
      console.log(
        `  [ch${ch}] ${acc.padEnd(9)} ${ctab.name.padEnd(8)} ` +
        `n=${String(notes.length).padStart(3)}  ` +
        `range=${midiName(min)}..${midiName(max)} (${min}..${max})  ` +
        `limit=${midiName(lo)}..${midiName(hi)}  ` +
        `ntr=${ntr} ntt=${ntt}  ` +
        `≥C5:${highC5plus} ≥C6:${veryHigh}`
      )
      if (veryHigh > 0) {
        const highNotes = notes.filter(n => n.pitch >= 84)
          .map(n => `${midiName(n.pitch)}@${n.position.toFixed(2)}`)
          .slice(0, 12)
        console.log(`      HIGH (>=C6): ${highNotes.join(', ')}${highNotes.length===12?'...':''}`)
      }
      console.log(`      histogram: ${histo}`)
    }
  }
}
