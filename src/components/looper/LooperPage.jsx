import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MAX_TRACKS } from '../../lib/looperEngine';
import ExportDialog from './ExportDialog';
import LooperSettings from './LooperSettings';
import TrackRow from './TrackRow';
import TransportControls from './TransportControls';
import useLooperEngine from './useLooperEngine';
import './LooperPage.css';

export default function LooperPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
    <div className="looper-page ws-page">
      <div className="ws-aurora" aria-hidden="true">
        <span className="ws-blob ws-blob-1" />
        <span className="ws-blob ws-blob-2" />
        <span className="ws-blob ws-blob-3" />
      </div>
      <div className="ws-stars" aria-hidden="true" />

      <header className="ws-page-header looper-header">
        <button type="button" className="ws-back-btn" onClick={() => navigate('/')} aria-label={t('common.backHome')}>
          {i18n.dir() === 'rtl' ? '→' : '←'}
        </button>
        <div className="looper-title-block">
          <h1 className="ws-page-title">{t('looper.title')}</h1>
          <p className="ws-page-subtitle">{t('looper.subtitle')}</p>
        </div>
        <button type="button" className="ws-ghost-btn looper-settings-btn" onClick={() => setSettingsOpen(true)}>
          {t('common.settings')}
        </button>
      </header>

      <main className="looper-main">
        <section className="looper-tempo-panel workshop-panel" aria-label={t('tools.metronome')}>
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
              {t('looper.tapTempo')}
            </button>
            <span className="looper-signature">{session.timeSignature.join('/')}</span>
          </div>

          <div className="looper-beat-row" aria-label={t('looper.beatProgress', { current: currentBeat + 1, total: beatCount })}>
            {Array.from({ length: beatCount }, (_, index) => (
              <i key={index} className={`${index === currentBeat ? 'active' : ''} ${index === 0 ? 'accent' : ''}`} />
            ))}
          </div>

          {hasTracks && (
            <div className="looper-loop-meta">
              <span>{t('common.bars', { count: session.loopLengthBars })}</span>
              <span>{t('looper.layerProgress', { current: session.tracks.length, total: MAX_TRACKS })}</span>
              <span>{t('looper.autoSaved')}</span>
            </div>
          )}
        </section>

        {engineState === 'counting-in' && (
          <div className="looper-countdown" role="status" aria-live="assertive">
            <span>{Math.max(1, currentBeat + 1)}</span>
            <small>{t('looper.countIn')}</small>
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
          <section className="looper-tracks" aria-label={t('looper.recordedLayers')}>
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
                <span>＋</span> {t('looper.addLayer')}
              </button>
            ) : (
              <p className="looper-max-note">{t('looper.maxLayers', { count: MAX_TRACKS })}</p>
            )}
          </section>
        )}
      </main>

      <footer className="looper-action-bar workshop-leather-bar">
        <button type="button" className="ws-ghost-btn" onClick={actions.undoLast} disabled={!canUndo || busy}>
          {t('looper.undo')}
        </button>
        <button type="button" className="workshop-brass-btn" onClick={() => setExportOpen(true)} disabled={!hasTracks || busy}>
          {t('looper.exportWav')}
        </button>
      </footer>

      {error && (
        <div className="looper-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={actions.clearError} aria-label={t('common.close')}>×</button>
        </div>
      )}

      {settingsOpen && <LooperSettings session={session} actions={actions} onClose={() => setSettingsOpen(false)} />}
      {exportOpen && <ExportDialog tracks={session.tracks} exportMix={actions.exportMix} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
