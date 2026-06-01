/**
 * GlobalTools — bottom-left FAB with a brass radial fan of 3 tools:
 *   Tuner · Metronome · Recorder
 *
 * Click the wrench → 3 mini buttons fan out (down→up arc).
 * Click outside / ESC / route change → collapse.
 * Tuner & Metronome → open a compact popover anchored to the FAB cluster.
 * Recorder → toggles recording directly (no popover; a pulsing badge
 *            attaches beside the wrench while recording).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  WrenchIcon,
  TuningForkIcon,
  MetronomeIcon,
  MicrophoneIcon,
} from '../icons/AppIcons.jsx';
import { useTools } from './ToolsContext.jsx';
import TunerPopover from './TunerPopover.jsx';
import MetronomePopover from './MetronomePopover.jsx';
import RecordingBadge from './RecordingBadge.jsx';
import ShareDialog from './ShareDialog.jsx';
import './globalTools.css';

export default function GlobalTools() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'tuner' | 'metronome'
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const { pathname } = useLocation();
  const {
    recordingState,
    startRecording,
    stopRecording,
    lastResult,
  } = useTools();

  // Close on route change
  useEffect(() => {
    setPanel(null);
    setOpen(false);
  }, [pathname]);

  // ESC closes everything
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (panel) setPanel(null);
      else if (open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, open]);

  // Click outside the FAB cluster + popover closes everything
  useEffect(() => {
    if (!open && !panel) return;
    const onDown = (e) => {
      const inCluster = containerRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inCluster && !inPopover) {
        setPanel(null);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, panel]);

  const togglePanel = (which) => {
    setPanel((p) => (p === which ? null : which));
  };

  const handleRecorderClick = () => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle') {
      startRecording();
    }
  };

  const recording = recordingState === 'recording';

  return (
    <>
      <div
        ref={containerRef}
        className={`gt-cluster ${open ? 'open' : ''}`}
        aria-label="כלים גלובליים"
      >
        {/* Main FAB */}
        <button
          type="button"
          className="gt-fab gt-fab-main"
          aria-label="כלים"
          aria-expanded={open}
          onClick={() => {
            setPanel(null);
            setOpen((v) => !v);
          }}
        >
          <WrenchIcon />
        </button>

        {/* Recording badge — clings beside the wrench while recording */}
        <RecordingBadge />

        {/* Mini FABs — fan arc */}
        <button
          type="button"
          className={`gt-fab gt-fab-mini gt-mini-tuner ${panel === 'tuner' ? 'is-active' : ''}`}
          aria-label="טיונר"
          tabIndex={open ? 0 : -1}
          onClick={() => togglePanel('tuner')}
        >
          <TuningForkIcon />
        </button>

        <button
          type="button"
          className={`gt-fab gt-fab-mini gt-mini-metro ${panel === 'metronome' ? 'is-active' : ''}`}
          aria-label="מטרונום"
          tabIndex={open ? 0 : -1}
          onClick={() => togglePanel('metronome')}
        >
          <MetronomeIcon />
        </button>

        <button
          type="button"
          className={`gt-fab gt-fab-mini gt-mini-rec ${recording ? 'is-recording' : ''}`}
          aria-label={recording ? 'עצור הקלטה' : 'הקלטת רעיון'}
          tabIndex={open ? 0 : -1}
          onClick={handleRecorderClick}
        >
          <MicrophoneIcon />
        </button>
      </div>

      {/* Popovers */}
      {panel && (
        <div ref={popoverRef} className="gt-popover-anchor">
          {panel === 'tuner' && <TunerPopover />}
          {panel === 'metronome' && <MetronomePopover />}
        </div>
      )}

      {/* Share dialog after recording */}
      {lastResult && <ShareDialog />}
    </>
  );
}
