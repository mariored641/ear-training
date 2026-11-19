/**
 * Records the running backing track (canvas frames + the synth's audio output)
 * into a single MP4 (preferred) or WebM file, in real time.
 *
 * The caller owns playback; we only need to be told how to start/stop it and
 * how to read the live state. All browser objects are injected so the lifecycle
 * can be unit-tested with fakes.
 */
import {
  FPS, RESOLUTIONS, VIDEO_BITRATES, AUDIO_BITRATE, MAX_EXPORT_SEC, estimateDurationSec, pickRecorderFormat,
} from './exportPlan.js'
import { drawFrame, createAssets } from './renderFrame.js'
import { buildScene, progressFraction } from './scene.js'

const TAIL_MS = 900          // let the last note ring out before closing the file
const START_TIMEOUT_MS = 90_000

export class ExportCancelled extends Error {
  constructor() { super('cancelled'); this.name = 'ExportCancelled' }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * @param {object} o
 * @param {object} o.settings         sanitized settings
 * @param {object} o.meta             { styleName, keyLabel, tempo }
 * @param {object} o.labels, o.deps   see scene.buildScene
 * @param {() => object} o.getLive    latest playback state
 * @param {() => Promise<void>} o.prepare   load sounds (resolves when playback can start instantly)
 * @param {(loops:number) => Promise<boolean>} o.startPlayback
 * @param {(hard:boolean) => void} o.stopPlayback
 * @param {() => {stream: MediaStream, dispose: () => void}} o.captureAudio
 * @param {HTMLImageElement|null} o.logo
 * @param {(p:{stage:string, progress:number}) => void} o.onProgress
 * @param {AbortSignal} o.signal
 * @param {object} [o.env]  test seam: { document, MediaRecorder, navigator, now, sleep, setInterval, clearInterval }
 * @returns {Promise<{blob, ext, mime, hiddenMs, chunkCount}>}  hiddenMs = time the page spent in the
 *          background while recording (browsers throttle hidden tabs, so frames may stutter).
 */
export async function runExport(o) {
  const env = o.env || {}
  const doc = env.document || document
  const Recorder = env.MediaRecorder || MediaRecorder
  const nav = env.navigator || (typeof navigator !== 'undefined' ? navigator : null)
  // Clock seams let unit tests run a 10-minute export in virtual time.
  const now = env.now || Date.now
  const wait = env.sleep || sleep
  const every = env.setInterval || setInterval
  const stopEvery = env.clearInterval || clearInterval
  const { settings, signal } = o
  const throwIfCancelled = () => { if (signal?.aborted) throw new ExportCancelled() }

  const plannedSec = estimateDurationSec({
    chords: o.getLive().chords, beatsPerBar: o.getLive().beatsPerBar,
    tempo: o.meta.tempo, repetitions: settings.repetitions,
  })
  if (plannedSec > MAX_EXPORT_SEC) throw new Error('export-too-long')

  const format = pickRecorderFormat(t => Recorder.isTypeSupported(t))
  if (!format) throw new Error('recording-unsupported')

  o.onProgress({ stage: 'loading', progress: 0 })
  await o.prepare()
  throwIfCancelled()

  const [width, height] = RESOLUTIONS[settings.resolution]
  const canvas = doc.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const assets = createAssets({ logo: o.logo, makeCanvas: (w, h) => {
    const c = doc.createElement('canvas'); c.width = w; c.height = h; return c
  } })

  let lastScene = null
  const render = () => {
    const live = o.getLive()
    if (live.isPlaying || !lastScene) {
      lastScene = buildScene({ live, settings, meta: o.meta, labels: o.labels, deps: o.deps })
    }
    drawFrame(ctx, lastScene, assets, width, height)
    return live
  }
  render()

  const audio = o.captureAudio()
  const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...audio.stream.getAudioTracks()])
  const chunks = []
  const recorder = new Recorder(stream, {
    mimeType: format.mime,
    videoBitsPerSecond: VIDEO_BITRATES[settings.resolution] ?? VIDEO_BITRATES['720p'],
    audioBitsPerSecond: AUDIO_BITRATE,
  })
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve
    recorder.onerror = (e) => reject(e.error || new Error('recorder-error'))
  })

  // Long exports: keep the screen awake (a sleeping screen hides the page, and hidden pages
  // get their timers throttled), and measure any time spent hidden so the UI can warn.
  let wakeLock = null
  try { wakeLock = await nav?.wakeLock?.request?.('screen') } catch { /* not allowed / unsupported */ }
  let hiddenMs = 0
  let hiddenSince = doc.visibilityState === 'hidden' ? now() : null
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') { if (hiddenSince === null) hiddenSince = now() }
    else if (hiddenSince !== null) {
      hiddenMs += now() - hiddenSince
      hiddenSince = null
      // The browser drops screen wake locks when the page is hidden; take it again.
      Promise.resolve(nav?.wakeLock?.request?.('screen')).then(l => { if (l) wakeLock = l }).catch(() => {})
    }
  }
  doc.addEventListener?.('visibilitychange', onVisibility)

  let timer = null
  const cleanup = () => {
    stopEvery(timer)
    doc.removeEventListener?.('visibilitychange', onVisibility)
    if (hiddenSince !== null) { hiddenMs += now() - hiddenSince; hiddenSince = null }
    try { wakeLock?.release?.() } catch { /* already released */ }
    try { audio.dispose() } catch { /* already disconnected */ }
    stream.getTracks().forEach(t => t.stop())
  }

  try {
    let sawPlaying = false
    let finished = false
    let finishedAt = 0
    const startedAt = now()
    const maxMs = (plannedSec * 2 + 60) * 1000

    timer = every(() => {
      const live = render()
      if (live.isPlaying) sawPlaying = true
      if (sawPlaying && !live.isPlaying && !finished) { finished = true; finishedAt = now() }
      if (sawPlaying) o.onProgress({ stage: 'recording', progress: progressFraction({ live, repetitions: settings.repetitions }) })
    }, 1000 / FPS)

    recorder.start(1000)
    const ok = await o.startPlayback(settings.repetitions)
    if (!ok) throw new Error('playback-failed')

    while (!(finished && now() - finishedAt >= TAIL_MS)) {
      throwIfCancelled()
      if (!sawPlaying && now() - startedAt > START_TIMEOUT_MS) throw new Error('playback-timeout')
      if (now() - startedAt > maxMs) throw new Error('export-timeout')
      await wait(50)
    }

    o.onProgress({ stage: 'finalizing', progress: 1 })
    recorder.stop()
    await stopped
    cleanup()
    const blob = new Blob(chunks, { type: format.mime.split(';')[0] })
    const chunkCount = chunks.length
    chunks.length = 0   // the Blob holds the data now; drop our references
    return { blob, ext: format.ext, mime: format.mime, hiddenMs, chunkCount }
  } catch (err) {
    o.stopPlayback(true)
    cleanup()
    if (recorder.state !== 'inactive') { recorder.onstop = null; try { recorder.stop() } catch { /* ignore */ } }
    throw err
  }
}
