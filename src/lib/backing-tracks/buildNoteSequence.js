// buildNoteSequence.js
// Simulates the pattern functions offline (no AudioContext) and collects notes
// into a Magenta NoteSequence for html-midi-player.
//
// LIMITATION: Changing volumes while playing won't take effect until the next
// play() call, because velocity is baked into the NoteSequence at build time.

import * as Tone from 'tone'
import { jazzPattern } from './patterns/jazz.js'
import { bluesPattern } from './patterns/blues.js'
import { rockPattern } from './patterns/rock.js'
import { countryPattern } from './patterns/country.js'

// Map note name like "C4" to MIDI number (C4 = 60)
function noteNameToMidi(noteName) {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const match = noteName.match(/^([A-G]#?)(\d+)$/)
  if (!match) return null
  const noteIndex = NOTES.indexOf(match[1])
  const octave = parseInt(match[2])
  return noteIndex + (octave + 1) * 12
}

// Map Tone.js duration string or numeric seconds to seconds at given BPM.
// Patterns may pass pre-computed numbers (from Tone.Time().toSeconds()) or
// string notations like '4n', '8n', etc.
function durationToSeconds(dur, bpm) {
  if (typeof dur === 'number') return dur
  const spb = 60 / bpm
  const map = {
    '1n':  spb * 4,
    '2n':  spb * 2,
    '4n':  spb,
    '8n':  spb / 2,
    '16n': spb / 4,
    '32n': spb / 8,
    '8t':  spb / 3,   // triplet eighth
    '16t': spb / 6,
  }
  return map[dur] ?? spb / 2
}

const PATTERNS = {
  jazz:    jazzPattern,
  blues:   bluesPattern,
  rock:    rockPattern,
  country: countryPattern,
}

export function getGridForGenre(genre) {
  return (genre === 'rock' || genre === 'country')
    ? { grid: '16n', stepsPerBar: 16 }
    : { grid: '8t',  stepsPerBar: 12 }
}

// MIDI channel + GM program for each instrument
const INSTRUMENT_CHANNELS = {
  piano:  { channel: 0, program: 0  },  // Acoustic Grand Piano
  guitar: { channel: 1, program: 25 },  // Acoustic Guitar (steel)
  bass:   { channel: 2, program: 33 },  // Electric Bass (finger)
  drums:  { channel: 9, program: 0  },  // GM Percussion (always ch 9)
}

// General MIDI percussion note numbers (channel 9)
const DRUM_MIDI = {
  'B1':  35, // Bass Drum 2
  'C2':  36, // Bass Drum 1
  'C#2': 37, // Side Stick
  'D2':  38, // Acoustic Snare
  'E2':  40, // Electric Snare
  'F2':  41, // Low Floor Tom
  'F#2': 42, // Closed Hi-Hat
  'G#2': 44, // Pedal Hi-Hat
  'A#2': 46, // Open Hi-Hat
  'A2':  45, // Low Mid Tom
  'B2':  47, // High Mid Tom
  'C3':  48, // High Floor Tom
  'C#3': 49, // Crash Cymbal 1
  'D#3': 51, // Ride Cymbal 1
  'A3':  49, // Crash Cymbal 1 (alias used in blues/rock/country)
}

export function buildNoteSequence({ genre, chords, barCount, tempo, volumes }) {
  const { stepsPerBar } = getGridForGenre(genre)
  const secondsPerBeat = 60 / tempo
  const stepDuration = (genre === 'rock' || genre === 'country')
    ? secondsPerBeat / 4   // straight 16th note
    : secondsPerBeat / 3   // triplet 8th note

  // Set Tone's BPM so Tone.Time().toSeconds() calls inside patterns return
  // correct values for this tempo (patterns compute durations via Tone.Time).
  try { Tone.getTransport().bpm.value = tempo } catch (_) { /* safe to ignore */ }

  const notes = []

  function makeCollector(channelInfo, isDrum = false) {
    return {
      triggerAttackRelease(noteName, duration, time, velocity = 0.8) {
        const midi = isDrum
          ? (DRUM_MIDI[noteName] ?? null)
          : noteNameToMidi(noteName)
        if (midi === null) return

        const durSec = durationToSeconds(duration, tempo)
        // Clamp velocity [0,1] → MIDI [0,127]
        const vel = Math.min(127, Math.max(1, Math.round(Math.abs(velocity) * 127)))

        notes.push({
          pitch:      midi,
          startTime:  time,
          endTime:    time + durSec * 0.9,  // slight gap to avoid overlaps
          velocity:   vel,
          instrument: channelInfo.channel,
          program:    channelInfo.program,
          isDrum,
        })
      },
    }
  }

  const instruments = {
    piano:         makeCollector(INSTRUMENT_CHANNELS.piano),
    bass:          makeCollector(INSTRUMENT_CHANNELS.bass),
    drums:         makeCollector(INSTRUMENT_CHANNELS.drums, true),
    // Each genre references guitar by a different name
    rockGuitar:    makeCollector(INSTRUMENT_CHANNELS.guitar),
    bluesGuitar:   makeCollector(INSTRUMENT_CHANNELS.guitar),
    countryGuitar: makeCollector(INSTRUMENT_CHANNELS.guitar),
  }

  const pattern = PATTERNS[genre]
  const stepsPerBeat = stepsPerBar / 4

  for (let bar = 0; bar < barCount; bar++) {
    const chord     = chords[bar] || chords[0]
    const nextChord = chords[(bar + 1) % chords.length]
    // Single pass → always substyle 'A'; loop boundaries have no crash
    // (html-midi-player handles looping transparently)
    const substyle    = 'A'
    const isTransition = false

    for (let step = 0; step < stepsPerBar; step++) {
      const time = (bar * stepsPerBar + step) * stepDuration
      const beat = Math.floor(step / stepsPerBeat)
      const pos  = step % stepsPerBeat
      pattern(step, beat, pos, chord, nextChord, time, instruments, volumes, substyle, isTransition)
    }
  }

  const totalTime = barCount * stepsPerBar * stepDuration

  return {
    totalTime,
    tempos:         [{ time: 0, qpm: tempo }],
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    notes,
  }
}
