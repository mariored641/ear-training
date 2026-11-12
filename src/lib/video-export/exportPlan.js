/**
 * Pure planning helpers for the backing-track video export.
 * No DOM / audio access here so everything is unit-testable.
 */

export const MAX_REPETITIONS = 32
export const MAX_ROTATE_EVERY = 16
export const MAX_VIEWS = 12
export const MAX_FRET = 24
export const DEFAULT_FRET_RANGE = [0, 15]
export const MIN_FRET_SPAN = 4
export const DISPLAY_MODES = ['dots', 'notes', 'degrees']
export const RESOLUTIONS = { '720p': [1280, 720], '1080p': [1920, 1080] }
export const FPS = 30

const clampInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Returns [start, end] — always ordered, clamped to the neck, at least MIN_FRET_SPAN wide. */
export function normalizeFretRange(start, end) {
  const hasStart = start !== null && start !== undefined && start !== ''
  const hasEnd = end !== null && end !== undefined && end !== ''
  if (!hasStart || !hasEnd) return [...DEFAULT_FRET_RANGE]
  let a = clampInt(start, 0, MAX_FRET, 0)
  let b = clampInt(end, 0, MAX_FRET, DEFAULT_FRET_RANGE[1])
  if (a > b) [a, b] = [b, a]
  if (b - a < MIN_FRET_SPAN) {
    b = Math.min(MAX_FRET, a + MIN_FRET_SPAN)
    a = Math.max(0, b - MIN_FRET_SPAN)
  }
  return [a, b]
}

export function sanitizeView(view) {
  const v = view && typeof view === 'object' ? view : {}
  const [fretStart, fretEnd] = normalizeFretRange(v.fretStart, v.fretEnd)
  return {
    scaleId: typeof v.scaleId === 'string' && v.scaleId ? v.scaleId : null,
    root: typeof v.root === 'string' && v.root ? v.root : 'auto',
    fretStart,
    fretEnd,
    displayMode: DISPLAY_MODES.includes(v.displayMode) ? v.displayMode : 'notes',
  }
}

export const DEFAULT_SETTINGS = Object.freeze({
  repetitions: 4,
  rotateEvery: 1,
  resolution: '720p',
  views: [],
})

/** Defensive: persisted settings may be missing, corrupt, or from another version. */
export function sanitizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const views = Array.isArray(s.views) ? s.views.slice(0, MAX_VIEWS).map(sanitizeView) : []
  return {
    repetitions: clampInt(s.repetitions, 1, MAX_REPETITIONS, DEFAULT_SETTINGS.repetitions),
    rotateEvery: clampInt(s.rotateEvery, 1, MAX_ROTATE_EVERY, DEFAULT_SETTINGS.rotateEvery),
    resolution: s.resolution in RESOLUTIONS ? s.resolution : DEFAULT_SETTINGS.resolution,
    views,
  }
}

/** Neck view shown during the given 0-based repetition. */
export function viewIndexForRepetition(repIndex, rotateEvery, viewCount) {
  if (viewCount <= 1) return 0
  const every = Math.max(1, Math.floor(rotateEvery) || 1)
  return Math.floor(Math.max(0, repIndex) / every) % viewCount
}

/** Evenly stepped fret windows reusing the scale/root/mode of `base` (position rotation helper). */
export function fretWindows(base, { span = 5, step = 4, last = 15 } = {}) {
  const out = []
  for (let start = 0; out.length < MAX_VIEWS; start += step) {
    const from = Math.min(start, last - span)
    out.push({ ...sanitizeView(base), fretStart: from, fretEnd: from + span })
    if (from + span >= last) break
  }
  return out
}

/**
 * Finds the chord sounding at (bar, beat) of the progression.
 * Chords may be half-bar (beats: 2). Returns indices into `chords`.
 */
export function locateChord(chords, beatsPerBar, bar, beat) {
  if (!Array.isArray(chords) || chords.length === 0) return { index: -1, next: -1 }
  const bpb = beatsPerBar || 4
  const pos = Math.max(0, bar) * bpb + Math.max(0, beat || 0)
  let cursor = 0
  let index = chords.length - 1
  for (let i = 0; i < chords.length; i++) {
    cursor += chords[i].beats ?? bpb
    if (pos < cursor) { index = i; break }
  }
  return { index, next: (index + 1) % chords.length }
}

/** Seconds of audio the export will take (count-in is approximate: one bar). */
export function estimateDurationSec({ chords, beatsPerBar, tempo, repetitions }) {
  const bpb = beatsPerBar || 4
  const beats = (chords || []).reduce((sum, c) => sum + (c.beats ?? bpb), 0)
  const spb = 60 / Math.max(20, tempo || 120)
  return Math.round((beats * repetitions + bpb) * spb)
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * MP4 (H.264 + AAC, plays everywhere incl. phones) first; WebM as fallback.
 * A bare 'video/mp4' is deliberately absent: Chromium builds without H.264 accept it
 * but then write VP9/Opus into the MP4, which QuickTime/iOS often can't play.
 */
export const RECORDER_FORMATS = [
  { mime: 'video/mp4;codecs=avc1.640028,mp4a.40.2', ext: 'mp4' },
  { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
]

export function pickRecorderFormat(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return null
  return RECORDER_FORMATS.find(f => isTypeSupported(f.mime)) ?? null
}

export function exportFileName({ genre, ext, now = new Date() }) {
  const pad = n => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const safe = String(genre || 'backing').replace(/[^A-Za-z0-9_-]+/g, '-')
  return `backing-track-${safe}-${stamp}.${ext}`
}
