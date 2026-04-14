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

import { Synthesizer, AudioWorkletNodeSynthesizer } from 'js-synthesizer'

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
let _useWorklet = false

// ---- Crackling detector ----
let _analyser = null
let _cracklingInterval = null
let _prevSamples = null

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

      // Reverb settings for both paths
      const reverbSettings = {
        reverbActive: true,
        reverbRoomSize: 0.4,
        reverbDamp: 0.4,
        reverbWidth: 0.5,
        reverbLevel: 0.3,
      }

      // 3. Try AudioWorklet first (synthesis off main thread = no crackling)
      try {
        onProgress?.('טוען AudioWorklet...', 3)
        await _audioCtx.audioWorklet.addModule(FLUIDSYNTH_SCRIPT_URL)
        await _audioCtx.audioWorklet.addModule('/js-synthesizer.worklet.min.js')

        _synth = new AudioWorkletNodeSynthesizer()
        _synth.init(_audioCtx.sampleRate, reverbSettings)
        _audioNode = _synth.createAudioNode(_audioCtx)
        _useWorklet = true
        console.log('[SFP] Using AudioWorklet — synthesis off main thread')
      } catch (workletErr) {
        // Fallback: ScriptProcessorNode with larger buffer
        console.warn('[SFP] AudioWorklet failed, falling back to ScriptProcessor:', workletErr.message)
        _synth = new Synthesizer()
        _synth.init(_audioCtx.sampleRate)
        _audioNode = _synth.createAudioNode(_audioCtx, 1024)
        _synth.setReverb(0.4, 0.4, 0.5, 0.3)
        _synth.setReverbOn(true)
        _useWorklet = false
      }

      // 4. Connect through AnalyserNode for crackling detection
      _analyser = _audioCtx.createAnalyser()
      _analyser.fftSize = 2048
      _audioNode.connect(_analyser)
      _analyser.connect(_audioCtx.destination)

      // 5. טעינת SF2 — מ-cache אם יש, אחרת הורדה ושמירה
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

      // 6. הגדרת channels ראשוניים
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

// ---- Crackling Detection ----

/** Start monitoring audio for crackling (logs to console) */
export function startCracklingMonitor() {
  if (!_analyser || _cracklingInterval) return
  const bufLen = _analyser.fftSize
  _prevSamples = new Float32Array(bufLen)
  let totalClicks = 0

  _cracklingInterval = setInterval(() => {
    const samples = new Float32Array(bufLen)
    _analyser.getFloatTimeDomainData(samples)

    // Detect sudden amplitude jumps (clicks/pops)
    let clicksThisFrame = 0
    for (let i = 1; i < bufLen; i++) {
      const delta = Math.abs(samples[i] - samples[i - 1])
      if (delta > 0.3) clicksThisFrame++
    }

    totalClicks += clicksThisFrame
    if (clicksThisFrame > 0) {
      console.warn(`[SFP Crackling] ${clicksThisFrame} clicks detected (total: ${totalClicks})`)
    }
  }, 500)

  console.log('[SFP] Crackling monitor started')
}

/** Stop monitoring */
export function stopCracklingMonitor() {
  if (_cracklingInterval) {
    clearInterval(_cracklingInterval)
    _cracklingInterval = null
    _prevSamples = null
    console.log('[SFP] Crackling monitor stopped')
  }
}

/** ניקוי מלא */
export function destroy() {
  stopCracklingMonitor()
  if (_synth) {
    _synth.midiAllSoundsOff()
    _synth.close()
    _synth = null
  }
  _audioNode = null
  _analyser = null
  _sfontId = null
  _initPromise = null
  _useWorklet = false
}
