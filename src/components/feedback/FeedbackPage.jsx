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
  // mp4 first — WhatsApp and most share targets support it; webm as fallback
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
      // Fall through to <a download>
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

// ─── LevelMeter ───────────────────────────────────────────────

const LevelMeter = ({ stream }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!stream) return;
    let audioCtx;
    try {
      audioCtx = new AudioContext();
    } catch {
      return;
    }

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
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.fillRect(0, 0, w, h);
      if (level > 0) {
        const barW = (w - 4) * level;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#4CAF50');
        grad.addColorStop(0.65, '#FFC107');
        grad.addColorStop(1, '#F44336');
        ctx.fillStyle = grad;
        ctx.fillRect(2, 2, barW, h - 4);
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
      <button
        className="fb-meter-help"
        onClick={() => setShowTip(v => !v)}
        aria-label="עזרה עם מד הרמות"
      >
        ?
      </button>
      {showTip && (
        <div className="fb-meter-tip">
          נגן כמה אקורדים ובדוק שהבר קופץ גבוה יותר כשאתה מנגן מאשר כשאתה שותק.
          אם הבר תמיד גבוה גם בלי גיטרה — הנמך את עוצמת הבאקינג.
          אם הבר בקושי זז כשאתה מנגן — התקרב עם המכשיר או הגבר את הגיטרה.
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
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const onPointerDown = (e) => {
    if (e.target.closest('.fb-pip-switch')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = pipRef.current.getBoundingClientRect();
    drag.current = {
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
    };
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const pip = pipRef.current;
    const l = Math.max(0, Math.min(e.clientX - drag.current.ox, window.innerWidth - pip.offsetWidth));
    const t = Math.max(0, Math.min(e.clientY - drag.current.oy, window.innerHeight - pip.offsetHeight));
    pip.style.left = l + 'px';
    pip.style.top = t + 'px';
    pip.style.right = 'auto';
    pip.style.bottom = 'auto';
  };

  const onPointerUp = () => { drag.current = null; };

  return (
    <div
      ref={pipRef}
      className="fb-pip"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <video
        ref={videoRef}
        className="fb-pip-video"
        autoPlay
        playsInline
        muted
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
      />
      {canSwitch && (
        <button className="fb-pip-switch" onClick={onSwitch} title="החלף מצלמה">
          🔄
        </button>
      )}
    </div>
  );
};

// ─── PrepScreen ───────────────────────────────────────────────

const PrepScreen = ({ onContinue }) => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const id = extractYouTubeId(url.trim());
    if (!id) {
      setError('נא להזין קישור YouTube תקין');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      onContinue({ youtubeId: id, stream });
    } catch (err) {
      let msg = 'שגיאה בגישה למצלמה/מיקרופון.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'הרשאות מצלמה/מיקרופון נדחו. אפשר הרשאות בהגדרות הדפדפן ונסה שוב.';
      } else if (err.name === 'NotFoundError') {
        msg = 'לא נמצאה מצלמה או מיקרופון במכשיר.';
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fb-prep-screen">
      <button className="fb-nav-back" onClick={() => navigate('/')}>← בית</button>
      <div className="fb-prep-card">
        <div className="fb-prep-icon">📹</div>
        <h1 className="fb-prep-title">פידבק</h1>
        <p className="fb-prep-subtitle">הקלט את עצמך מנגן על גבי באקינג טראק ושלח למורה</p>

        <div className="fb-field">
          <label className="fb-label" htmlFor="yt-url">קישור YouTube לבאקינג טראק</label>
          <input
            id="yt-url"
            className="fb-input"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            dir="ltr"
            autoComplete="off"
          />
        </div>

        <div className="fb-notice">
          🔊 וודא שהבאקינג טראק יוצא מהרמקול של המכשיר ולא מאוזניות —
          המיקרופון צריך לקלוט גם אותו
        </div>

        {error && <div className="fb-error">{error}</div>}

        <button
          className="fb-continue-btn"
          onClick={handleContinue}
          disabled={loading || !url.trim()}
        >
          {loading ? 'מבקש הרשאות...' : 'המשך →'}
        </button>
      </div>
    </div>
  );
};

// ─── RecordingScreen ──────────────────────────────────────────

const RecordingScreen = ({ youtubeId, stream: initStream, onFinished, onBack }) => {
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

  // Check for multiple cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => setCanSwitch(devices.filter(d => d.kind === 'videoinput').length > 1))
      .catch(() => {});
  }, []);

  // YouTube IFrame API
  useEffect(() => {
    let destroyed = false;

    const init = () => {
      if (destroyed || !ytDivRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytDivRef.current, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      destroyed = true;
      try { ytPlayerRef.current?.destroy(); } catch {}
      ytPlayerRef.current = null;
    };
  }, [youtubeId]);

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRec = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mime = getSupportedMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch (e) {
        alert('הדפדפן אינו תומך בהקלטת וידאו: ' + e.message);
        return;
      }
    }

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const finalMime = recorder.mimeType || mime || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      onFinished(blob, finalMime);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(n => n + 1), 1000);
  };

  const stopRec = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: true,
      });
      stream.getVideoTracks().forEach(t => t.stop());
      setStream(newStream);
      setFacingMode(newFacing);
    } catch (e) {
      console.error('Camera switch failed:', e);
    }
  };

  const goFullscreen = () => {
    const el = document.querySelector('.fb-yt-wrapper');
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  };

  return (
    <div className="fb-recording-screen">
      {/* YouTube area */}
      <div className="fb-yt-wrapper">
        <div ref={ytDivRef} className="fb-yt-div" />
        <button className="fb-fullscreen-btn" onClick={goFullscreen} title="מסך מלא">⛶</button>
      </div>

      {/* Level meter */}
      <LevelMeter stream={stream} />

      {/* Self-view PiP */}
      <CameraPiP
        stream={stream}
        onSwitch={switchCamera}
        canSwitch={canSwitch && !isRecording}
        mirrored={facingMode === 'user'}
      />

      {/* Recording timer */}
      {isRecording && <div className="fb-timer">{formatTime(elapsed)}</div>}

      {/* REC button */}
      <div className="fb-rec-area">
        <button
          className={`fb-rec-btn${isRecording ? ' fb-rec-btn--rec' : ''}`}
          onClick={isRecording ? stopRec : startRec}
          aria-label={isRecording ? 'עצור הקלטה' : 'התחל הקלטה'}
        />
      </div>

      {/* Back button (hidden while recording) */}
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
      try {
        await navigator.share({ files: [file], title: 'פידבק לגיטרה' });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    }
    // Fallback: download
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
          <button className="fb-share-btn" onClick={handleShare}>
            📤 שלח למישר
          </button>
          <button
            className={`fb-save-btn${saved ? ' fb-save-btn--done' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? '✓ נשמר למכשיר' : saving ? 'שומר...' : '💾 שמור למכשיר'}
          </button>
          <button className="fb-again-btn" onClick={onRecordAgain}>
            🔄 הקלט שוב
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FeedbackPage (main) ──────────────────────────────────────

const FeedbackPage = () => {
  const [step, setStep] = useState('prep');
  const [youtubeId, setYoutubeId] = useState('');
  const [stream, setStream] = useState(null);
  const [blob, setBlob] = useState(null);
  const [mimeType, setMimeType] = useState('video/webm');

  const handlePrepDone = ({ youtubeId: id, stream: s }) => {
    setYoutubeId(id);
    setStream(s);
    setStep('recording');
  };

  const handleRecordDone = (b, mime) => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setBlob(b);
    setMimeType(mime);
    setStep('preview');
  };

  const handleBack = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setStep('prep');
  };

  const handleRecordAgain = async () => {
    setBlob(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      setStep('recording');
    } catch (e) {
      alert('לא ניתן לגשת למצלמה: ' + e.message);
    }
  };

  return (
    <div className="fb-page">
      {step === 'prep' && (
        <PrepScreen onContinue={handlePrepDone} />
      )}
      {step === 'recording' && stream && (
        <RecordingScreen
          youtubeId={youtubeId}
          stream={stream}
          onFinished={handleRecordDone}
          onBack={handleBack}
        />
      )}
      {step === 'preview' && blob && (
        <PreviewScreen blob={blob} mimeType={mimeType} onRecordAgain={handleRecordAgain} />
      )}
    </div>
  );
};

export default FeedbackPage;
