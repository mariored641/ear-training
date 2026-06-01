/**
 * ShareDialog — appears after stop-recording. Either share via Web Share API
 * (mobile/PWA → WhatsApp etc.) or download as a fallback on desktop.
 */

import React, { useState } from 'react';
import { useTools } from './ToolsContext.jsx';

function timestamp() {
  const d = new Date();
  const p = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export default function ShareDialog() {
  const { lastResult, clearResult } = useTools();
  const [shareError, setShareError] = useState(null);

  if (!lastResult) return null;

  const filename = `idea-${timestamp()}.${lastResult.ext}`;

  const handleShare = async () => {
    setShareError(null);
    try {
      const file = new File([lastResult.blob], filename, { type: lastResult.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'רעיון מוסיקלי' });
      } else {
        triggerDownload();
      }
    } catch (err) {
      // user-cancel is fine; only show if it's a real error
      if (err?.name !== 'AbortError') {
        setShareError('השיתוף נכשל — נסה להוריד במקום');
      }
    }
  };

  const triggerDownload = () => {
    const a = document.createElement('a');
    a.href = lastResult.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <div className="gt-dialog-backdrop" onClick={clearResult} />
      <div className="gt-share-dialog" role="dialog" aria-label="שיתוף הקלטה">
        <div className="gt-share-title">
          רעיון נשמר · {lastResult.durationSec}s
        </div>
        <audio controls src={lastResult.url} className="gt-share-audio" />
        {shareError && <div className="gt-popover-error">{shareError}</div>}
        <div className="gt-share-actions">
          <button type="button" className="gt-share-btn gt-share-btn-primary" onClick={handleShare}>
            שלח
          </button>
          <button type="button" className="gt-share-btn" onClick={triggerDownload}>
            הורד
          </button>
          <button type="button" className="gt-share-btn gt-share-btn-ghost" onClick={clearResult}>
            סגור
          </button>
        </div>
      </div>
    </>
  );
}
