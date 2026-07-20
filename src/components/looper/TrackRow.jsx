import React, { useEffect, useState } from 'react';
import WaveformCanvas from './WaveformCanvas';

export default function TrackRow({
  track,
  playbackPosition,
  isTransportActive,
  isRecording,
  anySolo,
  actions,
}) {
  const [label, setLabel] = useState(track.label);

  useEffect(() => setLabel(track.label), [track.label]);

  const saveLabel = () => {
    actions.renameTrack(track.id, label);
    setLabel(label.trim() || track.label);
  };

  const remove = () => {
    if (window.confirm(`למחוק את ${track.label}? אפשר לבטל מיד לאחר מכן.`)) {
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
          aria-label={`שם ${track.label}`}
        />
        {isRecording && <span className="looper-track-rec-badge">REC</span>}
      </div>

      <WaveformCanvas
        peaks={track.waveformPeaks}
        playbackPosition={playbackPosition}
        active={isTransportActive}
        label={`צורת הגל של ${track.label}`}
      />

      <div className="looper-track-controls">
        <div className="looper-track-buttons">
          <button
            type="button"
            className={`looper-mini-btn ${track.muted ? 'active' : ''}`}
            onClick={() => actions.setTrackMute(track.id, !track.muted)}
            aria-pressed={track.muted}
          >
            השתק
          </button>
          <button
            type="button"
            className={`looper-mini-btn ${track.soloed ? 'active' : ''}`}
            onClick={() => actions.setTrackSolo(track.id, !track.soloed)}
            aria-pressed={track.soloed}
          >
            סולו
          </button>
          <button
            type="button"
            className="looper-mini-btn"
            onClick={() => actions.startRecording(track.id)}
            disabled={isRecording}
            title="הקלט מחדש באותו מקום"
          >
            הקלט מחדש
          </button>
          <button type="button" className="looper-mini-btn danger" onClick={remove} disabled={isRecording}>
            מחק
          </button>
        </div>

        <div className="looper-track-sliders">
          <label>
            <span>עוצמה</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={(event) => actions.setTrackVolume(track.id, event.target.value)}
              aria-label={`עוצמת ${track.label}`}
            />
          </label>
          <label>
            <span>צידוד</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={track.pan}
              onChange={(event) => actions.setTrackPan(track.id, event.target.value)}
              aria-label={`צידוד ${track.label}`}
            />
          </label>
        </div>
      </div>
    </article>
  );
}
