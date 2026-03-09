/**
 * Rhythm Onset Detector
 *
 * Detects note onsets from microphone using spectral flux.
 * Pre-started before the audio session begins, so there is zero latency
 * when the recording phase starts.
 *
 * Usage:
 *   const det = new RhythmOnsetDetector();
 *   await det.start();          // start mic early (before session)
 *   // ... at start of recording phase:
 *   det.markRecordingStart();   // stamp the recording window start
 *   // ... at end of recording:
 *   const onsets = det.getRecordingOnsets();  // ms from recording start
 *   det.stop();
 */

const FFT_SIZE           = 256;
const MIN_INTER_ONSET_MS = 80;
const FLUX_THRESHOLD     = 18;
const SMOOTHING          = 0.65;

export class RhythmOnsetDetector {
  constructor() {
    this._ctx      = null;
    this._analyser = null;
    this._stream   = null;
    this._source   = null;
    this._running  = false;
    this._rafId    = null;

    this._allOnsets       = [];   // all detected onsets in ms from start()
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
    this._analyser.smoothingTimeConstant = SMOOTHING;

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
   * Returns onsets that occurred after markRecordingStart(),
   * with timestamps relative to that mark (in ms).
   */
  getRecordingOnsets() {
    if (this._recordingStartMs === null) return [];
    return this._allOnsets
      .filter(t => t >= this._recordingStartMs)
      .map(t => t - this._recordingStartMs);
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
    if (flux > FLUX_THRESHOLD && (nowMs - this._lastOnsetTime) > MIN_INTER_ONSET_MS) {
      this._allOnsets.push(Math.round(nowMs));
      this._lastOnsetTime = nowMs;
    }

    this._prevBuffer.set(buf);
    this._rafId = requestAnimationFrame(() => this._loop());
  }
}
