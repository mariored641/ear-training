import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersistentState } from '../../utils/lastState'
import { formatNoteName } from '../../i18n/musicTerms'
import { prettifyChord } from './useBackingTrackEngine.js'
import { formatDuration } from '../../lib/video-export/exportPlan.js'
import { COURSE, LESSONS, TRACKS_BY_ID, TRACK_TYPES, trackBars, lessonPreset } from '../../data/lessonBackingTracks.js'
import './LessonPresets.css'

const LESSON_NUMBERS = LESSONS.map(l => l.n)

/** Compact chord summary: unique bars in order, e.g. "Am | G7". */
function chordSummary(track) {
  const bars = trackBars(track)
  return bars.length <= 8 ? bars.join(' | ') : `${bars.slice(0, 8).join(' | ')} …`
}

/**
 * "אלתור בהישג יד" lesson module: pick the current lesson, load one of its ready-made presets.
 * Loading only fills the backing-track state — it never starts playback.
 */
export function LessonPresets({ onLoad, loadedId }) {
  const { t, i18n } = useTranslation()
  const he = i18n.language === 'he'
  const [savedLesson, setLesson] = usePersistentState('backing-lessons', 'lesson', 1)
  const lessonN = LESSON_NUMBERS.includes(savedLesson) ? savedLesson : 1
  const lesson = LESSONS.find(l => l.n === lessonN)

  // Group items by progression type, keeping lesson order.
  const groups = useMemo(() => {
    const out = []
    for (const item of lesson.items) {
      const track = TRACKS_BY_ID[item.trackId]
      let g = out.find(x => x.type === track.type && x.neck === item.neck)
      if (!g) out.push(g = { type: track.type, neck: item.neck, items: [] })
      g.items.push(lessonPreset(lessonN, item.trackId))
    }
    return out
  }, [lesson, lessonN])

  return (
    <div className="lp-root" data-testid="lesson-presets">
      <div className="lp-course">{he ? COURSE.titleHe : COURSE.titleEn}</div>
      <div className="lp-lessons" role="group" aria-label={t('backing.lessons.pickLesson')}>
        {LESSON_NUMBERS.map(n => (
          <button
            key={n}
            type="button"
            className={`lp-lesson-btn${n === lessonN ? ' active' : ''}`}
            aria-pressed={n === lessonN}
            aria-label={t('backing.lessons.lessonN', { n })}
            data-testid={`lesson-btn-${n}`}
            onClick={() => setLesson(n)}
          >{n}</button>
        ))}
      </div>
      <div className="lp-lesson-title" data-testid="lesson-title">
        {t('backing.lessons.lessonN', { n: lessonN })}: {he ? lesson.titleHe : lesson.titleEn}
      </div>
      {lesson.inferred && <p className="lp-note">{t('backing.lessons.inferredNote')}</p>}

      {groups.map(g => (
        <div className="lp-group" key={`${g.type}-${g.neck}`}>
          <div className="lp-group-head">
            <span className="lp-group-title">{he ? TRACK_TYPES[g.type].labelHe : TRACK_TYPES[g.type].labelEn}</span>
            <span className="lp-neck">🎸 {t(`backing.lessons.necks.${g.neck}`)}</span>
          </div>
          <ul className="lp-list">
            {g.items.map(p => (
              <li key={p.id} className={`lp-item${loadedId === p.id ? ' loaded' : ''}`}>
                <div className="lp-item-main">
                  <div className="lp-item-title">
                    {t(`backing.styles.${p.genre}`, { defaultValue: p.track.styleLabel })}
                    {p.track.source.kind === 'suggested' && <span className="lp-chip lp-chip--new">{t('backing.lessons.newStyle')}</span>}
                  </div>
                  <div className="lp-item-chords">{prettifyChord(chordSummary(p.track))}</div>
                  <div className="lp-item-meta">
                    {formatNoteName(p.key.root, i18n.language)}{p.key.type === 'minor' ? 'm' : ''}
                    {' · '}{p.tempo} bpm
                    {' · '}{t('backing.lessons.barsCount', { count: trackBars(p.track).length })}
                    {' · '}🎬 {formatDuration(p.plan.dialogEstimateSec)} ({p.export.repetitions}×)
                  </div>
                </div>
                <button
                  type="button"
                  className="lp-load-btn"
                  data-testid={`lesson-load-${p.track.id}`}
                  onClick={() => onLoad(p)}
                >{loadedId === p.id ? `✓ ${t('backing.lessons.loaded')}` : t('backing.lessons.load')}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
