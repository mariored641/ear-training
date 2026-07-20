import React from 'react';

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
  const recording = engineState === 'recording';
  const counting = engineState === 'counting-in';
  const busy = recording || counting;

  const record = () => {
    if (recording) actions.stopRecording();
    else if (counting) actions.stop();
    else actions.startRecording();
  };

  return (
    <section className="looper-transport" aria-label="שליטה בהקלטה ובנגינה">
      <div className="looper-input-meter" aria-label={`עוצמת כניסה ${Math.round(inputLevel * 100)} אחוז`}>
        <span>כניסה</span>
        <div className="looper-meter-track">
          <i style={{ width: `${Math.round(inputLevel * 100)}%` }} />
        </div>
      </div>

      <button
        type="button"
        className={`looper-record-btn ${recording ? 'is-recording' : ''} ${counting ? 'is-counting' : ''}`}
        onClick={record}
        disabled={maxTracksReached && !busy}
        aria-label={recording ? 'סיום הקלטה' : counting ? 'ביטול ספירה' : 'התחלת הקלטה'}
      >
        <span className="looper-record-symbol" aria-hidden="true" />
        <strong>{recording ? formatTime(recordingElapsed) : counting ? 'מוכן?' : 'REC'}</strong>
        <small>{recording ? 'לחץ לסיום' : counting ? 'לחץ לביטול' : hasTracks ? 'שכבה חדשה' : 'שכבה ראשונה'}</small>
      </button>

      <div className="looper-transport-secondary">
        <button type="button" className="ws-ghost-btn" onClick={actions.play} disabled={!hasTracks || busy}>
          נגן
        </button>
        <button type="button" className="ws-ghost-btn" onClick={actions.stop} disabled={!hasTracks && !busy}>
          עצור
        </button>
      </div>
    </section>
  );
}
