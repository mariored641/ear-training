import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WaveformCanvas from './WaveformCanvas';

export default function TrackRow({
  track,
  playbackPosition,
  isTransportActive,
  isRecording,
  anySolo,
  actions,
}) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(track.label);

  useEffect(() => setLabel(track.label), [track.label]);

  const saveLabel = () => {
    actions.renameTrack(track.id, label);
    setLabel(label.trim() || track.label);
  };

  const remove = () => {
    if (window.confirm(t('looper.deleteConfirm', { name: track.label }))) {
      actions.deleteTrack(track.id);
    }
  };

  const dimmed = track.muted || (anySolo && !track.soloed);

  return (
    <article className={`looper-track ${dimmed ? 'is-dimmed' : ''} ${track.soloed ? 'is-soloed' : ''}`}>
      <div className="looper-track-heading">
        <span className="looper-track-number" aria-hidden="true">{track.order + 1}</span>
        <input
          className="looper-track-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={saveLabel}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-label={t('looper.layerName', { name: track.label })}
        />
        {isRecording && <span className="looper-track-rec-badge">REC</span>}
      </div>

      <WaveformCanvas
        peaks={track.waveformPeaks}
        playbackPosition={playbackPosition}
        active={isTransportActive}
        label={t('looper.waveform', { name: track.label })}
      />

      <div className="looper-track-controls">
        <div className="looper-track-buttons">
          <button
            type="button"
            className={`looper-mini-btn ${track.muted ? 'active' : ''}`}
            onClick={() => actions.setTrackMute(track.id, !track.muted)}
            aria-pressed={track.muted}
          >
            {t('looper.mute')}
          </button>
          <button
            type="button"
            className={`looper-mini-btn ${track.soloed ? 'active' : ''}`}
            onClick={() => actions.setTrackSolo(track.id, !track.soloed)}
            aria-pressed={track.soloed}
          >
            {t('looper.solo')}
          </button>
          <button
            type="button"
            className="looper-mini-btn"
            onClick={() => actions.startRecording(track.id)}
            disabled={isRecording}
            title={t('looper.rerecordTitle')}
          >
            {t('looper.rerecord')}
          </button>
          <button type="button" className="looper-mini-btn danger" onClick={remove} disabled={isRecording}>
            {t('common.delete')}
          </button>
        </div>

        <div className="looper-track-sliders">
          <label>
            <span>{t('looper.volume')}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={(event) => actions.setTrackVolume(track.id, event.target.value)}
              aria-label={`${t('looper.volume')} ${track.label}`}
            />
          </label>
          <label>
            <span>{t('looper.pan')}</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={track.pan}
              onChange={(event) => actions.setTrackPan(track.id, event.target.value)}
              aria-label={`${t('looper.pan')} ${track.label}`}
            />
          </label>
        </div>
      </div>
    </article>
  );
}
