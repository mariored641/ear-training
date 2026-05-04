import React, { useState, useRef } from 'react';

const AUDIO_C = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

const platform = () => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  return 'Desktop';
};

export default function FeedbackTestPage() {
  const [status, setStatus] = useState('idle');
  const [approach, setApproach] = useState('A');
  const [log, setLog] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);

  const startTest = async () => {
    setVideoUrl(null);
    setLog([]);
    addLog(`Platform: ${platform()}`);
    addLog(`Approach: ${approach}`);

    let micStream, tabStream;

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: AUDIO_C });
      const settings = micStream.getAudioTracks()[0]?.getSettings?.() ?? {};
      addLog(`Mic OK — echo:${settings.echoCancellation}, noise:${settings.noiseSuppression}, agc:${settings.autoGainControl}`);
    } catch (e) {
      addLog(`Mic error: ${e.message}`);
      return;
    }

    if (approach === 'B') {
      if (!navigator.mediaDevices.getDisplayMedia) {
        addLog('getDisplayMedia: NOT supported on this browser/platform');
      } else {
        try {
          tabStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
            preferCurrentTab: true,
          });
          addLog(`Tab capture OK — audio tracks: ${tabStream.getAudioTracks().length}`);
          if (tabStream.getAudioTracks().length === 0) {
            addLog('⚠️ Tab capture succeeded but no audio track — did you check "Share tab audio"?');
          }
        } catch (e) {
          addLog(`Tab capture failed: ${e.message}`);
        }
      }
    }

    // Build AudioContext for mixing + level meter
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    const micSrc = ctx.createMediaStreamSource(micStream);
    micSrc.connect(dest);
    micSrc.connect(analyser);
    addLog('Mic connected to mixer');

    if (tabStream?.getAudioTracks().length > 0) {
      const tabSrc = ctx.createMediaStreamSource(tabStream);
      tabSrc.connect(dest);
      tabSrc.connect(analyser);
      addLog('Tab audio connected to mixer ✓');
      tabStream.getVideoTracks().forEach(t => t.stop());
    }

    // Level meter
    const data = new Uint8Array(analyser.frequencyBinCount);
    const drawMeter = () => {
      rafRef.current = requestAnimationFrame(drawMeter);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const canvas = canvasRef.current;
      if (canvas) {
        const c = canvas.getContext('2d');
        c.clearRect(0, 0, canvas.width, canvas.height);
        c.fillStyle = avg > 3 ? '#4ade80' : '#ef4444';
        c.fillRect(0, 0, Math.min(avg * 5, canvas.width), canvas.height);
        c.fillStyle = '#fff';
        c.font = '11px monospace';
        c.fillText(`avg: ${avg.toFixed(1)}`, 4, 17);
      }
    };
    drawMeter();

    // Recording stream: video from camera, audio from mix
    const recordingStream = new MediaStream([
      ...micStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    recRef.current = new MediaRecorder(recordingStream, { mimeType: mime });
    recRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recRef.current.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      micStream.getTracks().forEach(t => t.stop());
      tabStream?.getTracks().forEach(t => t.stop());
      ctx.close();
      const blob = new Blob(chunksRef.current, { type: mime });
      setVideoUrl(URL.createObjectURL(blob));
      setStatus('done');
      addLog('Recording finished — play video below and listen');
    };

    recRef.current.start(500);
    setStatus('recording');
    addLog('▶ Recording 8 seconds — play your backing track now!');

    setTimeout(() => {
      if (recRef.current?.state !== 'inactive') {
        recRef.current.stop();
        setStatus('stopping');
        addLog('Stopping...');
      }
    }, 8000);
  };

  const stopEarly = () => {
    if (recRef.current?.state !== 'inactive') {
      recRef.current.stop();
      setStatus('stopping');
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh', direction: 'ltr' }}>
      <h2 style={{ marginTop: 0 }}>🔬 Feedback Recording Diagnostic</h2>

      <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <div><b>Platform:</b> {platform()}</div>
        <div><b>getDisplayMedia:</b> {navigator.mediaDevices?.getDisplayMedia ? '✅ supported' : '❌ not supported'}</div>
        <div><b>MediaRecorder:</b> {typeof MediaRecorder !== 'undefined' ? '✅ supported' : '❌ not supported'}</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 6 }}><b>Select approach to test:</b></div>
        {['A', 'B'].map(a => (
          <label key={a} style={{ display: 'block', marginBottom: 4, cursor: 'pointer' }}>
            <input type="radio" value={a} checked={approach === a}
              onChange={() => setApproach(a)} style={{ marginRight: 8 }} />
            {a === 'A'
              ? 'A — Mic only (echoCancellation:false)'
              : 'B — Mic + getDisplayMedia tab audio mix'}
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <canvas ref={canvasRef} width={300} height={24}
          style={{ background: '#1e293b', borderRadius: 4, display: 'block' }} />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Level meter — green = audio detected</div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button onClick={startTest} disabled={status === 'recording' || status === 'stopping'}
          style={{ padding: '10px 20px', fontSize: 15, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {status === 'recording' ? '⏺ Recording...' : status === 'stopping' ? 'Stopping...' : '▶ Start 8s Test'}
        </button>
        {status === 'recording' && (
          <button onClick={stopEarly}
            style={{ padding: '10px 20px', fontSize: 15, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            ⏹ Stop early
          </button>
        )}
      </div>

      {status === 'recording' && (
        <div style={{ background: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16, fontWeight: 'bold' }}>
          🎵 Play your YouTube backing track NOW — recording for 8 seconds...
        </div>
      )}

      {videoUrl && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#4ade80', fontWeight: 'bold' }}>
            ✅ Recording done — do you hear the backing track in this video?
          </div>
          <video src={videoUrl} controls playsInline
            style={{ maxWidth: '100%', maxHeight: 300, background: '#000', borderRadius: 8 }} />
        </div>
      )}

      <pre style={{ background: '#1e293b', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 300 }}>
        {log.length ? log.join('\n') : 'Press Start to begin test'}
      </pre>
    </div>
  );
}
