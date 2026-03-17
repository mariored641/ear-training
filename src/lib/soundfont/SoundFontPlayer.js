/**
 * SoundFontPlayer.js
 * Wrapper נקי סביב js-synthesizer (FluidSynth WASM)
 * משמש את מנוע ה-Backing Tracks החדש
 *
 * שימוש:
 *   import * as SFP from './SoundFontPlayer'
 *   await SFP.init(onProgress)
 *   SFP.programChange(0, 0)        // Piano
 *   SFP.noteOn(0, 60, 100)         // middle C
 *   SFP.noteOff(0, 60)
 */

import { Synthesizer } from 'js-synthesizer'

// בdev: Vite middleware מגיש מהמחשב המקומי
// בproduction: Vercel Blob URL מתוך env variable
const SF2_URL = import.meta.env.VITE_SF2_URL || '/soundfonts/JJazzLab-SoundFont.sf2'
const FLUIDSYNTH_SCRIPT_URL = '/libfluidsynth-2.4.6.js'

// ---- IndexedDB Cache ----
const IDB_DB = 'ear-training'
const IDB_STORE = 'sf2-cache'
const CACHE_KEY = 'jjazzlab-sf2-v1'

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

async function getFromCache() {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(CACHE_KEY)
      req.onsuccess = (e) => resolve(e.target.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveToCache(buffer) {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(buffer, CACHE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()  // fail silently
    })
  } catch {
    // fail silently — cache is optional
  }
}

// GM Program numbers (0-indexed)
export const GM = {
  ACOUSTIC_GRAND_PIANO: 0,
  ELECTRIC_BASS_FINGER: 33,
  ELECTRIC_BASS_PICK: 34,
  ACOUSTIC_BASS: 32,
  NYLON_GUITAR: 24,
  STEEL_GUITAR: 25,
  ELECTRIC_GUITAR_JAZZ: 26,
  STRINGS: 48,
  VIBRAPHONE: 11,
  TRUMPET: 56,
}

// MIDI channel assignments לכלי JJazzLab
export const CHANNELS = {
  PIANO: 0,
  BASS: 1,
  GUITAR: 2,
  PAD: 3,
  MELODY: 4,
  DRUMS: 9,  // MIDI channel 10 = channel index 9
}

let _synth = null
let _audioCtx = null
let _audioNode = null
let _sfontId = null
let _initPromise = null

function loadFluidSynthScript() {
  if (window.__fluidSynthLoaded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${FLUIDSYNTH_SCRIPT_URL}"]`)
    if (existing) {
      // Script tag exists — wait for it or resolve immediately
      window.__fluidSynthLoaded = true
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = FLUIDSYNTH_SCRIPT_URL
    script.async = false
    script.onload = () => {
      window.__fluidSynthLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${FLUIDSYNTH_SCRIPT_URL}`))
    document.head.appendChild(script)
  })
}

async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)

  const contentLength = response.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  const reader = response.body.getReader()
  const chunks = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    if (total > 0) {
      onProgress?.(Math.round((loaded / total) * 100), loaded, total)
    }
  }

  const buffer = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }
  return buffer.buffer
}

/**
 * אתחול המנגן. קורא פעם אחת, חוזר מהר בקריאות חוזרות.
 * @param {function} onProgress (message: string, percent: number) => void
 */
export async function init(onProgress) {
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    try {
      // 1. טעינת FluidSynth JS
      onProgress?.('טוען מנוע סינתזה...', 2)
      await loadFluidSynthScript()
      await Synthesizer.waitForWasmInitialized()

      // 2. AudioContext
      _audioCtx = new AudioContext()

      // 3. אתחול synth
      _synth = new Synthesizer()
      _synth.init(_audioCtx.sampleRate)

      // 4. חיבור ל-AudioContext
      _audioNode = _synth.createAudioNode(_audioCtx, 8192)
      _audioNode.connect(_audioCtx.destination)

      // 5. הגדרות reverb סטנדרטיות
      _synth.setReverb(0.4, 0.4, 0.5, 0.3)
      _synth.setReverbOn(true)

      // 6. טעינת SF2 — מ-cache אם יש, אחרת הורדה ושמירה
      onProgress?.('בודק cache...', 5)
      let sf2Buffer = await getFromCache()

      if (sf2Buffer) {
        onProgress?.('טוען SoundFont מ-cache...', 80)
      } else {
        onProgress?.('מוריד SoundFont...', 5)
        sf2Buffer = await fetchWithProgress(SF2_URL, (pct, loaded, total) => {
          const mb = Math.round(loaded / 1024 / 1024)
          const totalMb = Math.round(total / 1024 / 1024)
          onProgress?.(`מוריד SoundFont... ${mb}/${totalMb} MB`, 5 + Math.round(pct * 0.88))
        })
        // שמירה ב-cache ברקע — לא מחכים לה
        saveToCache(sf2Buffer)
      }

      onProgress?.('מאתחל instruments...', 95)
      _sfontId = await _synth.loadSFont(sf2Buffer)

      // 7. הגדרת channels ראשוניים
      _synth.midiSetChannelType(CHANNELS.DRUMS, true)

      // Piano
      _synth.midiProgramSelect(CHANNELS.PIANO, _sfontId, 0, GM.ACOUSTIC_GRAND_PIANO)
      // Bass
      _synth.midiProgramSelect(CHANNELS.BASS, _sfontId, 0, GM.ELECTRIC_BASS_FINGER)
      // Guitar
      _synth.midiProgramSelect(CHANNELS.GUITAR, _sfontId, 0, GM.ELECTRIC_GUITAR_JAZZ)
      // Pad
      _synth.midiProgramSelect(CHANNELS.PAD, _sfontId, 0, GM.STRINGS)

      onProgress?.('מוכן!', 100)
      return { sfontId: _sfontId }
    } catch (err) {
      _initPromise = null
      throw err
    }
  })()

  return _initPromise
}

/** AudioContext הנוכחי (לשימוש ה-scheduler) */
export function getAudioContext() {
  return _audioCtx
}

/** האם המנגן מוכן */
export function isReady() {
  return _synth !== null && _sfontId !== null
}

/** Resume AudioContext (נדרש לאחר user interaction) */
export function resumeAudio() {
  return _audioCtx?.resume()
}

/** Note On */
export function noteOn(channel, midi, velocity = 100) {
  if (!_synth) return
  _synth.midiNoteOn(channel, midi, velocity)
}

/** Note Off */
export function noteOff(channel, midi) {
  if (!_synth) return
  _synth.midiNoteOff(channel, midi)
}

/** שינוי תוכנית (instrument) לפי GM program number */
export function programChange(channel, program, bank = 0) {
  if (!_synth || _sfontId === null) return
  _synth.midiProgramSelect(channel, _sfontId, bank, program)
}

/** עצירת כל הצלילים */
export function allNotesOff(channel) {
  if (!_synth) return
  if (channel !== undefined) {
    _synth.midiAllNotesOff(channel)
  } else {
    for (let c = 0; c < 16; c++) {
      _synth.midiAllNotesOff(c)
    }
  }
}

/** עוצמה כללית (0.0 - 10.0) */
export function setGain(gain) {
  _synth?.setGain(gain)
}

/** ניקוי מלא */
export function destroy() {
  if (_synth) {
    _synth.midiAllSoundsOff()
    _synth.close()
    _synth = null
  }
  _audioNode = null
  _sfontId = null
  _initPromise = null
}
