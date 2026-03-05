// useBackingTrack — central state + audio engine hook
// Sound engine: Tone.js with Salamander piano + MusyngKite guitar samplers

import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import { loadInstruments } from '../../lib/backing-tracks/instruments.js'
import { buildChordNotes } from '../../lib/backing-tracks/chords.js'
import { JAZZ_DEFAULTS } from '../../lib/backing-tracks/patterns/jazz.js'
import { BLUES_DEFAULTS } from '../../lib/backing-tracks/patterns/blues.js'
import { ROCK_DEFAULTS } from '../../lib/backing-tracks/patterns/rock.js'
import { COUNTRY_DEFAULTS } from '../../lib/backing-tracks/patterns/country.js'
import { jazzPattern } from '../../lib/backing-tracks/patterns/jazz.js'
import { bluesPattern } from '../../lib/backing-tracks/patterns/blues.js'
import { rockPattern } from '../../lib/backing-tracks/patterns/rock.js'
import { countryPattern } from '../../lib/backing-tracks/patterns/country.js'

const GENRE_DEFAULTS = {
  jazz:    JAZZ_DEFAULTS,
  blues:   BLUES_DEFAULTS,
  rock:    ROCK_DEFAULTS,
  country: COUNTRY_DEFAULTS,
}

const GENRE_PATTERNS = {
  jazz:    jazzPattern,
  blues:   bluesPattern,
  rock:    rockPattern,
  country: countryPattern,
}

const DEFAULT_VOLUMES   = { piano: 0.85, guitar: 0.85, bass: 0.85, drums: 0.85 }
const DEFAULT_GENRE     = 'jazz'
const DEFAULT_BAR_COUNT = 4

function makeEmptyBars(genre, count) {
  const d = GENRE_DEFAULTS[genre].defaultChord
  return Array.from({ length: count }, () => ({ ...d, extensions: [...(d.extensions || [])] }))
}

// steps-per-bar and grid type per genre
function getGenreGrid(genre) {
  return (genre === 'rock' || genre === 'country')
    ? { stepsPerBar: 16, stepDuration: (bpm) => (60 / bpm) / 4 }
    : { stepsPerBar: 12, stepDuration: (bpm) => (60 / bpm) / 3 }
}

export function useBackingTrack() {
  const [genre, setGenreState]       = useState(DEFAULT_GENRE)
  const [barCount, setBarCountState] = useState(DEFAULT_BAR_COUNT)
  const [chords, setChordsState]     = useState(() => makeEmptyBars(DEFAULT_GENRE, DEFAULT_BAR_COUNT))
  const [tempo, setTempoState]       = useState(GENRE_DEFAULTS[DEFAULT_GENRE].tempo)
  const [isPlaying, setIsPlaying]    = useState(false)
  const [currentBar, setCurrentBar]  = useState(0)
  const [maxLoops, setMaxLoopsState] = useState(0)   // 0 = infinite
  const [volumes, setVolumesState]   = useState(DEFAULT_VOLUMES)
  const [isLoading, setIsLoading]    = useState(false)

  const chordsRef    = useRef(chords)
  const volumesRef   = useRef(volumes)
  const maxLoopsRef  = useRef(maxLoops)
  const genreRef     = useRef(genre)
  const barCountRef  = useRef(barCount)
  const tempoRef     = useRef(tempo)
  const isPlayingRef = useRef(false)

  const instrumentsRef  = useRef(null)
  const sequenceRef     = useRef(null)   // Tone.Sequence
  const loopCountRef    = useRef(0)
  const currentBarRef   = useRef(0)
  const currentStepRef  = useRef(0)

  useEffect(() => { chordsRef.current   = chords   }, [chords])
  useEffect(() => { volumesRef.current  = volumes  }, [volumes])
  useEffect(() => { maxLoopsRef.current = maxLoops }, [maxLoops])
  useEffect(() => { genreRef.current    = genre    }, [genre])
  useEffect(() => { barCountRef.current = barCount }, [barCount])
  useEffect(() => { tempoRef.current    = tempo    }, [tempo])

  // ── Stop ──
  const stop = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop()
      sequenceRef.current.dispose()
      sequenceRef.current = null
    }
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    setIsPlaying(false)
    isPlayingRef.current = false
    setCurrentBar(0)
    currentBarRef.current  = 0
    currentStepRef.current = 0
    loopCountRef.current   = 0
  }, [])

  // ── Play ──
  const play = useCallback(async () => {
    stop()

    setIsLoading(true)
    try {
      await Tone.start()
      const instruments = instrumentsRef.current || await loadInstruments()
      instrumentsRef.current = instruments

      const bpm = tempoRef.current
      Tone.getTransport().bpm.value = bpm

      const currentGenre = genreRef.current
      const { stepsPerBar, stepDuration } = getGenreGrid(currentGenre)
      const pattern      = GENRE_PATTERNS[currentGenre]
      const stepsPerBeat = stepsPerBar / 4

      currentBarRef.current  = 0
      currentStepRef.current = 0
      loopCountRef.current   = 0

      const totalSteps = barCountRef.current * stepsPerBar

      const seq = new Tone.Sequence(
        (time, step) => {
          const bar  = Math.floor(step / stepsPerBar)
          const s    = step % stepsPerBar
          const beat = Math.floor(s / stepsPerBeat)
          const pos  = s % stepsPerBeat

          // Update currentBar display (schedule via Draw for React sync)
          if (s === 0) {
            Tone.getDraw().schedule(() => {
              setCurrentBar(bar)
              currentBarRef.current = bar
            }, time)
          }

          const chord     = chordsRef.current[bar] || chordsRef.current[0]
          const nextChord = chordsRef.current[(bar + 1) % chordsRef.current.length]

          pattern(s, beat, pos, chord, nextChord, time, instruments, volumesRef.current, 'A', false)

          // Handle finite loops
          currentStepRef.current = step + 1
          if (step === totalSteps - 1) {
            loopCountRef.current += 1
            const ml = maxLoopsRef.current
            if (ml > 0 && loopCountRef.current >= ml) {
              // Schedule stop after this last step plays
              Tone.getDraw().schedule(() => {
                stop()
              }, time)
            }
          }
        },
        Array.from({ length: totalSteps }, (_, i) => i),
        stepDuration(bpm)
      )

      seq.loop = true
      sequenceRef.current = seq
      seq.start(0)
      Tone.getTransport().start()

      setIsPlaying(true)
      isPlayingRef.current = true
    } finally {
      setIsLoading(false)
    }
  }, [stop])

  // ── Tempo ──
  const setTempo = useCallback((bpm) => {
    setTempoState(bpm)
    tempoRef.current = bpm
    // Update live if playing
    Tone.getTransport().bpm.value = bpm
  }, [])

  // ── Max loops ──
  const setMaxLoops = useCallback((n) => {
    setMaxLoopsState(n)
    maxLoopsRef.current = n
  }, [])

  // ── Genre change — only updates groove + tempo; chords/barCount are preserved ──
  const setGenre = useCallback((newGenre) => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    setGenreState(newGenre)
    genreRef.current = newGenre

    const defaults = GENRE_DEFAULTS[newGenre]
    setTempoState(defaults.tempo)
    tempoRef.current = defaults.tempo

    if (wasPlaying) setTimeout(() => play(), 50)
  }, [stop, play])

  // ── Load preset — replaces chords + barCount with the genre's built-in preset ──
  const loadPreset = useCallback(() => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    const defaults = GENRE_DEFAULTS[genreRef.current]
    const presetChords = defaults.preset.map(c => ({ ...c, extensions: [...(c.extensions || [])] }))
    const newCount = defaults.presetBarCount

    setChordsState(presetChords)
    chordsRef.current = presetChords
    setBarCountState(newCount)
    barCountRef.current = newCount

    if (wasPlaying) setTimeout(() => play(), 50)
  }, [stop, play])

  // ── Bar count change ──
  const setBarCount = useCallback((newCount) => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    const defaults = GENRE_DEFAULTS[genreRef.current]
    const current  = chordsRef.current.slice(0, newCount)
    const filled   = [
      ...current,
      ...Array.from({ length: Math.max(0, newCount - current.length) }, () => ({
        ...defaults.defaultChord,
        extensions: [...(defaults.defaultChord.extensions || [])],
      })),
    ]

    setChordsState(filled)
    chordsRef.current = filled
    setBarCountState(newCount)
    barCountRef.current = newCount

    if (wasPlaying) setTimeout(() => play(), 50)
  }, [stop, play])

  // ── Set individual chord ──
  const setChord = useCallback((barIndex, chord) => {
    setChordsState(prev => {
      const next = [...prev]
      next[barIndex] = chord
      chordsRef.current = next
      return next
    })
  }, [])

  // ── Preview chord (modal) ──
  const previewChord = useCallback(async (chord) => {
    await Tone.start()
    const instruments = instrumentsRef.current || await loadInstruments()
    instrumentsRef.current = instruments

    const notes = buildChordNotes(chord, 4)
    const now   = Tone.now()
    notes.forEach((note, i) => {
      instruments.piano.triggerAttackRelease(note, 1.8, now + i * 0.04, 0.8)
    })
  }, [])

  // ── Volume ──
  const setVolume = useCallback((channel, val) => {
    setVolumesState(prev => {
      const next = { ...prev, [channel]: val }
      volumesRef.current = next
      return next
    })
  }, [])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    genre, barCount, chords, tempo, isPlaying, currentBar,
    maxLoops, volumes, isLoading,
    play, stop, setTempo, setMaxLoops,
    setGenre, setBarCount, loadPreset,
    setChord, previewChord,
    setVolume,
    // initPlayer is no longer needed (no html-midi-player) — kept as no-op for API compat
    initPlayer: () => {},
  }
}
