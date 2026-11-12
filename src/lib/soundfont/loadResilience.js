/**
 * loadResilience.js
 * כלים לטעינה "מתקנת-את-עצמה" של הסאונדים (FluidSynth + SF3 packs).
 *
 * העיקרון: תקלת טעינה חד-פעמית (רשת מהבהבת, בקשה שנקטעה, קובץ שהגיע שבור, cache
 * פגום) לא אמורה להגיע לתלמיד. מנסים שוב אוטומטית — עם המתנה קצרה בין הניסיונות
 * (סה"כ ~2.5 שניות המתנה בגרוע שבמקרים) — ורק אם הכל נכשל מציגים הודעה אנושית.
 */

/** שגיאת טעינה שמותר להציג לתלמיד (ההודעה כבר ידידותית). */
export class SoundLoadError extends Error {
  constructor(message, { cause, status, fatal = false } = {}) {
    super(message)
    this.name = 'SoundLoadError'
    this.cause = cause
    this.status = status
    this.fatal = fatal          // true = אין טעם לנסות שוב (למשל 404)
    this.isSoundLoadError = true
  }
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/** ממתין לחזרת החיבור (עד maxMs) — כדי לא "לשרוף" ניסיונות כשאין רשת בכלל. */
export function waitForOnline(maxMs = 4000) {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return Promise.resolve()
  return new Promise(resolve => {
    const done = () => { window.removeEventListener('online', done); clearTimeout(timer); resolve() }
    const timer = setTimeout(done, maxMs)
    window.addEventListener('online', done)
  })
}

/** האם שווה לנסות שוב? 4xx (חוץ מ-408/429) = לא; כל השאר (רשת, 5xx, חיתוך) = כן. */
export function isTransient(err) {
  if (err?.fatal) return false
  const s = err?.status
  if (typeof s === 'number' && s >= 400 && s < 500 && s !== 408 && s !== 429) return false
  return true
}

/**
 * מריץ fn עם ניסיונות חוזרים.
 * @param {(attempt:number)=>Promise<T>} fn   attempt מתחיל מ-0
 * @param {object} [o]
 * @param {string}   [o.label]       לוג
 * @param {number[]} [o.delays]      המתנה לפני ניסיון 2, 3, … (ברירת מחדל 0.7s, 1.8s)
 * @param {(err,attempt)=>void} [o.onRetry]  נקרא לפני ההמתנה (להודעת "מנסה שוב…")
 */
export async function withRetry(fn, { label = 'load', delays = [700, 1800], onRetry } = {}) {
  const attempts = delays.length + 1
  let lastErr
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      if (!isTransient(err) || attempt === attempts - 1) break
      console.warn(`[SFP] ${label} failed (attempt ${attempt + 1}/${attempts}) — retrying:`, err?.message)
      onRetry?.(err, attempt)
      await sleep(delays[attempt])
      await waitForOnline()
    }
  }
  throw lastErr
}

/** Promise עם timeout (לדברים שעלולים "להיתקע" בלי להיכשל). */
export function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new SoundLoadError(message, { fatal: false })), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** קובץ SF3/SF2 תקין מתחיל ב-RIFF....sfbk — תופס HTML שחזר במקום הקובץ (SPA rewrite / captive portal) */
export function looksLikeSoundFont(buffer) {
  if (!buffer || buffer.byteLength < 12) return false
  const h = new Uint8Array(buffer, 0, 12)
  const s = (a, b) => String.fromCharCode(...h.subarray(a, b))
  return s(0, 4) === 'RIFF' && s(8, 12) === 'sfbk'
}

/**
 * הורדה עם התקדמות + זיהוי "תקיעה" (אין בתים STALL_MS) + בדיקת שלמות.
 * @param {string} url
 * @param {(pct:number, loaded:number, total:number)=>void} [onProgress]
 * @param {object} [o]
 * @param {number}  [o.expectedBytes]  גודל צפוי מה-manifest (אם ידוע)
 * @param {boolean} [o.bypassCache]    ניסיון חוזר: עוקף HTTP cache שאולי מכיל עותק שבור
 * @param {boolean} [o.validateSoundFont]
 */
export async function fetchBuffer(url, onProgress, { expectedBytes, bypassCache = false, validateSoundFont = false } = {}) {
  const STALL_MS = 15000
  const controller = new AbortController()
  let stalled = false
  let timer
  const arm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => { stalled = true; controller.abort() }, STALL_MS)
  }

  try {
    arm()
    let response
    try {
      response = await fetch(url, { signal: controller.signal, cache: bypassCache ? 'reload' : 'default' })
    } catch (err) {
      throw new SoundLoadError(stalled ? `Timed out: ${url}` : `Network error: ${url}`, { cause: err })
    }
    if (!response.ok) throw new SoundLoadError(`HTTP ${response.status}: ${url}`, { status: response.status })

    const total = parseInt(response.headers.get('Content-Length') || '0', 10) || expectedBytes || 0
    const compressed = !!response.headers.get('Content-Encoding')
    const reader = response.body.getReader()
    const chunks = []
    let loaded = 0
    try {
      while (true) {
        arm()
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        onProgress?.(total > 0 ? Math.round((loaded / total) * 100) : 0, loaded, total)
      }
    } catch (err) {
      throw new SoundLoadError(stalled ? `Download stalled: ${url}` : `Download interrupted: ${url}`, { cause: err })
    }

    if (expectedBytes && !compressed && loaded !== expectedBytes) {
      throw new SoundLoadError(`Truncated download (${loaded}/${expectedBytes} bytes): ${url}`)
    }

    const buffer = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }

    if (validateSoundFont && !looksLikeSoundFont(buffer.buffer)) {
      throw new SoundLoadError(`Not a SoundFont file: ${url}`)
    }
    return buffer.buffer
  } finally {
    clearTimeout(timer)
  }
}
