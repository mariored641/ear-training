import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { validateStyle } from '../src/lib/style-engine/StyleValidator.js'
import { generatePhrasesForChord, parseChordSymbol } from '../src/lib/style-engine/ChordEngine.js'
import {
  resolveFillPart,
  getTransitionFillName,
  getIntroName,
  getEndingName,
} from '../src/lib/style-engine/VariationSelector.js'
import { getInstrumentMap, GM } from '../src/constants/genreInstrumentMap.js'
import { PRESETS } from '../src/lib/style-engine/Humanizer.js'
import en from '../src/i18n/locales/en.js'
import he from '../src/i18n/locales/he.js'

const ID = 'reggae'
const KICK = 36
const SNARE = 38
const PARTS = [
  'Main_A', 'Main_B', 'Main_C', 'Main_D',
  'Fill_In_AA', 'Fill_In_BB', 'Fill_In_CC', 'Fill_In_DD', 'Fill_In_BA',
  'Intro_A', 'Intro_B', 'Intro_C',
  'Ending_A', 'Ending_B', 'Ending_C',
]

function loadStyle() {
  return JSON.parse(fs.readFileSync(new URL(`../public/styles-native/reggae/${ID}.json`, import.meta.url), 'utf8'))
}

function beatInBar(position) {
  return Math.round((position % 4) * 4) / 4
}

function pitchClasses(notes) {
  return [...new Set(notes.map(note => ((note.pitch % 12) + 12) % 12))].sort((a, b) => a - b)
}

function kicks(part) {
  return part.channels['9'].notes.filter(note => note.pitch === KICK).map(note => note.position)
}

function noteCount(part, channel) {
  return part.channels[channel].notes.length
}

test('reggae is one 15-part style, registered and translated', () => {
  const style = loadStyle()
  const result = validateStyle(style)
  assert.equal(result.valid, true, result.errors.join('; '))
  assert.deepEqual(result.errors, [])
  assert.equal(style.tempo, 84)
  assert.equal(style.timeSignature, '4/4')
  assert.equal(style.division, 'BINARY')
  assert.equal(style.sffType, 'SFF1')
  assert.equal(style.ticksPerQuarter, 1920)
  assert.deepEqual(Object.keys(style.parts).sort(), [...PARTS].sort())

  for (const name of ['Main_A', 'Main_B', 'Main_C', 'Main_D']) {
    assert.equal(style.parts[name].sizeInBeats, 8, name)
  }
  for (const name of ['Fill_In_AA', 'Fill_In_BB', 'Fill_In_CC', 'Fill_In_DD', 'Fill_In_BA']) {
    assert.equal(style.parts[name].sizeInBeats, 4, name)
  }
  assert.equal(style.parts.Intro_A.sizeInBeats, 4)
  assert.ok(style.parts.Intro_B.sizeInBeats >= 8)
  assert.ok(style.parts.Intro_C.sizeInBeats >= 8)
  assert.ok(style.parts.Ending_A.sizeInBeats >= 4 && style.parts.Ending_A.sizeInBeats <= 8)
  assert.ok(style.parts.Ending_B.sizeInBeats >= 8)
  assert.ok(style.parts.Ending_C.sizeInBeats >= 8)

  for (const [partName, part] of Object.entries(style.parts)) {
    for (const channel of Object.values(part.channels)) {
      for (const note of channel.notes) {
        assert.ok(note.position >= 0 && note.position < part.sizeInBeats, `${partName} position`)
        assert.ok(note.position + note.duration <= part.sizeInBeats + 1e-9, `${partName} duration hangs`)
      }
    }
  }

  const index = JSON.parse(fs.readFileSync(new URL('../public/styles-native/index.json', import.meta.url), 'utf8'))
  const entry = index.styles.find(item => item.id === ID)
  assert.ok(entry, 'reggae missing from index')
  assert.equal(entry.path, 'reggae/reggae.json')
  assert.equal(entry.category, 'reggae')
  assert.equal(index.styles.some(item => ['reggae_onedrop', 'reggae_steppers', 'reggae_rockers'].includes(item.id)), false)

  const engine = fs.readFileSync(new URL('../src/components/backing-tracks/useBackingTrackEngine.js', import.meta.url), 'utf8')
  const catalog = engine.slice(engine.indexOf('export const GENRE_CATALOG'), engine.indexOf('const GENRE_STYLES'))
  assert.match(catalog, /category:\s*'reggae'/)
  assert.ok(catalog.includes(`id: '${ID}'`))
  assert.equal(catalog.includes('reggae_onedrop'), false)
  assert.equal(typeof en.backing.styles[ID], 'string')
  assert.equal(typeof he.backing.styles[ID], 'string')
  assert.equal(en.backing.genreCategories.reggae, 'Reggae')
  assert.equal(he.backing.genreCategories.reggae, 'ראגיי')
  assert.equal(PRESETS.reggae.timingBias > 0, true)
  assert.ok(PRESETS.reggae.timingRandomness < PRESETS.blues.timingRandomness)
})

test('the four mains keep one-drop, rockers, and two steppers feels', () => {
  const style = loadStyle()
  const mainA = style.parts.Main_A
  const mainB = style.parts.Main_B
  const mainC = style.parts.Main_C
  const mainD = style.parts.Main_D

  const oneKicks = kicks(mainA)
  assert.ok(oneKicks.length >= 2)
  for (const position of oneKicks) assert.equal(beatInBar(position), 2, `one-drop kick at ${position}`)
  assert.equal(mainA.channels['10'].notes.some(note => beatInBar(note.position) === 0), false)

  const rockKicks = kicks(mainB).map(beatInBar)
  assert.ok(rockKicks.includes(0), 'rockers kick on beat 1')
  assert.ok(rockKicks.includes(1.5), 'rockers kick on the & of 2')
  assert.ok(rockKicks.includes(2), 'rockers kick on beat 3')
  assert.equal(rockKicks.includes(1), false)
  assert.equal(rockKicks.includes(3), false)
  assert.equal(mainB.channels['10'].notes.some(note => note.position === 0), true)
  const rockBassBeats = mainB.channels['10'].notes
    .filter(note => note.position < 4)
    .map(note => beatInBar(note.position))
  assert.equal(rockBassBeats.includes(1), false, 'rockers bass does not walk beat 2')

  for (const beat of [0, 1, 2, 3]) {
    assert.ok(kicks(mainC).some(position => position === beat), `steppers missing kick on beat ${beat + 1}`)
    assert.ok(kicks(mainD).some(position => position === beat), `full steppers missing kick on beat ${beat + 1}`)
  }
  assert.equal(kicks(mainC).some(position => beatInBar(position) % 1 !== 0), false, 'Main C kicks are quarters only')
  assert.ok(kicks(mainD).includes(0.5), 'Main D adds the & kick')
  assert.equal(mainC.channels['10'].notes.some(note => note.position === 0), true)
  assert.equal(mainD.channels['10'].notes.some(note => note.position === 0), true)

  for (const channel of ['8', '9', '10', '12']) {
    assert.ok(noteCount(mainD, channel) > noteCount(mainC, channel), `Main D channel ${channel} is denser`)
  }
  const longest = notes => Math.max(...notes.map(note => note.duration))
  assert.ok(longest(mainD.channels['12'].notes) > longest(mainC.channels['12'].notes))

  for (const [name, part, allowed] of [
    ['Main_A', mainA, new Set([0.5])],
    ['Main_B', mainB, new Set([0.5])],
    ['Main_C', mainC, new Set([0.5, 0.75])],
    ['Main_D', mainD, new Set([0.25, 0.5, 0.75])],
  ]) {
    const skank = part.channels['12'].notes
    assert.ok(skank.length > 0, name)
    for (const note of skank) {
      const slot = Math.round((note.position % 1) * 4) / 4
      assert.ok(allowed.has(slot), `${name} skank on ${note.position}`)
      assert.ok(note.duration <= 0.2, `${name} skank duration ${note.duration}`)
    }
  }
})

test('fills, the BA transition, intros, and endings resolve', () => {
  const style = loadStyle()
  const parts = style.parts

  assert.equal(resolveFillPart('Main_A', 1, 2, parts, true), 'Fill_In_AA')
  assert.equal(resolveFillPart('Main_B', 1, 2, parts, true), 'Fill_In_BB')
  assert.equal(resolveFillPart('Main_C', 1, 2, parts, true), 'Fill_In_CC')
  assert.equal(resolveFillPart('Main_D', 1, 2, parts, true), 'Fill_In_DD')
  assert.equal(resolveFillPart('Main_A', 0, 2, parts, true), 'Main_A')
  assert.equal(getTransitionFillName('Main_B', 'Main_A', parts), 'Fill_In_BA')

  for (const letter of ['A', 'B', 'C']) {
    const intro = getIntroName(`Main_${letter}`, parts)
    const ending = getEndingName(`Main_${letter}`, parts)
    assert.equal(intro, `Intro_${letter}`)
    assert.equal(ending, `Ending_${letter}`)
    assert.ok(parts[intro].sizeInBeats > 0)
    assert.ok(parts[ending].sizeInBeats > 0)
  }
  assert.equal(getIntroName('Main_D', parts), null)
  assert.equal(getEndingName('Main_D', parts), null)

  const snares = part => part.channels['9'].notes.filter(note => note.pitch === SNARE)
  assert.equal(snares(parts.Main_A).length, 0)
  assert.ok(snares(parts.Fill_In_AA).length > 0, 'one-drop fill adds a snare')
  assert.equal(snares(parts.Main_B).length, 0)
  assert.ok(snares(parts.Fill_In_BB).length > 0, 'rockers fill adds a snare')
  assert.ok(snares(parts.Fill_In_CC).some(note => note.position >= 2.5), 'steppers fill rolls late in the bar')
  assert.ok(snares(parts.Fill_In_DD).length > snares(parts.Main_D).filter(note => note.position < 4).length)
  assert.ok(snares(parts.Fill_In_BA).some(note => note.position >= 3), 'BA ends with a snare pickup')
})

test('reggae chord tones follow the chart and the instrument map is playable', () => {
  const style = loadStyle()
  const c = generatePhrasesForChord(style, 'Main_A', parseChordSymbol('C'), 0)
  const f = generatePhrasesForChord(style, 'Main_A', parseChordSymbol('F'), 0)
  const am = generatePhrasesForChord(style, 'Main_A', parseChordSymbol('Am'), 0)

  assert.deepEqual(pitchClasses(c.BASS), [0, 4, 7])
  assert.deepEqual(pitchClasses(f.BASS), [0, 5, 9])
  assert.deepEqual(pitchClasses(am.BASS), [0, 4, 9])
  assert.deepEqual(pitchClasses(c.CHORD2), [0, 4, 7])
  assert.deepEqual(pitchClasses(f.CHORD2), [0, 5, 9])
  assert.deepEqual(pitchClasses(am.CHORD2), [0, 4, 9])
  assert.deepEqual(c.RHYTHM.map(note => note.pitch), f.RHYTHM.map(note => note.pitch))

  const map = getInstrumentMap('reggae')
  assert.equal(map.guitar.program, GM.MUTED_GUITAR)
  assert.equal(map.bass.program, GM.ELECTRIC_BASS_FINGER)
  assert.equal(map.piano.program, GM.RHODES)
})
