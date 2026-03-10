/**
 * Rhythm Onset Detector
 *
 * Detects note onsets from microphone using spectral flux.
 * Pre-started before the audio session begins, so there is zero latency
 * when the recording phase starts.
 *
 * Usage:
 *   const det = new RhythmOnsetDetector({ fluxThreshold: 8, latencyCompMs: 65 });
 *   await det.start();          // start mic early (before session)
 *   // ... at start of recording phase:
 *   det.markRecordingStart();   // stamp the recording window start
 *   // ... at end of recording:
 *   const onsets = det.getRecordingOnsets();     // ms from recording start (compensated)
 *   const raw    = det.getRawRecordingOnsets();  // [{time, flux}] — no comp, for calibration
 *   det.stop();
 */

const FFT_SIZE           = 256;
const MIN_INTER_ONSET_MS = 80;

// Defaults — overridden per-instance via constructor options
const DEFAULT_FLUX_THRESHOLD  = 8;   // aggressively low for finger taps
const DEFAULT_LATENCY_COMP_MS = 65;  // measured mean pipeline delay

export class RhythmOnsetDetector {
  constructor({ fluxThreshold = DEFAULT_FLUX_THRESHOLD, latencyCompMs = DEFAULT_LATENCY_COMP_MS } = {}) {
    this._fluxThreshold = fluxThreshold;
    this._latencyCompMs = latencyCompMs;

    this._ctx      = null;
    this._analyser = null;
    this._stream   = null;
    this._source   = null;
    this._running  = false;
    this._rafId    = null;

    this._allOnsets       = [];   // [{time: ms, flux: number}]
    this._startTime       = 0;
    this._lastOnsetTime   = -Infinity;
    this._prevBuffer      = null;

    this._recordingStartMs = null; // set by markRecordingStart()
  }

  async start() {
    if (this._running) return;

    this._ctx      = new (window.AudioContext || window.webkitAudioContext)();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = FFT_SIZE;
    this._analyser.smoothingTimeConstant = 0.3;

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this._source = this._ctx.createMediaStreamSource(this._stream);
    this._source.connect(this._analyser);

    this._allOnsets     = [];
    this._startTime     = this._ctx.currentTime;
    this._lastOnsetTime = -Infinity;
    this._prevBuffer    = new Uint8Array(this._analyser.frequencyBinCount);
    this._recordingStartMs = null;

    this._running = true;
    this._loop();
  }

  /** Call this at the exact moment recording begins. */
  markRecordingStart() {
    if (!this._ctx) return;
    this._recordingStartMs = (this._ctx.currentTime - this._startTime) * 1000;
  }

  /**
   * Returns onsets after markRecordingStart(), relative to that mark (ms).
   * LATENCY_COMP is subtracted and result is clamped to ≥ 0.
   */
  getRecordingOnsets() {
    if (this._recordingStartMs === null) return [];
    const comp = ((this._ctx?.baseLatency ?? 0) * 1000) + this._latencyCompMs;
    return this._allOnsets
      .filter(o => o.time >= this._recordingStartMs)
      .map(o => Math.max(0, o.time - this._recordingStartMs - comp));
  }

  /**
   * Raw recording onsets — no latency compensation applied.
   * Returns [{time: ms, flux: number}] relative to markRecordingStart().
   * Used by calibration to measure the true pipeline delay.
   */
  getRawRecordingOnsets() {
    if (this._recordingStartMs === null) return [];
    return this._allOnsets
      .filter(o => o.time >= this._recordingStartMs)
      .map(o => ({ time: Math.round(o.time - this._recordingStartMs), flux: o.flux }));
  }

  stop() {
    this._running = false;
    if (this._rafId)  { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this._source) { this._source.disconnect(); this._source = null; }
    if (this._ctx)    { this._ctx.close().catch(() => {}); this._ctx = null; }
    this._analyser = null;
    this._prevBuffer = null;
  }

  get isRunning() { return this._running; }

  /** Returns current RMS audio level (0–1). Use for VU meter display. */
  getLevel() {
    if (!this._analyser || !this._running) return 0;
    const buf = new Uint8Array(this._analyser.fftSize);
    this._analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  _loop() {
    if (!this._running) return;

    const buf = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteFrequencyData(buf);

    // Spectral flux: sum of positive bin differences vs last frame
    let flux = 0;
    for (let i = 0; i < buf.length; i++) {
      const diff = buf[i] - this._prevBuffer[i];
      if (diff > 0) flux += diff;
    }
    flux /= buf.length;

    const nowMs = (this._ctx.currentTime - this._startTime) * 1000;
    if (flux > this._fluxThreshold && (nowMs - this._lastOnsetTime) > MIN_INTER_ONSET_MS) {
      this._allOnsets.push({ time: Math.round(nowMs), flux });
      this._lastOnsetTime = nowMs;
    }

    this._prevBuffer.set(buf);
    this._rafId = requestAnimationFrame(() => this._loop());
  }
}
