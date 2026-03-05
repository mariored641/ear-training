// Instrument loading for Backing Tracks
// Piano: Tone.js Sampler (Salamander Grand — Yamaha C5)
// Rock guitar: electric_guitar_clean sampler + heavy distortion
// Blues guitar: electric_guitar_jazz sampler + light overdrive distortion
// Country guitar: acoustic_guitar_steel sampler
// Bass: MusyngKite electric_bass_finger sampler
// Drums: Hybrid kit — Kit8 samples (kick/snare/hihat) + Tone.js synths (ride/crash/toms/rimshot)

import * as Tone from 'tone'

// MusyngKite soundfonts — gleitz CDN (cached by service worker)
const EL_GUITAR_BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/electric_guitar_clean-mp3/'
const AC_GUITAR_BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_guitar_steel-mp3/'

// Sample notes that cover the guitar range (E2–E4)
const GUITAR_URLS = {
  E2: 'E2.mp3', A2: 'A2.mp3', D3: 'D3.mp3',
  G3: 'G3.mp3', B3: 'B3.mp3', E4: 'E4.mp3',
}

let cachedInstruments = null
let loading = false
const listeners = []

export async function loadInstruments() {
  if (cachedInstruments) return cachedInstruments
  if (loading) {
    // Queue up if already loading
    return new Promise(resolve => listeners.push(resolve))
  }

  loading = true

  try {
    // ── Piano: Salamander Grand (Yamaha C5, recorded) ──
    const piano = new Tone.Sampler({
      urls: {
        C4:    'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4:    'A4.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination()

    // ── Rock guitar: electric sampler → heavy distortion ──
    const rockDist = new Tone.Distortion({ distortion: 0.8, wet: 1.0 }).toDestination()
    const rockGuitar = new Tone.Sampler({
      urls: GUITAR_URLS,
      baseUrl: EL_GUITAR_BASE,
    }).connect(rockDist)

    // ── Blues guitar: jazz electric sampler → light overdrive (warmer tone) ──
    const bluesDist = new Tone.Distortion({ distortion: 0.35, wet: 0.65 }).toDestination()
    const bluesGuitar = new Tone.Sampler({
      urls: GUITAR_URLS,
      baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/electric_guitar_jazz-mp3/',
    }).connect(bluesDist)

    // ── Country guitar: acoustic steel sampler (no effects) ──
    const countryGuitar = new Tone.Sampler({
      urls: GUITAR_URLS,
      baseUrl: AC_GUITAR_BASE,
    }).toDestination()

    // ── Drums: hybrid kit ──

    // Kit8 — fuller, more natural acoustic drum sound than CR78
    const drumSampler = new Tone.Sampler(
      { C2: 'kick.mp3', D2: 'snare.mp3', 'F#2': 'hihat.mp3' },
      { baseUrl: 'https://tonejs.github.io/audio/drum-samples/Kit8/' }
    ).toDestination()

    // Side stick / rim click — short white-noise burst through high-pass filter
    const rimFilter = new Tone.Filter({ type: 'highpass', frequency: 3500 }).toDestination()
    const rimSynth  = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.022, sustain: 0, release: 0.02 },
      volume: -4,
    }).connect(rimFilter)

    // Ride cymbal — metallic, medium decay
    const rideSynth = new Tone.MetalSynth({
      frequency: 280,
      envelope: { attack: 0.001, decay: 0.55, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -10,
    }).toDestination()

    // Crash cymbal — metallic, long decay
    const crashSynth = new Tone.MetalSynth({
      frequency: 440,
      envelope: { attack: 0.001, decay: 2.0, release: 0.5 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -7,
    }).toDestination()

    // Toms — pitched membrane drum
    const tomSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0.01, release: 0.2 },
      volume: -6,
    }).toDestination()

    // Drum kit router — maps MIDI note names to the appropriate synth
    // Pattern code calls drums.triggerAttackRelease(note, dur, time, vel) unchanged
    const drums = {
      triggerAttackRelease(note, duration, time, velocity = 1) {
        const v = Math.min(1, Math.max(0, velocity || 0))
        switch (note) {
          case 'B1':  drumSampler.triggerAttackRelease('C2',  duration, time, v * 0.75); break // Soft kick
          case 'C2':  drumSampler.triggerAttackRelease('C2',  duration, time, v); break         // Kick
          case 'D2':  drumSampler.triggerAttackRelease('D2',  duration, time, v); break         // Snare
          case 'E2':  drumSampler.triggerAttackRelease('D2',  duration, time, v * 0.9); break   // Snare 2
          case 'F#2': drumSampler.triggerAttackRelease('F#2', duration, time, v); break         // Closed hi-hat
          case 'G#2': drumSampler.triggerAttackRelease('F#2', duration, time, v * 0.8); break   // Pedal hi-hat
          case 'A#2': drumSampler.triggerAttackRelease('F#2', duration, time, v * 1.1); break   // Open hi-hat
          case 'C#2': rimSynth.triggerAttackRelease(duration, time, v); break                   // Side stick
          case 'D#3': rideSynth.triggerAttackRelease(duration, time, v); break                  // Ride cymbal
          case 'A3':
          case 'C#3': crashSynth.triggerAttackRelease(duration, time, v); break                 // Crash cymbal
          case 'B2':  tomSynth.triggerAttackRelease('A1',  duration, time, v); break            // Mid tom
          case 'A2':  tomSynth.triggerAttackRelease('B1',  duration, time, v); break            // Mid tom 2
          case 'C3':  tomSynth.triggerAttackRelease('C2',  duration, time, v); break            // High tom
          case 'F2':  tomSynth.triggerAttackRelease('G1',  duration, time, v); break            // Low tom
          default:    drumSampler.triggerAttackRelease(note,  duration, time, v); break         // Fallback
        }
      },
    }

    // MusyngKite electric_bass_finger — real bass guitar samples
    const bass = new Tone.Sampler({
      urls: {
        E1: 'E1.mp3', A1: 'A1.mp3', D2: 'D2.mp3',
        G2: 'G2.mp3', B2: 'B2.mp3', E3: 'E3.mp3',
      },
      baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/electric_bass_finger-mp3/',
    }).toDestination()

    // Wait for all Tone.js buffers (piano + drums + guitars) to finish loading
    await Tone.loaded()

    cachedInstruments = { piano, rockGuitar, bluesGuitar, countryGuitar, drums, bass }

    // Resolve any queued callers
    listeners.forEach(resolve => resolve(cachedInstruments))
    listeners.length = 0

    return cachedInstruments
  } finally {
    loading = false
  }
}

export function getInstrumentsSync() {
  return cachedInstruments
}

// Call this to force a fresh load (e.g. after AudioContext was suspended)
export function clearInstrumentCache() {
  cachedInstruments = null
}
