import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FeedbackPage.css';

// ─── Utilities ────────────────────────────────────────────────

function extractYouTubeId(url) {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

async function saveToDevice(blob, mimeType) {
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const filename = `guitar-feedback-${Date.now()}.${ext}`;
  const baseMime = mimeType.split(';')[0];
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Video', accept: { [baseMime]: [`.${ext}`] } }],
      });
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return true;
}

function loadYouTubeApi(onReady) {
  if (window.YT?.Player) { onReady(); return; }
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  window.onYouTubeIframeAPIReady = onReady;
}

// ─── LevelMeter ───────────────────────────────────────────────

const LevelMeter = ({ stream }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!stream) return;
    let audioCtx;
    try { audioCtx = new AudioContext(); } catch { return; }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const level = Math.min(avg / 80, 1);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.fillRect(0, 0, w, h);
      if (level > 0) {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#4CAF50');
        grad.addColorStop(0.65, '#FFC107');
        grad.addColorStop(1, '#F44336');
        ctx.fillStyle = grad;
        ctx.fillRect(2, 2, (w - 4) * level, h - 4);
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtx.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div className="fb-meter-wrap">
      <canvas ref={canvasRef} className="fb-meter-canvas" width={160} height={18} />
      <button className="fb-meter-help" onClick={() => setShowTip(v => !v)} aria-label="עזרה">?</button>
      {showTip && (
        <div className="fb-meter-tip">
          נגן כמה אקורדים ובדוק שהבר קופץ גבוה יותר כשאתה מנגן מאשר כשאתה שותק.
          אם הבר תמיד גבוה גם בלי גיטרה — הנמך את עוצמת הבאקינג.
          אם הבר בקושי זז — התקרב עם המכשיר או הגבר את הגיטרה.
        </div>
      )}
    </div>
  );
};

// ─── CameraPiP ────────────────────────────────────────────────

const CameraPiP = ({ stream, onSwitch, canSwitch, mirrored }) => {
  const videoRef = useRef(null);
  const pipRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const onPointerDown = (e) => {
    if (e.target.closest('.fb-pip-switch')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = pipRef.current.getBoundingClientRect();
    drag.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const pip = pipRef.current;
    const l = Math.max(0, Math.min(e.clientX - drag.current.ox, window.innerWidth - pip.offsetWidth));
    const t = Math.max(0, Math.min(e.clientY - drag.current.oy, window.innerHeight - pip.offsetHeight));
    pip.style.left = l + 'px'; pip.style.top = t + 'px';
    pip.style.right = 'auto'; pip.style.bottom = 'auto';
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div ref={pipRef} className="fb-pip"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <video ref={videoRef} className="fb-pip-video" autoPlay playsInline muted
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }} />
      {canSwitch && (
        <button className="fb-pip-switch" onClick={onSwitch} title="החלף מצלמה">🔄</button>
      )}
    </div>
  );
};

// ─── ZoomableImage ────────────────────────────────────────────

const ZoomableImage = ({ src }) => {
  const imgRef = useRef(null);
  const t = useRef({ scale: 1, tx: 0, ty: 0 });
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);

  const apply = () => {
    if (imgRef.current) {
      const { scale, tx, ty } = t.current;
      imgRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
  };
  const reset = () => { t.current = { scale: 1, tx: 0, ty: 0 }; apply(); };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), scale0: t.current.scale };
      panRef.current = null;
    } else if (e.touches.length === 1) {
      panRef.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, tx0: t.current.tx, ty0: t.current.ty };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      t.current.scale = Math.max(1, Math.min(6, pinchRef.current.scale0 * (dist / pinchRef.current.dist)));
      if (t.current.scale <= 1.01) { t.current.tx = 0; t.current.ty = 0; }
      apply();
    } else if (e.touches.length === 1 && panRef.current && t.current.scale > 1) {
      t.current.tx = panRef.current.tx0 + (e.touches[0].clientX - panRef.current.x0);
      t.current.ty = panRef.current.ty0 + (e.touches[0].clientY - panRef.current.y0);
      apply();
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      panRef.current = null;
      const now = Date.now();
      if (now - lastTapRef.current < 300) reset();
      lastTapRef.current = now;
    }
  };
  const onWheel = (e) => {
    e.preventDefault();
    t.current.scale = Math.max(1, Math.min(6, t.current.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    if (t.current.scale <= 1.01) { t.current.tx = 0; t.current.ty = 0; }
    apply();
  };

  return (
    <div className="fb-diagram-viewer"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onWheel={onWheel} onDoubleClick={reset}>
      <img ref={imgRef} src={src} className="fb-diagram-img" alt="diagram" draggable={false} />
      <div className="fb-diagram-hint">זום: פינץ׳ / גלגלת • דאבל-טאפ לאיפוס</div>
    </div>
  );
};

// ─── DiagramViewer ────────────────────────────────────────────

const DiagramViewer = ({ source }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    if (source instanceof File) {
      const url = URL.createObjectURL(source);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [source]);

  const srcUrl = source instanceof File ? blobUrl : source;
  const isImage = source instanceof File
    ? source.type.startsWith('image/')
    : /\.(jpg|jpeg|png|gif|webp|svg)/i.test((source || '').split('?')[0]);

  if (!srcUrl) return null;
  if (isImage) return <ZoomableImage src={srcUrl} />;
  return (
    <div className="fb-diagram-viewer">
      <iframe src={srcUrl} className="fb-diagram-iframe" title="diagram" />
    </div>
  );
};

// ─── YouTubePip ───────────────────────────────────────────────

const getYtPos = () => {
  try { const s = localStorage.getItem('fb-yt-pos'); if (s) return JSON.parse(s); } catch {}
  return { x: 12, y: 12 };
};
const getYtSize = () => {
  try { const s = localStorage.getItem('fb-yt-size'); if (s) return JSON.parse(s); } catch {}
  return { w: 240, h: 135 };
};

const YouTubePip = ({ youtubeId }) => {
  const pipRef = useRef(null);
  const divRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const [resizeMode, setResizeMode] = useState(false);
  const posRef = useRef(getYtPos());
  const sizeRef = useRef(getYtSize());
  const dragRef = useRef(null);
  const longPressRef = useRef(null);
  const resizeRef = useRef(null);

  const applyPosSize = () => {
    const pip = pipRef.current;
    if (!pip) return;
    pip.style.left = posRef.current.x + 'px';
    pip.style.top = posRef.current.y + 'px';
    pip.style.width = sizeRef.current.w + 'px';
    pip.style.height = sizeRef.current.h + 'px';
    pip.style.right = 'auto';
    pip.style.bottom = 'auto';
  };

  useEffect(() => { applyPosSize(); }, []);

  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi(() => {
      if (destroyed || !divRef.current) return;
      ytPlayerRef.current = new window.YT.Player(divRef.current, {
        videoId: youtubeId,
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      });
    });
    return () => {
      destroyed = true;
      try { ytPlayerRef.current?.destroy(); } catch {}
      ytPlayerRef.current = null;
    };
  }, [youtubeId]);

  // Exit resize mode on outside tap
  useEffect(() => {
    if (!resizeMode) return;
    const handler = (e) => {
      if (!pipRef.current?.contains(e.target)) {
        setResizeMode(false);
        save();
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [resizeMode]);

  const save = () => {
    localStorage.setItem('fb-yt-pos', JSON.stringify(posRef.current));
    localStorage.setItem('fb-yt-size', JSON.stringify(sizeRef.current));
  };

  // Drag handlers (move pip)
  const onPipDown = (e) => {
    if (e.target.closest('.fb-yt-handle')) return;
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      setResizeMode(true);
    }, 500);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { ox: e.clientX - posRef.current.x, oy: e.clientY - posRef.current.y };
  };
  const onPipMove = (e) => {
    if (!dragRef.current || resizeMode) return;
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    const x = Math.max(0, Math.min(e.clientX - dragRef.current.ox, window.innerWidth - sizeRef.current.w));
    const y = Math.max(0, Math.min(e.clientY - dragRef.current.oy, window.innerHeight - sizeRef.current.h));
    posRef.current = { x, y };
    const pip = pipRef.current;
    pip.style.left = x + 'px'; pip.style.top = y + 'px';
    pip.style.right = 'auto'; pip.style.bottom = 'auto';
  };
  const onPipUp = () => {
    clearTimeout(longPressRef.current);
    longPressRef.current = null;
    dragRef.current = null;
    save();
  };

  // Corner resize handlers
  const onHandleDown = (e, corner) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      corner, startX: e.clientX, startY: e.clientY,
      startW: sizeRef.current.w, startH: sizeRef.current.h,
      startPX: posRef.current.x, startPY: posRef.current.y,
    };
  };
  const onHandleMove = (e, corner) => {
    const r = resizeRef.current;
    if (!r || r.corner !== corner) return;
    const dx = e.clientX - r.startX, dy = e.clientY - r.startY;
    const MIN_W = 160, MIN_H = 90;
    let w = r.startW, h = r.startH, x = r.startPX, y = r.startPY;
    if (corner === 'se') { w = Math.max(MIN_W, r.startW + dx); h = Math.max(MIN_H, r.startH + dy); }
    if (corner === 'sw') { w = Math.max(MIN_W, r.startW - dx); h = Math.max(MIN_H, r.startH + dy); x = r.startPX + (r.startW - w); }
    if (corner === 'ne') { w = Math.max(MIN_W, r.startW + dx); h = Math.max(MIN_H, r.startH - dy); y = r.startPY + (r.startH - h); }
    if (corner === 'nw') { w = Math.max(MIN_W, r.startW - dx); h = Math.max(MIN_H, r.startH - dy); x = r.startPX + (r.startW - w); y = r.startPY + (r.startH - h); }
    sizeRef.current = { w, h }; posRef.current = { x, y };
    const pip = pipRef.current;
    pip.style.width = w + 'px'; pip.style.height = h + 'px';
    pip.style.left = x + 'px'; pip.style.top = y + 'px';
  };
  const onHandleUp = () => { resizeRef.current = null; save(); };

  return (
    <div ref={pipRef} className={`fb-yt-pip${resizeMode ? ' fb-yt-pip--resize' : ''}`}
      onPointerDown={onPipDown} onPointerMove={onPipMove}
      onPointerUp={onPipUp} onPointerCancel={onPipUp}>
      <div className="fb-yt-pip-inner">
        <div ref={divRef} className="fb-yt-pip-player" />
      </div>
      {resizeMode && ['nw', 'ne', 'sw', 'se'].map(corner => (
        <div key={corner} className={`fb-yt-handle fb-yt-handle--${corner}`}
          onPointerDown={(e) => onHandleDown(e, corner)}
          onPointerMove={(e) => onHandleMove(e, corner)}
          onPointerUp={onHandleUp} onPointerCancel={onHandleUp} />
      ))}
    </div>
  );
};

// ─── PrepScreen ───────────────────────────────────────────────

const PrepScreen = ({ onContinue }) => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramUrl, setDiagramUrl] = useState('');
  const [diagramTab, setDiagramTab] = useState('file');

  const handleContinue = async () => {
    const id = extractYouTubeId(url.trim());
    if (!id) { setError('נא להזין קישור YouTube תקין'); return; }
    setError(''); setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const diagramSource = diagramFile || diagramUrl.trim() || null;
      onContinue({ youtubeId: id, stream, diagramSource });
    } catch (err) {
      let msg = 'שגיאה בגישה למצלמה/מיקרופון.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        msg = 'הרשאות מצלמה/מיקרופון נדחו. אפשר הרשאות בהגדרות הדפדפן ונסה שוב.';
      else if (err.name === 'NotFoundError')
        msg = 'לא נמצאה מצלמה או מיקרופון במכשיר.';
      setError(msg); setLoading(false);
    }
  };

  return (
    <div className="fb-prep-screen">
      <button className="fb-nav-back" onClick={() => navigate('/')}>← בית</button>
      <div className="fb-prep-card">
        <div className="fb-prep-icon">📹</div>
        <h1 className="fb-prep-title">פידבק</h1>
        <p className="fb-prep-subtitle">הקלט את עצמך מנגן על גבי באקינג טראק ושלח למישר</p>

        <div className="fb-field">
          <label className="fb-label" htmlFor="yt-url">קישור YouTube לבאקינג טראק</label>
          <input id="yt-url" className="fb-input" type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            dir="ltr" autoComplete="off" />
        </div>

        <div className="fb-field">
          <label className="fb-label">
            דיאגרמה <span className="fb-optional">(אופציונלי)</span>
          </label>
          <div className="fb-tab-row">
            <button className={`fb-tab${diagramTab === 'file' ? ' fb-tab--active' : ''}`}
              onClick={() => setDiagramTab('file')}>העלה קובץ</button>
            <button className={`fb-tab${diagramTab === 'url' ? ' fb-tab--active' : ''}`}
              onClick={() => setDiagramTab('url')}>קישור</button>
          </div>
          {diagramTab === 'file' ? (
            <label className={`fb-file-btn${diagramFile ? ' fb-file-btn--done' : ''}`}>
              {diagramFile ? `✓ ${diagramFile.name}` : '📎 בחר תמונה או PDF'}
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => setDiagramFile(e.target.files[0] || null)} />
            </label>
          ) : (
            <input className="fb-input" type="url"
              placeholder="קישור לתמונה או Google Drive..."
              value={diagramUrl} onChange={e => setDiagramUrl(e.target.value)} dir="ltr" />
          )}
        </div>

        <div className="fb-notice">
          🔊 וודא שהבאקינג טראק יוצא מהרמקול של המכשיר ולא מאוזניות —
          המיקרופון צריך לקלוט גם אותו
        </div>

        {error && <div className="fb-error">{error}</div>}
        <button className="fb-continue-btn" onClick={handleContinue}
          disabled={loading || !url.trim()}>
          {loading ? 'מבקש הרשאות...' : 'המשך →'}
        </button>
      </div>
    </div>
  );
};

// ─── RecordingScreen ──────────────────────────────────────────

const RecordingScreen = ({ youtubeId, stream: initStream, diagramSource, onFinished, onBack }) => {
  const [stream, setStream] = useState(initStream);
  const [facingMode, setFacingMode] = useState('user');
  const [canSwitch, setCanSwitch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const ytDivRef = useRef(null);
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => setCanSwitch(devices.filter(d => d.kind === 'videoinput').length > 1))
      .catch(() => {});
  }, []);

  // Full-screen YouTube (only when no diagram)
  useEffect(() => {
    if (diagramSource) return;
    let destroyed = false;
    loadYouTubeApi(() => {
      if (destroyed || !ytDivRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytDivRef.current, {
        videoId: youtubeId, width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      });
    });
    return () => {
      destroyed = true;
      try { ytPlayerRef.current?.destroy(); } catch {}
      ytPlayerRef.current = null;
    };
  }, [youtubeId, diagramSource]);

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRec = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mime = getSupportedMimeType();
    let recorder;
    try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {}); }
    catch { try { recorder = new MediaRecorder(stream); } catch (e) { alert('הדפדפן אינו תומך בהקלטת וידאו: ' + e.message); return; } }
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const finalMime = recorder.mimeType || mime || 'video/webm';
      onFinished(new Blob(chunksRef.current, { type: finalMime }), finalMime);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true); setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(n => n + 1), 1000);
  };

  const stopRec = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
    setIsRecording(false);
  };

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: true });
      stream.getVideoTracks().forEach(t => t.stop());
      setStream(newStream); setFacingMode(newFacing);
    } catch (e) { console.error('Camera switch:', e); }
  };

  const goFullscreen = () => {
    const el = document.querySelector('.fb-yt-wrapper');
    if (!el) return;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  };

  return (
    <div className="fb-recording-screen">
      {diagramSource ? (
        <>
          <DiagramViewer source={diagramSource} />
          <YouTubePip youtubeId={youtubeId} />
        </>
      ) : (
        <div className="fb-yt-wrapper">
          <div ref={ytDivRef} className="fb-yt-div" />
          <button className="fb-fullscreen-btn" onClick={goFullscreen} title="מסך מלא">⛶</button>
        </div>
      )}

      <LevelMeter stream={stream} />
      <CameraPiP stream={stream} onSwitch={switchCamera}
        canSwitch={canSwitch && !isRecording} mirrored={facingMode === 'user'} />

      {isRecording && <div className="fb-timer">{formatTime(elapsed)}</div>}

      <div className="fb-rec-area">
        <button className={`fb-rec-btn${isRecording ? ' fb-rec-btn--rec' : ''}`}
          onClick={isRecording ? stopRec : startRec}
          aria-label={isRecording ? 'עצור הקלטה' : 'התחל הקלטה'} />
      </div>

      {!isRecording && (
        <button className="fb-back-btn" onClick={onBack}>← חזרה</button>
      )}
    </div>
  );
};

// ─── PreviewScreen ────────────────────────────────────────────

const PreviewScreen = ({ blob, mimeType, onRecordAgain }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const urlRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

  useEffect(() => {
    urlRef.current = URL.createObjectURL(blob);
    if (videoRef.current) videoRef.current.src = urlRef.current;
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [blob]);

  const handleShare = async () => {
    const file = new File([blob], `guitar-feedback.${ext}`, { type: mimeType.split(';')[0] });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'פידבק לגיטרה' }); return; }
      catch (e) { if (e.name !== 'AbortError') console.error(e); }
    }
    handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveToDevice(blob, mimeType);
    setSaving(false);
    if (ok) setSaved(true);
  };

  return (
    <div className="fb-preview-screen">
      <button className="fb-nav-back" onClick={() => navigate('/')}>← בית</button>
      <div className="fb-preview-card">
        <h2 className="fb-preview-title">הצגה מקדימה</h2>
        <video ref={videoRef} className="fb-preview-video" controls playsInline />
        <div className="fb-preview-actions">
          <button className="fb-share-btn" onClick={handleShare}>📤 שלח למישר</button>
          <button className={`fb-save-btn${saved ? ' fb-save-btn--done' : ''}`}
            onClick={handleSave} disabled={saving}>
            {saved ? '✓ נשמר למכשיר' : saving ? 'שומר...' : '💾 שמור למכשיר'}
          </button>
          <button className="fb-again-btn" onClick={onRecordAgain}>🔄 הקלט שוב</button>
        </div>
      </div>
    </div>
  );
};

// ─── FeedbackPage ─────────────────────────────────────────────

const FeedbackPage = () => {
  const [step, setStep] = useState('prep');
  const [youtubeId, setYoutubeId] = useState('');
  const [stream, setStream] = useState(null);
  const [diagramSource, setDiagramSource] = useState(null);
  const [blob, setBlob] = useState(null);
  const [mimeType, setMimeType] = useState('video/webm');

  const handlePrepDone = ({ youtubeId: id, stream: s, diagramSource: ds }) => {
    setYoutubeId(id); setStream(s); setDiagramSource(ds); setStep('recording');
  };
  const handleRecordDone = (b, mime) => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setBlob(b); setMimeType(mime); setStep('preview');
  };
  const handleBack = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setStep('prep');
  };
  const handleRecordAgain = async () => {
    setBlob(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s); setStep('recording');
    } catch (e) { alert('לא ניתן לגשת למצלמה: ' + e.message); }
  };

  return (
    <div className="fb-page">
      {step === 'prep' && <PrepScreen onContinue={handlePrepDone} />}
      {step === 'recording' && stream && (
        <RecordingScreen youtubeId={youtubeId} stream={stream}
          diagramSource={diagramSource} onFinished={handleRecordDone} onBack={handleBack} />
      )}
      {step === 'preview' && blob && (
        <PreviewScreen blob={blob} mimeType={mimeType} onRecordAgain={handleRecordAgain} />
      )}
    </div>
  );
};

export default FeedbackPage;
