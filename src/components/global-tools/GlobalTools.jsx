/**
 * GlobalTools — floating FAB with a brass radial fan of 3 tools:
 *   Tuner · Metronome · Recorder
 *
 * Long-press (~450ms) the wrench → drag the FAB anywhere on the screen.
 * Position is persisted (localStorage) and survives navigation.
 * The fan + popovers open toward whichever side has more room, so they
 * never run off the screen.
 *
 * Click the wrench → 3 mini buttons fan out.
 * Click outside / ESC / route change → collapse.
 * Tuner & Metronome → open a compact popover anchored to the FAB cluster.
 * Recorder → toggles recording directly.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

const FAB_SIZE = 56;
const EDGE_PAD = 8;
const LONG_PRESS_MS = 450;
const DRAG_THRESHOLD_PX = 8;
const STORAGE_KEY = 'globalTools.position.v1';

function clampToViewport(x, y) {
  const maxX = window.innerWidth - FAB_SIZE - EDGE_PAD;
  const maxY = window.innerHeight - FAB_SIZE - EDGE_PAD;
  return {
    x: Math.max(EDGE_PAD, Math.min(maxX, x)),
    y: Math.max(EDGE_PAD, Math.min(maxY, y)),
  };
}

function readSavedPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x !== 'number' || typeof p?.y !== 'number') return null;
    return clampToViewport(p.x, p.y);
  } catch {
    return null;
  }
}

function computeFanDirection(centerX, centerY) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const horiz = centerX > w / 2 ? 'left' : 'right';
  const vert = centerY < h / 2 ? 'down' : 'up';
  return `${vert}-${horiz}`;
}

export default function GlobalTools() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'tuner' | 'metronome'
  const [position, setPosition] = useState(readSavedPosition);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const draggingRef = useRef(false);
  const dragEndAtRef = useRef(0);
  const activePointerIdRef = useRef(null);

  const { pathname } = useLocation();
  const {
    recordingState,
    startRecording,
    stopRecording,
    lastResult,
  } = useTools();

  // ─── Fan direction (recomputed on position change + window resize) ───
  const [fanTick, setFanTick] = useState(0);
  useEffect(() => {
    const onResize = () => {
      setFanTick((t) => t + 1);
      // Also re-clamp position so the FAB doesn't slip off-screen.
      setPosition((p) => (p ? clampToViewport(p.x, p.y) : p));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fanDirection = useMemo(() => {
    void fanTick;
    const cx = position
      ? position.x + FAB_SIZE / 2
      : 24 + FAB_SIZE / 2; // default bottom-left
    const cy = position
      ? position.y + FAB_SIZE / 2
      : window.innerHeight - 24 - FAB_SIZE / 2;
    return computeFanDirection(cx, cy);
  }, [position, fanTick]);

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

  // ─── Drag handling (long-press on main FAB) ───
  const beginDrag = useCallback(() => {
    draggingRef.current = true;
    setDragging(true);
    setOpen(false);
    setPanel(null);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      // offset from FAB top-left to the pointer
      offsetX: e.clientX - (position?.x ?? (24)),
      offsetY: e.clientY - (position?.y ?? (window.innerHeight - 24 - FAB_SIZE)),
    };
    activePointerIdRef.current = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}

    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      beginDrag();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (!pointerStartRef.current) return;
    const start = pointerStartRef.current;

    if (!draggingRef.current) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      // If the user moves before the long-press fires, treat as a non-drag
      // (a normal click will still resolve on pointer-up).
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
        cancelLongPress();
      }
      return;
    }

    // dragging — follow the pointer
    const next = clampToViewport(e.clientX - start.offsetX, e.clientY - start.offsetY);
    setPosition(next);
  };

  const endPointer = (e) => {
    cancelLongPress();
    try {
      if (activePointerIdRef.current != null) {
        e.currentTarget.releasePointerCapture?.(activePointerIdRef.current);
      }
    } catch {}
    activePointerIdRef.current = null;

    if (draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Persist whatever position is now in state.
      setPosition((p) => {
        if (p) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
        }
        return p;
      });
      // Mark drag-end time so the synthetic click that follows pointer-up
      // (mouse + touch both fire one) is swallowed.
      dragEndAtRef.current = Date.now();
    }
    pointerStartRef.current = null;
  };

  const handleMainClick = () => {
    if (Date.now() - dragEndAtRef.current < 120) return;
    setPanel(null);
    setOpen((v) => !v);
  };

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

  // Inline style: when the user has chosen a position, switch from the default
  // bottom-left anchoring to absolute top-left.
  const inlineStyle = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
    : undefined;

  return (
    <>
      <div
        ref={containerRef}
        className={`gt-cluster gt-fan-${fanDirection} ${open ? 'open' : ''} ${dragging ? 'is-dragging' : ''}`}
        aria-label="כלים גלובליים"
        style={inlineStyle}
      >
        {/* Main FAB */}
        <button
          type="button"
          className="gt-fab gt-fab-main"
          aria-label="כלים — החזק כדי להזיז"
          aria-expanded={open}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onClick={handleMainClick}
          onContextMenu={(e) => e.preventDefault()}
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

        {/* Popovers — anchored inside the cluster so they follow drag */}
        {panel && (
          <div ref={popoverRef} className="gt-popover-anchor">
            {panel === 'tuner' && <TunerPopover />}
            {panel === 'metronome' && <MetronomePopover />}
          </div>
        )}
      </div>

      {/* Share dialog after recording */}
      {lastResult && <ShareDialog />}
    </>
  );
}
