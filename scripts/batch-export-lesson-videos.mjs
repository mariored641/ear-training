/**
 * Batch-export the DEFAULT video of every lesson preset, faster than real time.
 * Frames + audio come from the app itself (src/lib/video-export/offlineExport.js, run in Chromium
 * against the Vite dev server); ffmpeg muxes them into H.264/AAC MP4.
 *
 *   npx vite --host 127.0.0.1 --port 5173 &      # dev server must be running
 *   node scripts/batch-export-lesson-videos.mjs --out <dir> [--lessons 1-8] [--only id,id] [--limit N]
 *        [--concurrency 2] [--lang he|en] [--max-disk-pct 92]
 *
 * One file per unique (track, neck, default version); the manifest lists every lesson that uses it.
 * Resumable: files already listed as done in <out>/manifest.json are skipped. Progress is written
 * to <out>/export-progress.md (and --progress <file> if given) after every video.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync, spawnSync } from 'child_process'
import { chromium } from 'playwright'
import { LESSONS, lessonPreset } from '../src/data/lessonBackingTracks.js'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true])
  return acc
}, []))
const OUT = path.resolve(args.out || 'lesson-videos')
const BASE = args.base || 'http://127.0.0.1:5173'
const [L0, L1] = String(args.lessons || '1-8').split('-').map(Number)
const LANG = args.lang || 'he'
const CONCURRENCY = Number(args.concurrency || 2)
const MAX_DISK_PCT = Number(args['max-disk-pct'] || 92)
const PROGRESS_EXTRA = args.progress ? path.resolve(args.progress) : null
fs.mkdirSync(OUT, { recursive: true })

// ── what to export ───────────────────────────────────────────────────────────
const jobs = new Map()
for (const lesson of LESSONS.filter(l => l.n >= L0 && l.n <= (L1 || L0))) {
  for (const item of lesson.items) {
    const p = lessonPreset(lesson.n, item.trackId)
    const key = `${p.track.id}__${p.neck}__${p.variantId}`
    if (!jobs.has(key)) jobs.set(key, { key, preset: p, lessons: [], presetIds: [] })
    jobs.get(key).lessons.push(lesson.n)
    jobs.get(key).presetIds.push(p.id)
  }
}
let list = [...jobs.values()]
if (args.only) list = list.filter(j => String(args.only).split(',').some(s => j.key.includes(s)))
if (args.limit) list = list.slice(0, Number(args.limit))

const manifestPath = path.join(OUT, 'manifest.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { videos: {} }
// '#' (C#m, F#m …) must not reach ffmpeg paths: it is parsed as a URL fragment.
const safe = (s) => String(s).replace(/#/g, 'sharp').replace(/[^A-Za-z0-9_.-]/g, '-')
const fileName = (j) => `L${String(Math.min(...j.lessons)).padStart(2, '0')}__${safe(j.preset.track.id)}__${j.preset.neck}__${j.preset.variantId}.mp4`

function diskPct() {
  const out = execFileSync('df', ['-P', OUT]).toString().trim().split('\n').pop().split(/\s+/)
  return Number(out[4].replace('%', ''))
}

function writeProgress(note = '') {
  const vids = Object.values(manifest.videos)
  const done = vids.filter(v => v.status === 'done')
  const failed = vids.filter(v => v.status === 'failed')
  const bytes = done.reduce((s, v) => s + v.bytes, 0)
  const secs = done.reduce((s, v) => s + v.durationSec, 0)
  const lines = [
    '# Lesson video export — progress', '',
    `Updated: ${new Date().toISOString()}`, '',
    `- Planned (this run): ${list.length} unique videos (lessons ${L0}–${L1 || L0}, default versions)`,
    `- Done: ${done.length} · Failed: ${failed.length} · Remaining: ${list.filter(j => manifest.videos[j.key]?.status !== 'done').length}`,
    `- Total duration: ${(secs / 60).toFixed(1)} min · Total size: ${(bytes / 1048576).toFixed(1)} MB`,
    `- Disk use now: ${diskPct()}% (cap ${MAX_DISK_PCT}%)`,
    note ? `- Note: ${note}` : '', '',
    'Resume: re-run the same command; finished videos are skipped.', '',
    '| # | File | Lessons | Duration | Size | Status |', '|---|---|---|---|---|---|',
    ...list.map((j, i) => {
      const v = manifest.videos[j.key]
      return `| ${i + 1} | ${fileName(j)} | ${j.lessons.join(', ')} | ${v?.durationSec ? v.durationSec.toFixed(1) + ' s' : ''} | ${v?.bytes ? (v.bytes / 1048576).toFixed(1) + ' MB' : ''} | ${v?.status ?? 'pending'}${v?.error ? ' — ' + v.error : ''} |`
    }),
  ]
  fs.writeFileSync(path.join(OUT, 'export-progress.md'), lines.join('\n') + '\n')
  if (PROGRESS_EXTRA) fs.copyFileSync(path.join(OUT, 'export-progress.md'), PROGRESS_EXTRA)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

function wavHeader(dataBytes, sampleRate) {
  const b = Buffer.alloc(44)
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataBytes, 4); b.write('WAVE', 8)
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22)
  b.writeUInt32LE(sampleRate, 24); b.writeUInt32LE(sampleRate * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(dataBytes, 40)
  return b
}

async function exportOne(page, job) {
  const work = path.join(OUT, '.work', safe(job.key))
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(work, { recursive: true })
  const audioParts = []
  page.__sink = {
    frame: (i, dataUrl) => fs.writeFileSync(path.join(work, `f${String(i).padStart(6, '0')}.png`), Buffer.from(dataUrl.split(',')[1], 'base64')),
    audio: (i, b64) => { audioParts[i] = Buffer.from(b64, 'base64') },
  }
  const t0 = Date.now()
  const info = await page.evaluate(async ({ lessonN, trackId, lang }) => {
    const { lessonPreset } = await import('/src/data/lessonBackingTracks.js')
    const { exportPresetOffline } = await import('/src/lib/video-export/offlineExport.js')
    const { chordDisplayName, prettifyChord } = await import('/src/components/backing-tracks/useBackingTrackEngine.js')
    const { normalizeDisplayAccidentals } = await import('/src/i18n/musicTerms.js')
    const { ALL_SCALES_MAP } = await import('/src/constants/allScalesData.js')
    const i18n = (await import('/src/i18n/index.js')).default
    await i18n.changeLanguage(lang)
    const t = i18n.t.bind(i18n)
    const preset = lessonPreset(lessonN, trackId)
    const logo = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = '/logo.png' })
    const labels = Object.fromEntries(['repetition', 'countIn', 'next', 'chordTones', 'frets', 'legendRoot', 'legendChordTone', 'legendScale',
      'legendScaleSoft', 'legendScaleOther', 'legendPentatonic', 'pentatonicEmphasis', 'arpeggioEmphasis'].map(k => [k, t(`backing.videoExport.canvas.${k}`)]))
    return exportPresetOffline(preset, {
      labels,
      styleName: t(`backing.styles.${preset.genre}`),
      logo,
      deps: {
        chordSymbol: chordDisplayName, pretty: prettifyChord, noteLabel: normalizeDisplayAccidentals,
        scaleName: (id) => t(`positions.musicItems.${id}`, { defaultValue: ALL_SCALES_MAP[id]?.name ?? id }),
        shapeName: (id) => t(`positions.shapes.${id}`), groupName: (g) => t(`positions.shapeGroups.${g}`),
      },
      sink: { frame: (i, d) => window.__sinkFrame(i, d), audio: (i, b) => window.__sinkAudio(i, b) },
    })
  }, { lessonN: job.lessons[0], trackId: job.preset.track.id, lang: LANG })
  const tRender = (Date.now() - t0) / 1000

  // audio → WAV
  const pcm = Buffer.concat(audioParts)
  fs.writeFileSync(path.join(work, 'audio.wav'), Buffer.concat([wavHeader(pcm.length, info.sampleRate), pcm]))
  // frames → concat list with exact per-beat durations
  const lines = ['ffconcat version 1.0']
  for (const f of info.frames) lines.push(`file f${String(f.index).padStart(6, '0')}.png`, `duration ${f.duration.toFixed(6)}`)
  lines.push(`file f${String(info.frames.at(-1).index).padStart(6, '0')}.png`)   // concat demuxer: repeat last
  fs.writeFileSync(path.join(work, 'frames.txt'), lines.join('\n') + '\n')

  const outFile = path.join(OUT, fileName(job))
  const ff = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'frames.txt'),
    '-i', path.join(work, 'audio.wav'),
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'stillimage',
    '-c:a', 'aac', '-b:a', '160k', '-t', info.durationSec.toFixed(3), '-movflags', '+faststart', outFile], { encoding: 'utf8' })
  if (ff.status !== 0) throw new Error(`ffmpeg: ${ff.stderr.slice(-400)}`)

  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration,size', '-of', 'json', outFile]).toString())
  const durationSec = Number(probe.format.duration)
  const types = probe.streams.map(s => s.codec_type).sort().join('+')
  if (types !== 'audio+video') throw new Error(`streams ${types}`)
  if (!(durationSec >= 300 && durationSec <= 600)) throw new Error(`duration ${durationSec}s outside 5–10 min`)
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(outFile)).digest('hex')
  fs.rmSync(work, { recursive: true, force: true })
  return {
    status: 'done', file: path.basename(outFile), lessons: job.lessons, presetIds: job.presetIds,
    trackId: job.preset.track.id, neck: job.preset.neck, variantId: job.preset.variantId,
    genre: job.preset.genre, tempo: job.preset.tempo, key: job.preset.key, repetitions: job.preset.export.repetitions,
    durationSec, bytes: Number(probe.format.size), sha256, beats: info.beats, noteEvents: info.events,
    renderSec: tRender, totalSec: (Date.now() - t0) / 1000, lang: LANG,
  }
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const queue = list.filter(j => manifest.videos[j.key]?.status !== 'done')
console.log(`${list.length} unique videos; ${queue.length} to do; out=${OUT}`)
writeProgress()
let stopReason = ''

async function worker(id) {
  const page = await browser.newPage()
  page.setDefaultTimeout(0)
  await page.exposeFunction('__sinkFrame', (i, d) => page.__sink.frame(i, d))
  await page.exposeFunction('__sinkAudio', (i, b) => page.__sink.audio(i, b))
  await page.goto(BASE + '/')
  while (queue.length && !stopReason) {
    if (diskPct() >= MAX_DISK_PCT) { stopReason = `disk at ${diskPct()}% ≥ ${MAX_DISK_PCT}% — paused`; break }
    const job = queue.shift()
    try {
      manifest.videos[job.key] = await exportOne(page, job)
      const v = manifest.videos[job.key]
      console.log(`[w${id}] done ${v.file} ${v.durationSec.toFixed(1)}s ${(v.bytes / 1048576).toFixed(1)}MB in ${v.totalSec.toFixed(0)}s`)
    } catch (err) {
      manifest.videos[job.key] = { status: 'failed', file: fileName(job), lessons: job.lessons, error: String(err?.message || err).slice(0, 300) }
      console.log(`[w${id}] FAILED ${job.key}: ${err?.message}`)
      await page.goto(BASE + '/')   // fresh page state after a failure
    }
    writeProgress()
  }
  await page.close()
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, (_, i) => worker(i + 1)))
writeProgress(stopReason)
await browser.close()
console.log(stopReason || 'finished')
