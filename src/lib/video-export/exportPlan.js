/**
 * Pure planning helpers for the backing-track video export.
 * No DOM / audio access here so everything is unit-testable.
 */
import { toSharpName, parseShapeIds } from '../../constants/neckShapes.js'
import { CHROMATIC_SCALE } from '../../constants/positionData.js'

// A 4-bar vamp at 190 BPM is ~5 s per repetition, so a 10-minute practice video needs
// well over 100 repetitions. The real guard is MAX_EXPORT_SEC below.
export const MAX_REPETITIONS = 240
export const MAX_ROTATE_EVERY = 64
/** Longest export we allow (real-time recording; also bounds memory / file size). */
export const MAX_EXPORT_SEC = 15 * 60
/** Target lengths offered as one-tap presets in the dialog (minutes). */
export const LENGTH_PRESETS_MIN = [5, 8, 10]
export const EMPHASIS_MODES = ['pentatonic']
export const NECKS_PER_SCREEN = [1, 2]
// Mostly-static graphics compress very well; these keep a 10-minute 720p file around 200 MB.
export const VIDEO_BITRATES = { '720p': 2_500_000, '1080p': 5_000_000 }
export const AUDIO_BITRATE = 160_000
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
  const shapeKey = toSharpName(v.shapeKey)
  const fromList = parseShapeIds(v.shapeIds)
  const shapeIds = fromList.length ? fromList : parseShapeIds(v.shapeId)
  return {
    scaleId: typeof v.scaleId === 'string' && v.scaleId ? v.scaleId : null,
    root: typeof v.root === 'string' && v.root ? v.root : 'auto',
    fretStart,
    fretEnd,
    displayMode: DISPLAY_MODES.includes(v.displayMode) ? v.displayMode : 'notes',
    // Optional lesson shape (CAGED window / octave position / 3-per-string) placed in the key
    // whose MAJOR root is shapeKey. When set, it decides which cells (and frets) are shown.
    // Several shapes may share one neck (e.g. CAGED C·G·D); shapeId stays the first for older readers.
    shapeIds,
    shapeId: shapeIds[0] ?? null,
    shapeKey: CHROMATIC_SCALE.includes(shapeKey) ? shapeKey : 'C',
    // 'pentatonic': full scale shown, pentatonic notes stand out and the rest are softened.
    emphasis: EMPHASIS_MODES.includes(v.emphasis) ? v.emphasis : null,
  }
}

export const DEFAULT_SETTINGS = Object.freeze({
  repetitions: 4,
  rotateEvery: 1,
  resolution: '720p',
  necksPerScreen: 1,
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
    necksPerScreen: NECKS_PER_SCREEN.includes(Number(s.necksPerScreen)) ? Number(s.necksPerScreen) : 1,
    views,
  }
}

/** Neck view shown during the given 0-based repetition. */
export function viewIndexForRepetition(repIndex, rotateEvery, viewCount) {
  if (viewCount <= 1) return 0
  const every = Math.max(1, Math.floor(rotateEvery) || 1)
  return Math.floor(Math.max(0, repIndex) / every) % viewCount
}

/**
 * Views on screen during a repetition. With 2 necks per screen, views are shown in pairs
 * (views 1+2, then 3+4, …) and the pair rotates every `rotateEvery` repetitions.
 * @returns {{ group: number, groupCount: number, indices: number[] }}
 */
export function viewsForRepetition(repIndex, settings) {
  const n = settings.necksPerScreen === 2 ? 2 : 1
  const count = Math.max(1, settings.views?.length || 0)
  const groupCount = Math.ceil(count / n)
  const group = viewIndexForRepetition(repIndex, settings.rotateEvery, groupCount)
  const indices = []
  for (let i = group * n; i < Math.min(count, group * n + n); i++) indices.push(i)
  return { group, groupCount, indices }
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

/** Seconds per repetition of the progression. */
export function repetitionSec({ chords, beatsPerBar, tempo }) {
  const bpb = beatsPerBar || 4
  const beats = (chords || []).reduce((sum, c) => sum + (c.beats ?? bpb), 0) || bpb
  return beats * 60 / Math.max(20, tempo || 120)
}

/** Repetitions whose length is closest to `minutes`, within [1, MAX_REPETITIONS]. */
export function repetitionsForMinutes({ chords, beatsPerBar, tempo, minutes }) {
  const per = repetitionSec({ chords, beatsPerBar, tempo })
  return Math.min(MAX_REPETITIONS, Math.max(1, Math.round((minutes * 60) / per)))
}

/** Rough file size in bytes for a recording of `durationSec` (bitrates are upper bounds). */
export function estimateBytes(durationSec, resolution = '720p') {
  const video = VIDEO_BITRATES[resolution] ?? VIDEO_BITRATES['720p']
  return Math.round(((video + AUDIO_BITRATE) * Math.max(0, durationSec)) / 8)
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
