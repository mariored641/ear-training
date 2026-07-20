import React, { useEffect, useMemo, useState } from 'react';

function defaultFileName() {
  const now = new Date();
  const date = [now.getDate(), now.getMonth() + 1, now.getFullYear()]
    .map((value) => String(value).padStart(2, '0'))
    .join('-');
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `looper-session-${date}-${time}.wav`;
}
export default function ExportDialog({ tracks, onClose, exportMix }) {
  const defaults = useMemo(() => tracks.filter((track) => !track.muted).map((track) => track.id), [tracks]);
  const [selectedIds, setSelectedIds] = useState(defaults);
  const [fileName, setFileName] = useState(defaultFileName);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setSelectedIds(defaults), [defaults]);

  const toggle = (trackId) => {
    setSelectedIds((current) => current.includes(trackId)
      ? current.filter((id) => id !== trackId)
      : [...current, trackId]);
  };

  const download = async () => {
    if (!selectedIds.length || exporting) return;
    setExporting(true);
    try {
      const excludeTrackIds = tracks.filter((track) => !selectedIds.includes(track.id)).map((track) => track.id);
      const blob = await exportMix({ format: 'wav', excludeTrackIds });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName.trim().toLowerCase().endsWith('.wav')
        ? fileName.trim()
        : `${fileName.trim() || 'looper-session'}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="looper-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !exporting) onClose();
    }}>
      <section className="looper-modal looper-export-modal" role="dialog" aria-modal="true" aria-labelledby="looper-export-title">
        <header>
          <div>
            <h2 id="looper-export-title">ייצוא המיקס</h2>
            <p>בחר אילו שכבות ייכנסו לקובץ WAV</p>
          </div>
          <button type="button" className="looper-modal-close" onClick={onClose} disabled={exporting} aria-label="סגירת ייצוא">×</button>
        </header>

        <div className="looper-export-tracks">
          {tracks.map((track) => (
            <label key={track.id} className={track.muted ? 'is-muted' : ''}>
              <input
                type="checkbox"
                checked={selectedIds.includes(track.id)}
                onChange={() => toggle(track.id)}
                disabled={exporting}
              />
              <span>{track.label}</span>
              <small>{track.muted ? 'מושתקת כרגע' : `${Math.round(track.volume * 100)}%`}</small>
            </label>
          ))}
        </div>

        <label className="looper-file-name">
          <span>שם הקובץ</span>
          <input
            className="ws-control"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            disabled={exporting}
            dir="ltr"
          />
        </label>

        <footer>
          <button type="button" className="ws-ghost-btn" onClick={onClose} disabled={exporting}>ביטול</button>
          <button
            type="button"
            className="workshop-brass-btn looper-export-confirm"
            onClick={download}
            disabled={!selectedIds.length || exporting}
          >
            {exporting ? <><i className="looper-spinner" /> מכין קובץ...</> : 'הורד WAV'}
          </button>
        </footer>
      </section>
    </div>
  );
}
