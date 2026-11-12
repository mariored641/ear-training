import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { readLastState, useRemember } from '../../utils/lastState'
import { SCALE_CATEGORIES, ALL_SCALES_MAP } from '../../constants/allScalesData'
import { normalizeDisplayAccidentals } from '../../i18n/musicTerms'
import { chordDisplayName, prettifyChord } from './useBackingTrackEngine.js'
import * as SFP from '../../lib/soundfont/SoundFontPlayer.js'
import {
  DEFAULT_SETTINGS, MAX_REPETITIONS, MAX_ROTATE_EVERY, MAX_VIEWS, MAX_FRET, DISPLAY_MODES,
  RESOLUTIONS, sanitizeSettings, sanitizeView, fretWindows, estimateDurationSec,
  formatDuration, exportFileName, pickRecorderFormat,
} from '../../lib/video-export/exportPlan.js'
import { runExport, ExportCancelled } from '../../lib/video-export/VideoExporter.js'
import './VideoExportDialog.css'

const CHROMATIC = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
const STORAGE_ID = 'backing-video-export'

/** The neck view the student currently has on the live fretboard. */
function currentNeckView() {
  const read = (field, fallback) => readLastState(`backing-fretboard.${field}`, 1, { value: fallback }).value
  return sanitizeView({
    scaleId: read('globalScaleId', null),
    root: read('globalRoot', 'auto'),
    fretStart: read('fretRangeStart', null),
    fretEnd: read('fretRangeEnd', null),
    displayMode: read('displayMode', 'notes') === 'degrees' ? 'degrees' : 'notes',
  })
}

function initialSettings() {
  const saved = sanitizeSettings(readLastState(STORAGE_ID, 1, DEFAULT_SETTINGS))
  return saved.views.length ? saved : { ...saved, views: [currentNeckView()] }
}

function Stepper({ value, min, max, onChange, label, disabled }) {
  return (
    <div className="vx-stepper" role="group" aria-label={label}>
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="−">−</button>
      <span data-testid={`vx-${label}`}>{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="+">+</button>
    </div>
  )
}

/**
 * Props:
 *  getLive()        → latest playback state (read every frame, never React state)
 *  meta             → { styleName, keyLabel, tempo }
 *  chords, beatsPerBar, genre → for the duration estimate and file name
 *  prepare / play / stop      → engine controls from useBackingTrackEngine
 */
export function VideoExportDialog({ getLive, meta, chords, beatsPerBar, genre, prepare, play, stop, onClose }) {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState(initialSettings)
  const rawSettings = settings
  useRemember(STORAGE_ID, 1, settings)
  const [status, setStatus] = useState({ stage: 'idle', progress: 0 })
  const [result, setResult] = useState(null)   // { url, name, ext, bytes }
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const running = status.stage === 'loading' || status.stage === 'recording' || status.stage === 'finalizing'
  const format = useMemo(
    () => (typeof MediaRecorder === 'undefined' ? null : pickRecorderFormat(m => MediaRecorder.isTypeSupported(m))),
    [],
  )

  const patch = (changes) => setSettings(s => sanitizeSettings({ ...s, ...changes }))
  // Views stay raw while typing (a half-typed fret number must not jump); blur/start normalise them.
  const setView = (i, changes) => setSettings(s => ({
    ...s, views: s.views.map((v, j) => (j === i ? { ...v, ...changes } : v)),
  }))
  const normalise = () => setSettings(s => sanitizeSettings(s))
  const addView = () => setSettings(s => sanitizeSettings({
    ...s, views: s.views.length >= MAX_VIEWS ? s.views : [...s.views, { ...s.views[s.views.length - 1] }],
  }))
  const removeView = (i) => setSettings(s => ({ ...s, views: s.views.length > 1 ? s.views.filter((_, j) => j !== i) : s.views }))
  const splitPositions = () => setSettings(s => ({ ...s, views: fretWindows(s.views[0]) }))

  // Free the preview blob when the dialog goes away or a new export replaces it.
  useEffect(() => () => { if (result?.url) URL.revokeObjectURL(result.url) }, [result])
  // Closing mid-export cancels it (and silences playback).
  useEffect(() => () => abortRef.current?.abort(), [])

  const labels = useMemo(() => ({
    repetition: t('backing.videoExport.canvas.repetition'),
    countIn: t('backing.videoExport.canvas.countIn'),
    next: t('backing.videoExport.canvas.next'),
    chordTones: t('backing.videoExport.canvas.chordTones'),
    frets: t('backing.videoExport.canvas.frets'),
    legendRoot: t('backing.videoExport.canvas.legendRoot'),
    legendChordTone: t('backing.videoExport.canvas.legendChordTone'),
    legendScale: t('backing.videoExport.canvas.legendScale'),
  }), [t, i18n.language])

  const start = useCallback(async () => {
    setError('')
    setResult(null)
    const settings = sanitizeSettings(rawSettings)
    setSettings(settings)
    const controller = new AbortController()
    abortRef.current = controller
    setStatus({ stage: 'loading', progress: 0 })
    try {
      SFP.resumeAudio?.()
      const logo = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)   // the video is still useful without it
        img.src = '/logo.png'
      })
      const out = await runExport({
        settings,
        meta,
        labels,
        deps: {
          chordSymbol: chordDisplayName,
          pretty: prettifyChord,
          noteLabel: normalizeDisplayAccidentals,
          scaleName: (id) => t(`positions.musicItems.${id}`, { defaultValue: ALL_SCALES_MAP[id]?.name ?? id }),
        },
        getLive,
        prepare,
        startPlayback: (loops) => play({ loops }),
        stopPlayback: (hard) => stop(hard),
        captureAudio: () => SFP.createCaptureStream(),
        logo,
        onProgress: setStatus,
        signal: controller.signal,
      })
      const name = exportFileName({ genre, ext: out.ext })
      setResult({ url: URL.createObjectURL(out.blob), name, ext: out.ext, bytes: out.blob.size })
      setStatus({ stage: 'done', progress: 1 })
    } catch (err) {
      if (err instanceof ExportCancelled) {
        setStatus({ stage: 'cancelled', progress: 0 })
      } else {
        console.error('[VideoExport]', err)
        setError(err?.message === 'recording-unsupported' ? t('backing.videoExport.errUnsupported') : t('backing.videoExport.errFailed'))
        setStatus({ stage: 'error', progress: 0 })
      }
    } finally {
      abortRef.current = null
    }
  }, [settings, meta, labels, getLive, prepare, play, stop, genre, t])

  const cancel = () => abortRef.current?.abort()
  const duration = estimateDurationSec({ chords, beatsPerBar, tempo: meta.tempo, repetitions: settings.repetitions })
  const rotates = settings.views.length > 1
  const pct = Math.round(status.progress * 100)

  return (
    <div className="vx-backdrop" role="dialog" aria-modal="true" aria-label={t('backing.videoExport.title')} onClick={e => e.stopPropagation()}>
      <div className="vx-dialog">
        <div className="vx-head">
          <h2>{t('backing.videoExport.title')}</h2>
          <button type="button" className="vx-close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>

        <div className="vx-body">
          <div className="vx-row">
            <label>{t('backing.videoExport.repetitions')}</label>
            <Stepper label="repetitions" value={settings.repetitions} min={1} max={MAX_REPETITIONS} disabled={running}
              onChange={v => patch({ repetitions: v })} />
          </div>
          <div className="vx-row">
            <label>{t('backing.videoExport.rotateEvery')}</label>
            <Stepper label="rotateEvery" value={settings.rotateEvery} min={1} max={MAX_ROTATE_EVERY} disabled={running || !rotates}
              onChange={v => patch({ rotateEvery: v })} />
          </div>
          {!rotates && <p className="vx-hint">{t('backing.videoExport.rotateHint')}</p>}
          <div className="vx-row">
            <label>{t('backing.videoExport.quality')}</label>
            <select value={settings.resolution} disabled={running} onChange={e => patch({ resolution: e.target.value })}>
              {Object.keys(RESOLUTIONS).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <h3>{t('backing.videoExport.neckViews')}</h3>
          <div className="vx-views">
            {settings.views.map((v, i) => (
              <div className="vx-view" key={i} data-testid="vx-view">
                <span className="vx-view-n">{i + 1}</span>
                <select aria-label={t('positions.scale')} value={v.scaleId || ''} disabled={running}
                  onChange={e => setView(i, { scaleId: e.target.value || null })}>
                  <option value="">{t('backing.videoExport.chordTonesOnly')}</option>
                  {SCALE_CATEGORIES.map(cat => (
                    <optgroup key={cat.id} label={t(`positions.musicCategories.${cat.id}`, { defaultValue: cat.label })}>
                      {cat.items.map(item => (
                        <option key={item.id} value={item.id}>{t(`positions.musicItems.${item.id}`, { defaultValue: item.name })}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select aria-label={t('common.root')} value={v.root} disabled={running} onChange={e => setView(i, { root: e.target.value })}>
                  <option value="auto">{t('common.auto')}</option>
                  {CHROMATIC.map(n => <option key={n} value={n}>{normalizeDisplayAccidentals(n)}</option>)}
                </select>
                <span className="vx-frets">
                  <input type="number" min={0} max={MAX_FRET} value={v.fretStart} disabled={running}
                    aria-label={t('backing.videoExport.fromFret')} onChange={e => setView(i, { fretStart: e.target.value })} onBlur={normalise} />
                  <span>–</span>
                  <input type="number" min={0} max={MAX_FRET} value={v.fretEnd} disabled={running}
                    aria-label={t('backing.videoExport.toFret')} onChange={e => setView(i, { fretEnd: e.target.value })} onBlur={normalise} />
                </span>
                <select aria-label={t('common.display')} value={v.displayMode} disabled={running} onChange={e => setView(i, { displayMode: e.target.value })}>
                  {DISPLAY_MODES.map(m => <option key={m} value={m}>{t(`backing.videoExport.mode_${m}`)}</option>)}
                </select>
                <button type="button" className="vx-icon-btn" disabled={running || settings.views.length < 2}
                  onClick={() => removeView(i)} aria-label={t('backing.videoExport.removeView')}>🗑</button>
              </div>
            ))}
          </div>
          <div className="vx-actions-row">
            <button type="button" disabled={running || settings.views.length >= MAX_VIEWS} onClick={addView}>＋ {t('backing.videoExport.addView')}</button>
            <button type="button" disabled={running} onClick={splitPositions}>{t('backing.videoExport.splitPositions')}</button>
          </div>

          <p className="vx-hint">
            {t('backing.videoExport.estimate', { duration: formatDuration(duration) })}
            {' · '}
            {format ? t('backing.videoExport.formatLabel', { ext: format.ext.toUpperCase() }) : t('backing.videoExport.errUnsupported')}
          </p>
          <p className="vx-hint">{t('backing.videoExport.keepOpen')}</p>

          {running && (
            <div className="vx-progress" data-testid="vx-progress">
              <div className="vx-progress-label">
                {t(`backing.videoExport.stage_${status.stage}`)}{status.stage === 'recording' ? ` ${pct}%` : ''}
              </div>
              <div className="vx-bar"><div className="vx-bar-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          )}
          {status.stage === 'cancelled' && <p className="vx-note">{t('backing.videoExport.cancelled')}</p>}
          {error && <p className="vx-error" role="alert">{error}</p>}

          {result && (
            <div className="vx-result" data-testid="vx-result">
              <video src={result.url} controls playsInline className="vx-preview" />
              <a className="vx-download" href={result.url} download={result.name} data-testid="vx-download">
                ⬇ {t('backing.videoExport.download')} ({result.ext.toUpperCase()}, {(result.bytes / 1048576).toFixed(1)} MB)
              </a>
            </div>
          )}
        </div>

        <div className="vx-foot">
          {running
            ? <button type="button" className="vx-btn vx-btn--danger" onClick={cancel}>{t('backing.videoExport.cancel')}</button>
            : <button type="button" className="vx-btn vx-btn--primary" onClick={start} disabled={!format} data-testid="vx-start">
                🎬 {result ? t('backing.videoExport.again') : t('backing.videoExport.start')}
              </button>}
        </div>
      </div>
    </div>
  )
}
