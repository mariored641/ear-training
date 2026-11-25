import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import { validateStyle } from '../src/lib/style-engine/StyleValidator.js'
import { generatePhrasesForChord, parseChordSymbol } from '../src/lib/style-engine/ChordEngine.js'
import { getInstrumentMap, GM } from '../src/constants/genreInstrumentMap.js'
import { PRESETS } from '../src/lib/style-engine/Humanizer.js'
import en from '../src/i18n/locales/en.js'
import he from '../src/i18n/locales/he.js'

const IDS = ['reggae_onedrop', 'reggae_steppers', 'reggae_rockers']
const KICK = 36

function loadStyle(id) {
  return JSON.parse(fs.readFileSync(new URL(`../public/styles-native/reggae/${id}.json`, import.meta.url), 'utf8'))
}

function beatInBar(position) {
  return Math.round((position % 4) * 4) / 4
}

function pitchClasses(notes) {
  return [...new Set(notes.map(note => ((note.pitch % 12) + 12) % 12))].sort((a, b) => a - b)
}

test('three reggae styles validate, register, and translate', () => {
  const index = JSON.parse(fs.readFileSync(new URL('../public/styles-native/index.json', import.meta.url), 'utf8'))
  const engine = fs.readFileSync(new URL('../src/components/backing-tracks/useBackingTrackEngine.js', import.meta.url), 'utf8')
  const catalog = engine.slice(engine.indexOf('export const GENRE_CATALOG'), engine.indexOf('const GENRE_STYLES'))
  assert.match(catalog, /category:\s*'reggae'/)

  for (const id of IDS) {
    const style = loadStyle(id)
    const result = validateStyle(style)
    assert.equal(result.valid, true, `${id} errors: ${result.errors.join('; ')}`)
    assert.deepEqual(result.errors, [])
    assert.ok(style.parts.Main_A, id)
    assert.equal(style.timeSignature, '4/4')
    assert.equal(style.division, 'BINARY')
    assert.ok(style.parts.Main_B?.sizeInBeats >= 4, id)
    assert.ok(style.parts.Fill_In_AA?.sizeInBeats >= 4, id)

    const entry = index.styles.find(item => item.id === id)
    assert.ok(entry, `${id} missing from index`)
    assert.equal(entry.path, `reggae/${id}.json`)
    assert.equal(entry.category, 'reggae')
    assert.ok(catalog.includes(`id: '${id}'`), `${id} missing from GENRE_CATALOG`)
    assert.equal(typeof en.backing.styles[id], 'string')
    assert.equal(typeof he.backing.styles[id], 'string')

    for (const [partName, part] of Object.entries(style.parts)) {
      for (const channel of Object.values(part.channels)) {
        for (const note of channel.notes) {
          assert.ok(note.position >= 0 && note.position < part.sizeInBeats, `${id} ${partName} position`)
          assert.ok(note.position + note.duration <= part.sizeInBeats + 1e-9, `${id} ${partName} duration hangs`)
        }
      }
    }
  }

  assert.equal(en.backing.genreCategories.reggae, 'Reggae')
  assert.equal(he.backing.genreCategories.reggae, 'ראגיי')
  assert.equal(PRESETS.reggae.timingBias > 0, true)
  assert.ok(PRESETS.reggae.timingRandomness < PRESETS.blues.timingRandomness)
})

test('one-drop, steppers, and rockers are different inside one bar', () => {
  const one = loadStyle('reggae_onedrop').parts.Main_A
  const step = loadStyle('reggae_steppers').parts.Main_A
  const rock = loadStyle('reggae_rockers').parts.Main_A
  const kicks = (part) => part.channels['9'].notes.filter(note => note.pitch === KICK).map(note => note.position)

  const oneKicks = kicks(one)
  assert.ok(oneKicks.length >= 2)
  for (const position of oneKicks) assert.equal(beatInBar(position), 2, `one-drop kick at ${position}`)

  const stepKicks = kicks(step)
  for (const beat of [0, 1, 2, 3]) {
    assert.ok(stepKicks.some(position => position === beat), `steppers missing kick on beat ${beat + 1}`)
  }

  const rockKicks = kicks(rock).map(beatInBar)
  assert.ok(rockKicks.includes(0), 'rockers kick on beat 1')
  assert.ok(rockKicks.includes(1.5), 'rockers kick on the & of 2')
  assert.ok(rockKicks.includes(2), 'rockers kick on beat 3')
  assert.equal(rockKicks.includes(1), false)
  assert.equal(rockKicks.includes(3), false)

  const oneBass = one.channels['10'].notes.map(note => note.position)
  assert.equal(oneBass.some(position => beatInBar(position) === 0), false)
  assert.equal(step.channels['10'].notes.some(note => note.position === 0), true)
  assert.equal(rock.channels['10'].notes.some(note => note.position === 0), true)
  const rockBassBeats = rock.channels['10'].notes
    .filter(note => note.position < 4)
    .map(note => beatInBar(note.position))
  assert.equal(rockBassBeats.includes(1), false, 'rockers bass does not walk beat 2')

  for (const [id, part, allowed] of [
    ['reggae_onedrop', one, new Set([0.5])],
    ['reggae_rockers', rock, new Set([0.5])],
    ['reggae_steppers', step, new Set([0.5, 0.75])],
  ]) {
    const skank = part.channels['12'].notes
    assert.ok(skank.length > 0, id)
    for (const note of skank) {
      const slot = Math.round((note.position % 1) * 4) / 4
      assert.ok(allowed.has(slot), `${id} skank on ${note.position}`)
      assert.ok(note.duration <= 0.2, `${id} skank duration ${note.duration}`)
    }
  }
})

test('reggae chord tones follow the chart and the instrument map is playable', () => {
  const style = loadStyle('reggae_onedrop')
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

  const base = getInstrumentMap('reggae_onedrop')
  assert.equal(base.guitar.program, GM.MUTED_GUITAR)
  assert.equal(base.bass.program, GM.ELECTRIC_BASS_FINGER)
  assert.equal(base.piano.program, GM.RHODES)
  assert.equal(getInstrumentMap('reggae_steppers').bass.program, GM.ELECTRIC_BASS_PICK)
})
