import React from 'react';
import { useTranslation } from 'react-i18next';

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
export default function TransportControls({
  engineState,
  hasTracks,
  maxTracksReached,
  recordingElapsed,
  inputLevel,
  actions,
}) {
  const { t } = useTranslation();
  const recording = engineState === 'recording';
  const counting = engineState === 'counting-in';
  const busy = recording || counting;

  const record = () => {
    if (recording) actions.stopRecording();
    else if (counting) actions.stop();
    else actions.startRecording();
  };

  return (
    <section className="looper-transport" aria-label={t('looper.recordingControls')}>
      <div className="looper-input-meter" aria-label={t('looper.inputLevel', { percent: Math.round(inputLevel * 100) })}>
        <span>{t('looper.input')}</span>
        <div className="looper-meter-track">
          <i style={{ width: `${Math.round(inputLevel * 100)}%` }} />
        </div>
      </div>

      <button
        type="button"
        className={`looper-record-btn ${recording ? 'is-recording' : ''} ${counting ? 'is-counting' : ''}`}
        onClick={record}
        disabled={maxTracksReached && !busy}
        aria-label={recording ? t('looper.stopRecording') : counting ? t('looper.cancelCountIn') : t('looper.startRecording')}
      >
        <span className="looper-record-symbol" aria-hidden="true" />
        <strong>{recording ? formatTime(recordingElapsed) : counting ? t('looper.ready') : 'REC'}</strong>
        <small>{recording ? t('looper.tapToStop') : counting ? t('looper.tapToCancel') : hasTracks ? t('looper.newLayer') : t('looper.firstLayer')}</small>
      </button>

      <div className="looper-transport-secondary">
        <button type="button" className="ws-ghost-btn" onClick={actions.play} disabled={!hasTracks || busy}>
          {t('common.play')}
        </button>
        <button type="button" className="ws-ghost-btn" onClick={actions.stop} disabled={!hasTracks && !busy}>
          {t('common.stop')}
        </button>
      </div>
    </section>
  );
}
