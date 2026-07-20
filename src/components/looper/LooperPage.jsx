import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_TRACKS } from '../../lib/looperEngine';
import ExportDialog from './ExportDialog';
import LooperSettings from './LooperSettings';
import TrackRow from './TrackRow';
import TransportControls from './TransportControls';
import useLooperEngine from './useLooperEngine';
import './LooperPage.css';

export default function LooperPage() {
  const navigate = useNavigate();
  const {
    session,
    engineState,
    playbackPosition,
    currentBeat,
    recordingElapsed,
    inputLevel,
    activeRecordingTrackId,
    canUndo,
    error,
    actions,
  } = useLooperEngine();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('looper-page-active');
    return () => document.body.classList.remove('looper-page-active');
  }, []);

  const busy = engineState === 'recording' || engineState === 'counting-in';
  const hasTracks = session.tracks.length > 0;
  const maxTracksReached = session.tracks.length >= MAX_TRACKS;
  const anySolo = session.tracks.some((track) => track.soloed);
  const beatCount = session.timeSignature[0];

  return (
    <div className="looper-page ws-page" dir="rtl">
      <div className="ws-aurora" aria-hidden="true">
        <span className="ws-blob ws-blob-1" />
        <span className="ws-blob ws-blob-2" />
        <span className="ws-blob ws-blob-3" />
      </div>
      <div className="ws-stars" aria-hidden="true" />

      <header className="ws-page-header looper-header">
        <button type="button" className="ws-back-btn" onClick={() => navigate('/')} aria-label="חזרה לעמוד הבית">→</button>
        <div className="looper-title-block">
          <h1 className="ws-page-title">לופר</h1>
          <p className="ws-page-subtitle">בנה שכבות, נגן מעליהן, ושמור את הרעיון</p>
        </div>
        <button type="button" className="ws-ghost-btn looper-settings-btn" onClick={() => setSettingsOpen(true)}>
          הגדרות
        </button>
      </header>

      <main className="looper-main">
        <section className="looper-tempo-panel workshop-panel" aria-label="מטרונום">
          <div className="looper-tempo-controls">
            <label className="looper-bpm-field">
              <span>BPM</span>
              <input
                key={session.bpm}
                type="number"
                min="40"
                max="240"
                defaultValue={session.bpm}
                disabled={hasTracks || busy}
                onBlur={(event) => actions.setBpm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                inputMode="numeric"
              />
            </label>
            <button type="button" className="looper-tap-btn" onClick={actions.tapTempo} disabled={hasTracks || busy}>
              Tap Tempo
            </button>
            <span className="looper-signature">{session.timeSignature.join('/')}</span>
          </div>

          <div className="looper-beat-row" aria-label={`פעימה ${currentBeat + 1} מתוך ${beatCount}`}>
            {Array.from({ length: beatCount }, (_, index) => (
              <i key={index} className={`${index === currentBeat ? 'active' : ''} ${index === 0 ? 'accent' : ''}`} />
            ))}
          </div>

          {hasTracks && (
            <div className="looper-loop-meta">
              <span>{session.loopLengthBars} תיבות</span>
              <span>{session.tracks.length}/{MAX_TRACKS} שכבות</span>
              <span>נשמר אוטומטית</span>
            </div>
          )}
        </section>

        {engineState === 'counting-in' && (
          <div className="looper-countdown" role="status" aria-live="assertive">
            <span>{Math.max(1, currentBeat + 1)}</span>
            <small>ספירה לפני הקלטה</small>
          </div>
        )}

        <TransportControls
          engineState={engineState}
          hasTracks={hasTracks}
          maxTracksReached={maxTracksReached}
          recordingElapsed={recordingElapsed}
          inputLevel={inputLevel}
          actions={actions}
        />

        {hasTracks && (
          <section className="looper-tracks" aria-label="שכבות מוקלטות">
            {session.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                playbackPosition={playbackPosition}
                isTransportActive={engineState === 'playing' || engineState === 'recording'}
                isRecording={activeRecordingTrackId === track.id}
                anySolo={anySolo}
                actions={actions}
              />
            ))}
            {!maxTracksReached ? (
              <button type="button" className="looper-add-track" onClick={() => actions.startRecording()} disabled={busy}>
                <span>＋</span> הוסף שכבה
              </button>
            ) : (
              <p className="looper-max-note">הגעת למקסימום של {MAX_TRACKS} שכבות במובייל.</p>
            )}
          </section>
        )}
      </main>

      <footer className="looper-action-bar workshop-leather-bar">
        <button type="button" className="ws-ghost-btn" onClick={actions.undoLast} disabled={!canUndo || busy}>
          בטל אחרון
        </button>
        <button type="button" className="workshop-brass-btn" onClick={() => setExportOpen(true)} disabled={!hasTracks || busy}>
          ייצוא WAV
        </button>
      </footer>

      {error && (
        <div className="looper-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={actions.clearError} aria-label="סגירת הודעת שגיאה">×</button>
        </div>
      )}

      {settingsOpen && <LooperSettings session={session} actions={actions} onClose={() => setSettingsOpen(false)} />}
      {exportOpen && <ExportDialog tracks={session.tracks} exportMix={actions.exportMix} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
