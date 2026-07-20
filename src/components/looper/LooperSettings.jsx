import React from 'react';

export default function LooperSettings({ session, onClose, actions }) {
  const timingLocked = session.tracks.length > 0;
  const signature = session.timeSignature.join('/');

  const reset = async () => {
    if (!window.confirm('לפתוח סשן חדש? כל השכבות הנוכחיות יימחקו מהמכשיר.')) return;
    await actions.resetSession();
    onClose();
  };

  return (
    <div className="looper-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="looper-modal" role="dialog" aria-modal="true" aria-labelledby="looper-settings-title">
        <header>
          <div>
            <h2 id="looper-settings-title">הגדרות לופר</h2>
            <p>קבע את הגריד לפני ההקלטה הראשונה</p>
          </div>
          <button type="button" className="looper-modal-close" onClick={onClose} aria-label="סגירת הגדרות">×</button>
        </header>

        <div className="looper-settings-grid">
          <label>
            <span>משקל</span>
            <select
              className="ws-control"
              value={signature}
              disabled={timingLocked}
              onChange={(event) => {
                const [numerator, denominator] = event.target.value.split('/').map(Number);
                actions.setTimeSignature(numerator, denominator);
              }}
            >
              <option value="4/4">4/4</option>
              <option value="3/4">3/4</option>
              <option value="6/8">6/8</option>
            </select>
          </label>

          <label>
            <span>ספירה לפני הקלטה</span>
            <select
              className="ws-control"
              value={session.countInBars}
              onChange={(event) => actions.setCountInBars(event.target.value)}
            >
              <option value="0">ללא ספירה</option>
              <option value="1">תיבה אחת</option>
              <option value="2">שתי תיבות</option>
            </select>
          </label>

          <label className="looper-click-volume">
            <span>עוצמת קליק</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={session.clickVolume}
              onChange={(event) => actions.setClickVolume(event.target.value)}
            />
            <output>{Math.round(session.clickVolume * 100)}%</output>
          </label>
        </div>

        {timingLocked && (
          <p className="looper-settings-note">
            ה־BPM והמשקל נעולים אחרי ההקלטה הראשונה כדי לשמור על סנכרון מדויק בין השכבות.
          </p>
        )}
        <p className="looper-headphones-note">
          מומלץ לעבוד עם אוזניות: הקליק נשמע בזמן ההקלטה, אך אינו נכנס למיקס הדיגיטלי.
        </p>

        <footer>
          <button type="button" className="looper-reset-btn" onClick={reset}>סשן חדש</button>
          <button type="button" className="workshop-brass-btn" onClick={onClose}>סיום</button>
        </footer>
      </section>
    </div>
  );
}
