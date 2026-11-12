/**
 * SoundFontPlayer.js
 * Wrapper נקי סביב js-synthesizer (FluidSynth WASM)
 * משמש את מנוע ה-Backing Tracks ואת התרגילים הריאקטיביים.
 *
 * שימוש:
 *   import * as SFP from './SoundFontPlayer'
 *   await SFP.init(onProgress, { presets: [{ bank: 0, program: 0 }, SFP.DRUM_KIT] })
 *   SFP.programChange(0, 0)        // Piano
 *   SFP.noteOn(0, 60, 100)         // middle C
 *   SFP.noteOff(0, 60)
 *
 * ── טעינת סאונדים: "packs" ─────────────────────────────────────────────────
 * כל preset (כלי) הוא קובץ SF3 קטן (Ogg Vorbis) — ראה SoundFontRegistry.
 * נטען רק מה שצריך: ensurePresets([...]) מוריד (או שולף מ-IndexedDB) וטוען
 * ל-FluidSynth. programChange() על preset שעוד לא נטען — טוען אותו ברקע
 * ובוחר אותו כשהוא מוכן (מחזיר Promise).
 *
 * FluidSynth ה-WASM נטען בגרסת "with-libsndfile" — הנדרשת לפענוח SF3.
 *
 * החלפת ספרייה (A/B testing ב-/test/sf2-lab):
 *   await SFP.swapSoundFont(libraryConfig, onProgress)
 */

import { Synthesizer, AudioWorkletNodeSynthesizer } from 'js-synthesizer'
import { getDefaultLibrary, isPackLibrary, LEGACY_CACHE_KEYS } from './SoundFontRegistry'
import i18n from '../../i18n/index.js'
import {
  SoundLoadError, withRetry, withTimeout, fetchBuffer, looksLikeSoundFont,
} from './loadResilience'

const FLUIDSYNTH_SCRIPT_URL = '/libfluidsynth-2.4.6-with-libsndfile.js'

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

/** מוחק עותק פגום מה-cache כדי שההורדה הבאה תהיה נקייה */
async function deleteFromCache(cacheKey) {
  try {
    const db = await openIDB()
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(cacheKey)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // not critical
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

let _legacyCleanupDone = false
/** מוחק מה-IndexedDB את ה-SF2 הישן (356MB) שנשמר אצל משתמשים — פעם אחת לסשן */
async function cleanupLegacyCache() {
  if (_legacyCleanupDone) return
  _legacyCleanupDone = true
  try {
    const db = await openIDB()
    const tx = db.transaction(IDB_STORE, 'readwrite')
    for (const key of LEGACY_CACHE_KEYS) tx.objectStore(IDB_STORE).delete(key)
  } catch {
    // not critical
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

/** ערכת התופים (GM bank 128) — היחידה שנמצאת ב-packs */
export const DRUM_KIT = Object.freeze({ bank: 128, program: 0 })

/** התוכניות שכל ערוץ מקבל כברירת מחדל */
const DEFAULT_CHANNEL_PRESETS = [
  [CHANNELS.PIANO,  { bank: 0, program: GM.ACOUSTIC_GRAND_PIANO }],
  [CHANNELS.BASS,   { bank: 0, program: GM.ELECTRIC_BASS_FINGER }],
  [CHANNELS.GUITAR, { bank: 0, program: GM.ELECTRIC_GUITAR_JAZZ }],
  [CHANNELS.PAD,    { bank: 0, program: GM.STRINGS }],
  [CHANNELS.DRUMS,  DRUM_KIT],
]

/** מה init() טוען כשלא ביקשו presets ספציפיים (תואם ל-applyDefaultPrograms הישן) */
export const DEFAULT_PRESETS = DEFAULT_CHANNEL_PRESETS.map(([, p]) => p)

const presetKey = ({ bank = 0, program }) => `${bank}:${program}`

let _synth = null
let _audioCtx = null
let _audioNode = null
let _synthPromise = null
let _useWorklet = false
let _currentLibrary = null
let _libraryPromise = null
let _swapPromise = null

// full-SF2 mode (sf2-lab): one sfont holds every preset
let _fullSfontId = null
// pack mode: 'bank:program' → sfontId
const _packSfonts = new Map()
const _packLoads = new Map()        // 'bank:program' → Promise<void>
const _downloads = new Map()        // cacheKey → Promise<void> (download → IndexedDB)
let _manifestPromise = null
let _manifestBaseUrl = null
// desired preset per channel (survives late pack loads / library swaps)
const _channelPresets = new Map(DEFAULT_CHANNEL_PRESETS)

// ---- Crackling detector ----
let _analyser = null
let _cracklingInterval = null
let _prevSamples = null

let _scriptPromise = null

/**
 * טוען את libfluidsynth-*.js (מגדיר את ה-global `Module`).
 * חשוב: לא מסמנים "נטען" רק כי קיים <script> בדף — תג שנכשל/נקטע (רשת, reload של
 * Vite באמצע, offline) נשאר ב-DOM, וניסיון חוזר היה מקבל "הצלחה" בלי Module, ואז
 * js-synthesizer זורק "wasm module is not available". לכן: מחכים לאירוע load האמיתי,
 * מוודאים ש-Module קיים, ובכישלון מסירים את התג כדי שאפשר לנסות שוב.
 */
function injectFluidSynthScript(attempt) {
  return new Promise((resolve, reject) => {
    window.__fluidSynthLoaded = false
    // תגים ישנים (שנכשלו או שלא סיימו) — מוחקים ויוצרים מחדש
    document.querySelectorAll('script[data-fluidsynth]').forEach(s => s.remove())

    const script = document.createElement('script')
    // בניסיון חוזר מוסיפים query כדי לעקוף עותק שבור ב-HTTP cache / service worker
    script.src = attempt === 0 ? FLUIDSYNTH_SCRIPT_URL : `${FLUIDSYNTH_SCRIPT_URL}?retry=${attempt}`
    script.dataset.fluidsynth = '1'
    script.async = false
    script.onload = () => {
      if (typeof window.Module === 'undefined') {
        script.remove()
        reject(new SoundLoadError(`${FLUIDSYNTH_SCRIPT_URL} loaded but did not define Module`))
        return
      }
      window.__fluidSynthLoaded = true
      resolve()
    }
    script.onerror = () => {
      script.remove()
      reject(new SoundLoadError(`Failed to load ${FLUIDSYNTH_SCRIPT_URL}`))
    }
    document.head.appendChild(script)
  })
}

function loadFluidSynthScript(onProgress) {
  if (window.__fluidSynthLoaded && typeof window.Module !== 'undefined') return Promise.resolve()
  if (_scriptPromise) return _scriptPromise

  _scriptPromise = withRetry(injectFluidSynthScript, {
    label: 'FluidSynth script',
    onRetry: () => onProgress?.(i18n.t('soundfont.retrying'), 2),
  }).catch(err => {
    _scriptPromise = null
    throw err
  })
  return _scriptPromise
}

/** הורדה בודדת (ללא retry) — ל-SF2 המלא של sf2-lab */
const fetchWithProgress = (url, onProgress) => fetchBuffer(url, onProgress)

/**
 * מוריד pack אחד עם ניסיונות חוזרים: בדיקת גודל + header של SoundFont, ו-timeout לתקיעה.
 * @param {(msg:string)=>void} [onRetry]
 */
function downloadPack(library, pack, onProgress, onRetry) {
  return withRetry(
    (attempt) => fetchBuffer(`${library.baseUrl}/${pack.file}`, onProgress, {
      expectedBytes: pack.bytes,
      bypassCache: attempt > 0,
      validateSoundFont: true,
    }),
    { label: `pack ${pack.file}`, onRetry },
  )
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)

// ════════════════════════════════════════════════════════════════════════════
// Packs (SF3 per preset)
// ════════════════════════════════════════════════════════════════════════════

function getManifest(library) {
  if (!_manifestPromise || _manifestBaseUrl !== library.baseUrl) {
    _manifestBaseUrl = library.baseUrl
    const url = `${library.baseUrl}/manifest.json`
    const lsKey = `sfp:manifest:${library.cacheKey}`
    // 'no-cache' = revalidate (cheap 304) — the .sf3 files themselves are immutable
    _manifestPromise = withRetry(async (attempt) => {
      let r
      try {
        r = await fetch(url, { cache: attempt === 0 ? 'no-cache' : 'reload' })
      } catch (err) {
        throw new SoundLoadError(`Network error: ${url}`, { cause: err })
      }
      if (!r.ok) throw new SoundLoadError(`HTTP ${r.status}: ${url}`, { status: r.status })
      // JSON לא תקין / HTML (SPA rewrite) → נזרק כאן ומנוסה שוב
      const manifest = await r.json().catch(() => null)
      if (!manifest?.packs) throw new SoundLoadError(`Invalid manifest: ${url}`)
      try { localStorage.setItem(lsKey, JSON.stringify(manifest)) } catch { /* optional */ }
      return manifest
    }, { label: 'manifest' })
      .catch(err => {
        // offline / שרת נפל: משתמשים בעותק האחרון שהצליח (ה-packs עצמם כבר ב-IndexedDB)
        try {
          const saved = JSON.parse(localStorage.getItem(lsKey))
          if (saved?.packs) {
            console.warn('[SFP] manifest fetch failed — using last known copy:', err?.message)
            return saved
          }
        } catch { /* no saved copy */ }
        _manifestPromise = null
        throw err
      })
  }
  return _manifestPromise
}

const packCacheKey = (library, file) => `${library.cacheKey}:${file}`

/**
 * מוודא שקבצי ה-pack נמצאים ב-IndexedDB (הורדה אם צריך) ומחזיר אותם.
 * @returns {Promise<Map<string, ArrayBuffer>>}  key → buffer
 */
async function fetchPackBuffers(library, keys, onProgress, { skipCache = false } = {}) {
  const manifest = await getManifest(library)
  const entries = []
  for (const key of keys) {
    const pack = manifest.packs[key]
    if (!pack) {
      console.warn(`[SFP] preset ${key} is not in the SoundFont packs — skipped`)
      continue
    }
    entries.push({ key, pack, cacheKey: packCacheKey(library, pack.file) })
  }

  onProgress?.(i18n.t('soundfont.checkingCache'), 5)
  const buffers = new Map()
  const missing = []
  for (const e of entries) {
    const cached = skipCache ? null : await getFromCache(e.cacheKey)
    if (cached && looksLikeSoundFont(cached)) buffers.set(e.key, cached)
    else {
      if (cached) await deleteFromCache(e.cacheKey)   // עותק פגום ב-IndexedDB — מורידים מחדש
      missing.push(e)
    }
  }

  if (missing.length) {
    const total = missing.reduce((s, e) => s + (e.pack.bytes || 0), 0)
    const loadedByKey = new Map()
    const report = () => {
      const loaded = [...loadedByKey.values()].reduce((s, v) => s + v, 0)
      const pct = total > 0 ? Math.min(1, loaded / total) : 0
      onProgress?.(i18n.t('soundfont.downloadingProgress', { loaded: mb(loaded), total: mb(total) }), 5 + Math.round(pct * 85))
    }
    onProgress?.(i18n.t('soundfont.downloading'), 5)
    await Promise.all(missing.map(async (e) => {
      const buf = await downloadPack(library, e.pack, (_pct, loaded) => {
        loadedByKey.set(e.key, loaded)
        report()
      }, () => {
        loadedByKey.set(e.key, 0)
        onProgress?.(i18n.t('soundfont.retrying'), 5)
      })
      // await so the IndexedDB put clones the buffer before anyone else touches it
      await saveToCache(e.cacheKey, buf)
      buffers.set(e.key, buf)
    }))
  } else if (entries.length) {
    onProgress?.(i18n.t('soundfont.loadingFromCache'), 80)
  }
  return buffers
}

function selectPreset(channel, { bank = 0, program }) {
  if (!_synth) return false
  let sfontId
  if (_fullSfontId !== null) sfontId = _fullSfontId
  else sfontId = _packSfonts.get(presetKey({ bank, program }))
  if (sfontId === undefined || sfontId === null) return false
  _synth.midiProgramSelect(channel, sfontId, bank, program)
  return true
}

/** מחיל על כל ערוץ את ה-preset הרצוי שלו (אם כבר נטען) */
function reapplyChannelPresets() {
  if (!_synth) return
  _synth.midiSetChannelType(CHANNELS.DRUMS, true)
  for (const [channel, preset] of _channelPresets) selectPreset(channel, preset)
}

/** טוען packs לספרייה נתונה (פנימי — לא מחכה ל-_libraryPromise) */
async function loadPacks(library, presets, onProgress) {
  const keys = [...new Set((presets || []).map(presetKey))]
  const waits = []
  const toLoad = []
  for (const key of keys) {
    if (_packSfonts.has(key)) continue
    if (_packLoads.has(key)) waits.push(_packLoads.get(key))
    else toLoad.push(key)
  }

  if (toLoad.length) {
    const job = (async () => {
      const buffers = await fetchPackBuffers(library, toLoad, onProgress)
      onProgress?.(i18n.t('soundfont.initializingInstruments'), 95)
      for (const [key, buf] of buffers) {
        // הספרייה הוחלפה באמצע (sf2-lab) — לא טוענים pack לתוך ספרייה אחרת
        if (_currentLibrary !== library) return
        let id
        try {
          id = await _synth.loadSFont(buf)
        } catch (firstErr) {
          // קובץ פגום (בד"כ עותק שנשמר שבור ב-IndexedDB): מוחקים, מורידים מחדש, וטוענים שוב פעם אחת
          console.warn(`[SFP] loadSFont failed for ${key} — re-downloading:`, firstErr?.message)
          const manifest = await getManifest(library)
          const pack = manifest.packs[key]
          if (pack) await deleteFromCache(packCacheKey(library, pack.file))
          try {
            const fresh = await fetchPackBuffers(library, [key], onProgress, { skipCache: true })
            id = await _synth.loadSFont(fresh.get(key))
          } catch (err) {
            throw new SoundLoadError(`Could not load instrument ${key}`, { cause: err })
          }
        }
        _packSfonts.set(key, id)
      }
      reapplyChannelPresets()
    })()
    const tracked = job.finally(() => { for (const k of toLoad) _packLoads.delete(k) })
    for (const k of toLoad) _packLoads.set(k, tracked)
    waits.push(tracked)
  }

  await Promise.all(waits)
}

/**
 * טוען את ה-presets המבוקשים (מ-cache או מהרשת) ל-FluidSynth.
 * no-op עבור presets שכבר טעונים, ועבור ספריית SF2 מלאה.
 *
 * @param {Array<{bank?: number, program: number}>} presets
 * @param {function} onProgress (message, percent) => void
 */
export async function ensurePresets(presets, onProgress) {
  await ensureSynth(onProgress)
  if (_libraryPromise) await _libraryPromise.catch(() => {})
  if (!_currentLibrary) {
    await init(onProgress, { presets })
    return
  }
  if (isPackLibrary(_currentLibrary)) await loadPacks(_currentLibrary, presets, onProgress)
}

/** האם כל ה-presets כבר טעונים (בלי לטעון) */
export function arePresetsLoaded(presets) {
  if (!_synth) return false
  if (_fullSfontId !== null) return true
  return (presets || []).every(p => _packSfonts.has(presetKey(p)))
}

/**
 * מוריד ל-IndexedDB ברקע את ה-packs של ה-presets, בלי AudioContext.
 * בטוח לקריאה לפני כל gesture של המשתמש. no-op עבור מה שכבר ב-cache.
 */
export async function prefetchPresets(presets) {
  const library = getDefaultLibrary()
  if (!isPackLibrary(library)) return
  try {
    const manifest = await getManifest(library)
    await Promise.all((presets || []).map(async (p) => {
      const pack = manifest.packs[presetKey(p)]
      if (!pack) return
      const cacheKey = packCacheKey(library, pack.file)
      if (_downloads.has(cacheKey)) return _downloads.get(cacheKey)
      const job = (async () => {
        const cached = await getFromCache(cacheKey)
        if (cached && looksLikeSoundFont(cached)) return
        const buf = await downloadPack(library, pack)
        await saveToCache(cacheKey, buf)
      })().finally(() => _downloads.delete(cacheKey))
      _downloads.set(cacheKey, job)
      return job
    }))
  } catch {
    // fail silently — not critical, ensurePresets() will retry
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Full SF2 libraries (sf2-lab only)
// ════════════════════════════════════════════════════════════════════════════

// ---- שולף את ה-SF2 buffer (cache → fetch → cache) ----
async function fetchSoundFontBuffer(libraryConfig, onProgress) {
  if (!libraryConfig?.url) {
    throw new Error(`SoundFont library "${libraryConfig?.id || '?'}" has no URL configured`)
  }
  onProgress?.(i18n.t('soundfont.checkingCache'), 5)
  let buffer = await getFromCache(libraryConfig.cacheKey)
  if (buffer) {
    onProgress?.(i18n.t('soundfont.loadingFromCache'), 80)
    return buffer
  }
  onProgress?.(i18n.t('soundfont.downloading'), 5)
  const onDownloadProgress = (pct, loaded, total) => {
    onProgress?.(i18n.t('soundfont.downloadingProgress', { loaded: mb(loaded), total: mb(total) }), 5 + Math.round(pct * 0.88))
  }
  try {
    buffer = await fetchWithProgress(libraryConfig.url, onDownloadProgress)
  } catch (err) {
    // ה-URL המוגדר נכשל — ניפול חזרה למקור הגיבוי
    if (libraryConfig.fallbackUrl && libraryConfig.fallbackUrl !== libraryConfig.url) {
      console.warn(`[SFP] Primary SF2 URL failed (${err.message}), retrying with fallback`)
      buffer = await fetchWithProgress(libraryConfig.fallbackUrl, onDownloadProgress)
    } else {
      throw err
    }
  }
  await saveToCache(libraryConfig.cacheKey, buffer)
  return buffer
}

// ════════════════════════════════════════════════════════════════════════════
// Synth lifecycle
// ════════════════════════════════════════════════════════════════════════════

/** יוצר את ה-AudioContext + FluidSynth (פעם אחת). לא טוען סאונדים. */
function ensureSynth(onProgress) {
  if (_synthPromise) return _synthPromise
  _synthPromise = (async () => {
    cleanupLegacyCache()

    // 1. טעינת FluidSynth JS
    onProgress?.(i18n.t('soundfont.loadingSynth'), 2)
    try {
      await loadFluidSynthScript(onProgress)
      // אם ה-WASM "נתקע" באתחול אין ריפוי בתוך הדף (js-synthesizer שומר את ה-Promise) —
      // לפחות לא מחכים לנצח, ומחזירים שגיאה ברורה
      await withTimeout(
        Synthesizer.waitForWasmInitialized(), 20000, 'FluidSynth WASM initialization timed out',
      )
    } catch (err) {
      throw err?.isSoundLoadError ? err : new SoundLoadError(err?.message || 'FluidSynth failed to start', { cause: err })
    }

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
      onProgress?.(i18n.t('soundfont.loadingWorklet'), 3)
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

    _synth.midiSetChannelType(CHANNELS.DRUMS, true)
  })().catch(err => {
    _synthPromise = null
    throw err
  })
  return _synthPromise
}

/** מחליף את הספרייה הפעילה (מניח synth קיים, בלי תחרות — נקרא מתוך init/swap) */
async function activateLibrary(library, onProgress, presets) {
  // פריקת כל מה שטעון
  if (_fullSfontId !== null) {
    try { await _synth.unloadSFontAsync(_fullSfontId) } catch (err) { console.warn('[SFP] unloadSFont failed (continuing):', err?.message) }
    _fullSfontId = null
  }
  for (const id of _packSfonts.values()) {
    try { await _synth.unloadSFontAsync(id) } catch (err) { console.warn('[SFP] unloadSFont failed (continuing):', err?.message) }
  }
  _packSfonts.clear()
  _currentLibrary = library

  if (isPackLibrary(library)) {
    await loadPacks(library, presets || DEFAULT_PRESETS, onProgress)
  } else {
    const buffer = await fetchSoundFontBuffer(library, onProgress)
    onProgress?.(i18n.t('soundfont.initializingInstruments'), 95)
    _fullSfontId = await _synth.loadSFont(buffer)
  }
  reapplyChannelPresets()
}

/**
 * אתחול המנגן + טעינת ה-presets הנדרשים. בטוח לקריאה חוזרת (טוען רק מה שחסר).
 * @param {function} onProgress (message: string, percent: number) => void
 * @param {object}   [opts]
 * @param {Array<{bank?: number, program: number}>} [opts.presets]  ברירת מחדל: DEFAULT_PRESETS
 * @param {object}   [opts.library]  ספרייה לטעינה ראשונה (ברירת מחדל: JJazzLab packs)
 */
export async function init(onProgress, opts = {}) {
  await ensureSynth(onProgress)
  if (!_currentLibrary) {
    if (!_libraryPromise) {
      _libraryPromise = activateLibrary(opts.library || getDefaultLibrary(), onProgress, opts.presets)
        .finally(() => { _libraryPromise = null })
    }
    try {
      await _libraryPromise
    } catch (err) {
      _currentLibrary = null
      throw err
    }
  } else {
    if (_libraryPromise) await _libraryPromise
    await ensurePresets(opts.presets || DEFAULT_PRESETS, onProgress)
  }
  onProgress?.(i18n.t('soundfont.ready'), 100)
  return { library: _currentLibrary }
}

/**
 * החלפת הספרייה הטעונה כרגע (/test/sf2-lab). אם ה-synth עוד לא אותחל — מאתחל.
 * אם הספרייה המבוקשת כבר טעונה — no-op.
 *
 * @param {object}   libraryConfig — מ-SoundFontRegistry.SOUNDFONT_LIBRARIES
 * @param {function} onProgress    — (message, percent) => void
 * @returns {Promise<{ library: object }>}
 */
export async function swapSoundFont(libraryConfig, onProgress) {
  if (!libraryConfig) throw new Error('swapSoundFont: libraryConfig is required')
  if (!isPackLibrary(libraryConfig) && !libraryConfig.url) {
    throw new Error(`Library "${libraryConfig.id}" has no URL configured (set VITE_SF2_URL_${libraryConfig.id.toUpperCase()})`)
  }

  // הימנעות מ-race בין קריאות swap מקבילות
  if (_swapPromise) await _swapPromise.catch(() => {})

  _swapPromise = (async () => {
    await ensureSynth(onProgress)
    if (_libraryPromise) await _libraryPromise.catch(() => {})

    if (_currentLibrary?.id === libraryConfig.id) {
      onProgress?.(i18n.t('soundfont.alreadyLoaded'), 100)
      return { library: _currentLibrary }
    }

    // עוצרים את כל הצלילים לפני tear-down
    allNotesOff()
    const wanted = [...new Map([...DEFAULT_PRESETS, ..._channelPresets.values()].map(p => [presetKey(p), p])).values()]
    _libraryPromise = activateLibrary(libraryConfig, onProgress, wanted)
      .finally(() => { _libraryPromise = null })
    await _libraryPromise

    onProgress?.(i18n.t('soundfont.ready'), 100)
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

/** האם המנגן מוכן (synth קיים ולפחות סאונד אחד טעון) */
export function isReady() {
  return _synth !== null && (_fullSfontId !== null || _packSfonts.size > 0)
}

/**
 * Tap of the synth's output for recording (video export). The speakers keep playing;
 * dispose() detaches the tap. Requires init() to have created the audio graph.
 */
export function createCaptureStream() {
  if (!_audioCtx || !_analyser) throw new Error('SoundFontPlayer: audio not initialised')
  const dest = _audioCtx.createMediaStreamDestination()
  _analyser.connect(dest)
  return {
    stream: dest.stream,
    dispose() { try { _analyser.disconnect(dest) } catch { /* already detached */ } },
  }
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

/**
 * שינוי תוכנית (instrument) לפי GM program number.
 * אם ה-pack של ה-preset עוד לא טעון — נטען ברקע והערוץ עובר אליו כשמוכן.
 * @returns {Promise<void>} מתממש כשהערוץ מנגן את ה-preset המבוקש
 */
export function programChange(channel, program, bank = 0) {
  const preset = { bank, program }
  _channelPresets.set(channel, preset)
  if (!_synth) return Promise.resolve()
  if (selectPreset(channel, preset)) return Promise.resolve()
  return ensurePresets([preset])
    .then(() => {
      const wanted = _channelPresets.get(channel)
      if (wanted && presetKey(wanted) === presetKey(preset)) selectPreset(channel, preset)
    })
    .catch(err => console.warn(`[SFP] could not load preset ${presetKey(preset)}:`, err?.message))
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
  _fullSfontId = null
  _packSfonts.clear()
  _packLoads.clear()
  _synthPromise = null
  _libraryPromise = null
  _useWorklet = false
  _currentLibrary = null
  _swapPromise = null
}
