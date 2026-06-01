/**
 * RecordingBadge — small pulsing mic icon + mm:ss timer beside the main FAB
 * while recording. Visible across page navigations because it reads ToolsContext.
 */

import React, { useEffect, useState } from 'react';
import { MicrophoneIcon } from '../icons/AppIcons.jsx';
import { useTools } from './ToolsContext.jsx';

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecordingBadge() {
  const { recordingState, getRecordingStartedAt } = useTools();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const tick = () => setElapsed(Math.floor((Date.now() - getRecordingStartedAt()) / 1000));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [recordingState, getRecordingStartedAt]);

  if (recordingState !== 'recording') return null;

  return (
    <div className="gt-rec-badge" aria-live="polite">
      <span className="gt-rec-mic">
        <MicrophoneIcon />
      </span>
      <span className="gt-rec-time">{fmt(elapsed)}</span>
    </div>
  );
}
