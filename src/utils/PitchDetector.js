/**
 * Real-time pitch detection using Web Audio API autocorrelation.
 * Separate from Tone.js so it can coexist with AudioPlayer.
 */

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a frequency (Hz) to a musical note object.
 * Returns null if frequency is out of vocal/guitar range.
 */
export function frequencyToNote(freq) {
  if (!freq || freq < 60 || freq > 1600) return null;
  // MIDI note number: A4 = 440 Hz = MIDI 69
  const noteNum = 12 * Math.log2(freq / 440) + 69;
  const rounded  = Math.round(noteNum);
  if (rounded < 28 || rounded > 96) return null; // E1 … C7 — practical range
  const octave   = Math.floor(rounded / 12) - 1;
  const noteName = CHROMATIC_NOTES[((rounded % 12) + 12) % 12];
  const cents    = Math.round((noteNum - rounded) * 100); // −50 … +50
  return { noteName, octave, fullNote: `${noteName}${octave}`, midiNote: rounded, cents };
}

/**
 * Autocorrelation pitch detector.
 * Usage:
 *   const det = new PitchDetector();
 *   await det.start(freq => console.log(freq)); // starts mic
 *   det.stop();                                   // releases mic
 */
export class PitchDetector {
  constructor() {
    this._ctx    = null;
    this._analyser = null;
    this._stream   = null;
    this._source   = null;
    this._buf      = null;
    this._running  = false;
    this._rafId    = null;
  }

  async start(onFrequency) {
    if (this._running) return;

    this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 4096;
    this._analyser.smoothingTimeConstant = 0;
    this._buf = new Float32Array(this._analyser.fftSize);

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this._source = this._ctx.createMediaStreamSource(this._stream);
    this._source.connect(this._analyser);

    this._running = true;
    this._loop(onFrequency);
  }

  _loop(cb) {
    if (!this._running) return;
    this._analyser.getFloatTimeDomainData(this._buf);
    const freq = this._autoCorrelate(this._buf, this._ctx.sampleRate);
    cb(freq > 0 ? freq : null);
    this._rafId = requestAnimationFrame(() => this._loop(cb));
  }

  /**
   * McLeod Pitch Method lite — autocorrelation with parabolic interpolation.
   * Returns frequency in Hz or −1 when signal is too quiet.
   */
  _autoCorrelate(buf, sr) {
    const SIZE = buf.length;

    // RMS gate — skip if too quiet
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.012) return -1;

    // Trim leading/trailing silence
    let r1 = 0, r2 = SIZE - 1;
    const THRESH = 0.2;
    for (let i = 0;     i < SIZE / 2; i++) { if (Math.abs(buf[i])       < THRESH) { r1 = i; break; } }
    for (let i = 1;     i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < THRESH) { r2 = SIZE - i; break; } }

    const slice = buf.slice(r1, r2);
    const n     = slice.length;
    if (n < 16) return -1;

    // Autocorrelation
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) c[i] += slice[j] * slice[j + i];
    }

    // Find first valley (skip initial descent)
    let d = 0;
    while (d < n - 1 && c[d] > c[d + 1]) d++;

    // Find maximum after valley
    let maxVal = -1, maxPos = -1;
    for (let i = d; i < n; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos < 1 || maxPos >= n - 1) return -1;

    // Parabolic interpolation for sub-sample accuracy
    let T0 = maxPos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 -= b / (2 * a);
    if (T0 <= 0) return -1;

    return sr / T0;
  }

  /** Release microphone and AudioContext immediately. */
  stop() {
    this._running = false;
    if (this._rafId)  { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    if (this._source) { this._source.disconnect(); this._source = null; }
    if (this._ctx)    { this._ctx.close().catch(() => {}); this._ctx = null; }
    this._analyser = null;
    this._buf      = null;
  }
}
