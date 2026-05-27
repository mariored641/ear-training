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
 *
 * החלפת ספרייה (A/B testing) — דרך getDefaultLibrary() / getLibraryById():
 *   await SFP.swapSoundFont(libraryConfig, onProgress)
 */

import { Synthesizer, AudioWorkletNodeSynthesizer } from 'js-synthesizer'
import { getDefaultLibrary } from './SoundFontRegistry'

const FLUIDSYNTH_SCRIPT_URL = '/libfluidsynth-2.4.6.js'

// ---- IndexedDB Cache ----
const IDB_DB = 'ear-training'
const IDB_STORE = 'sf2-cache'

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

async function getFromCache(cacheKey) {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(cacheKey)
      req.onsuccess = (e) => resolve(e.target.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveToCache(cacheKey, buffer) {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(buffer, cacheKey)
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
let _currentLibrary = null
let _swapPromise = null

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

// ---- שולף את ה-SF2 buffer (cache → fetch → cache) ----
async function fetchSoundFontBuffer(libraryConfig, onProgress) {
  if (!libraryConfig?.url) {
    throw new Error(`SoundFont library "${libraryConfig?.id || '?'}" has no URL configured`)
  }
  onProgress?.('בודק cache...', 5)
  let buffer = await getFromCache(libraryConfig.cacheKey)
  if (buffer) {
    onProgress?.('טוען SoundFont מ-cache...', 80)
    return buffer
  }
  onProgress?.('מוריד SoundFont...', 5)
  buffer = await fetchWithProgress(libraryConfig.url, (pct, loaded, total) => {
    const mb = Math.round(loaded / 1024 / 1024)
    const totalMb = Math.round(total / 1024 / 1024)
    onProgress?.(`מוריד SoundFont... ${mb}/${totalMb} MB`, 5 + Math.round(pct * 0.88))
  })
  // שמירה ב-cache ברקע — לא מחכים לה
  saveToCache(libraryConfig.cacheKey, buffer)
  return buffer
}

// ---- מבצע program changes לערוצי ברירת המחדל ----
function applyDefaultPrograms() {
  if (!_synth || _sfontId === null) return
  _synth.midiSetChannelType(CHANNELS.DRUMS, true)
  _synth.midiProgramSelect(CHANNELS.PIANO,  _sfontId, 0, GM.ACOUSTIC_GRAND_PIANO)
  _synth.midiProgramSelect(CHANNELS.BASS,   _sfontId, 0, GM.ELECTRIC_BASS_FINGER)
  _synth.midiProgramSelect(CHANNELS.GUITAR, _sfontId, 0, GM.ELECTRIC_GUITAR_JAZZ)
  _synth.midiProgramSelect(CHANNELS.PAD,    _sfontId, 0, GM.STRINGS)
}

/**
 * אתחול המנגן. קורא פעם אחת, חוזר מהר בקריאות חוזרות.
 * @param {function} onProgress   (message: string, percent: number) => void
 * @param {object}   libraryConfig (אופציונלי) ספרייה לטעון בפעם הראשונה. ברירת המחדל — JJazzLab.
 */
export async function init(onProgress, libraryConfig) {
  if (_initPromise) return _initPromise

  const library = libraryConfig || getDefaultLibrary()

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
      const sf2Buffer = await fetchSoundFontBuffer(library, onProgress)

      onProgress?.('מאתחל instruments...', 95)
      _sfontId = await _synth.loadSFont(sf2Buffer)
      _currentLibrary = library

      // 6. הגדרת channels ראשוניים
      applyDefaultPrograms()

      onProgress?.('מוכן!', 100)
      return { sfontId: _sfontId, library }
    } catch (err) {
      _initPromise = null
      throw err
    }
  })()

  return _initPromise
}

/**
 * החלפת ספריית SF2 הטעונה כרגע. אם ה-synth עוד לא אותחל — מאתחל אותו עם הספרייה החדשה.
 * אם הספרייה המבוקשת כבר טעונה — no-op.
 *
 * @param {object}   libraryConfig — מ-SoundFontRegistry.SOUNDFONT_LIBRARIES
 * @param {function} onProgress    — (message, percent) => void
 * @returns {Promise<{ library: object }>}
 */
export async function swapSoundFont(libraryConfig, onProgress) {
  if (!libraryConfig) throw new Error('swapSoundFont: libraryConfig is required')
  if (!libraryConfig.url) throw new Error(`Library "${libraryConfig.id}" has no URL configured (set VITE_SF2_URL_${libraryConfig.id.toUpperCase()})`)

  // הימנעות מ-race בין קריאות swap מקבילות
  if (_swapPromise) await _swapPromise.catch(() => {})

  _swapPromise = (async () => {
    // אם המנוע עדיין לא אותחל — init יבצע את הטעינה הראשונית עם הספרייה הזו
    if (!_initPromise) {
      await init(onProgress, libraryConfig)
      return { library: _currentLibrary }
    }

    // אחרת — נחכה שה-init הקיים יסיים ואז נחליף
    await _initPromise

    if (_currentLibrary?.id === libraryConfig.id) {
      onProgress?.('כבר טעון', 100)
      return { library: _currentLibrary }
    }

    if (!_synth) throw new Error('Synthesizer not initialized')

    // עוצרים את כל הצלילים לפני tear-down
    allNotesOff()

    // פריקת ה-SF הקיים (FluidSynth תומך)
    if (_sfontId !== null) {
      try {
        await _synth.unloadSFont(_sfontId)
      } catch (err) {
        console.warn('[SFP] unloadSFont failed (continuing):', err?.message)
      }
      _sfontId = null
    }

    // טעינת ה-buffer החדש
    const buffer = await fetchSoundFontBuffer(libraryConfig, onProgress)

    onProgress?.('מאתחל instruments...', 95)
    _sfontId = await _synth.loadSFont(buffer)
    _currentLibrary = libraryConfig

    applyDefaultPrograms()

    onProgress?.('מוכן!', 100)
    return { library: _currentLibrary }
  })()

  try {
    return await _swapPromise
  } finally {
    _swapPromise = null
  }
}

/** הספרייה שטעונה כרגע (או null אם עוד לא אותחל) */
export function getCurrentLibrary() {
  return _currentLibrary
}

/** AudioContext הנוכחי (לשימוש ה-scheduler) */
export function getAudioContext() {
  return _audioCtx
}

/** AnalyserNode שדרכו עובר כל הפלט (לטסטים / מדידת אמפליטודה) */
export function getAnalyser() {
  return _analyser
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

/** MIDI Control Change (CC) — לדוגמה CC#7 = ווליום ערוץ, CC#10 = פאן */
export function midiControl(channel, cc, value) {
  if (!_synth) return
  _synth.midiControl(channel, cc, Math.max(0, Math.min(127, value | 0)))
}

/**
 * עוצמה לערוץ בודד (per-channel volume) דרך MIDI CC#7.
 * @param {number} channel  0..15 — אינדקס ערוץ MIDI
 * @param {number} gain     0..1 — מומר ל-CC value 0..127
 */
export function setChannelVolume(channel, gain) {
  if (!_synth) return
  const cc7 = Math.max(0, Math.min(127, Math.round(gain * 127)))
  _synth.midiControl(channel, 7, cc7)
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
  _currentLibrary = null
  _swapPromise = null
}
