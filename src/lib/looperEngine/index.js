import { ToneLooperAdapter } from './toneAdapter';
import { MicrophoneRecorder, calculateWaveformPeaks } from './recorder';
import { renderMix } from './exporter';
import { clearStoredSession, loadLatestSession, saveSession } from './storage';
import {
  MAX_BPM,
  MAX_LOOP_BARS,
  MAX_TRACKS,
  MIN_BPM,
  createSession,
  createTrack,
} from './types';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cloneTrack(track) {
  return { ...track, waveformPeaks: [...(track.waveformPeaks || [])] };
}

class LooperEngine {
  constructor() {
    this.session = createSession();
    this.state = 'idle';
    this.activeRecordingTrackId = null;
    this.recordingStartedAt = 0;
    this.recordingTargetDuration = 0;
    this.adapter = null;
    this.recorder = null;
    this.initialized = false;
    this.listeners = new Set();
    this.tapTimes = [];
    this.undoEntry = null;
    this.stateTimer = null;
    this.autoStopTimer = null;
    this.saveTimer = null;
    this.finalizing = false;
    this.restorePromise = null;
    this.restored = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return {
      session: {
        ...this.session,
        timeSignature: [...this.session.timeSignature],
        tracks: this.session.tracks.map(cloneTrack),
      },
      engineState: this.state,
      activeRecordingTrackId: this.activeRecordingTrackId,
      canUndo: Boolean(this.undoEntry),
      initialized: this.initialized,
    };
  }

  #notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  #touchAndSave() {
    this.session = { ...this.session, updatedAt: new Date().toISOString() };
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      saveSession(this.session).catch(() => {});
    }, 500);
  }

  async restoreLatest() {
    if (this.restored) return this.session;
    if (this.restorePromise) return this.restorePromise;
    this.restorePromise = loadLatestSession()
      .then((saved) => {
        if (saved) {
          this.session = {
            ...createSession(),
            ...saved,
            timeSignature: saved.timeSignature || [4, 4],
            tracks: (saved.tracks || []).slice(0, MAX_TRACKS),
          };
          if (this.session.tracks.length && !this.session.loopLengthBars) {
            const [numerator, denominator] = this.session.timeSignature;
            const barDuration = (60 / this.session.bpm) * numerator * (4 / denominator);
            const audioDuration = this.session.tracks[0]?.audioData?.duration || 0;
            this.session = {
              ...this.session,
              loopLengthBars: clamp(
                Math.round(audioDuration / barDuration) || 1,
                1,
                MAX_LOOP_BARS,
              ),
            };
          }
          this.state = this.session.tracks.length ? 'stopped' : 'idle';
          this.#notify();
        }
        this.restored = true;
        return this.session;
      })
      .catch(() => {
        this.restored = true;
        return this.session;
      });
    return this.restorePromise;
  }

  async init({ requestMicrophone = false } = {}) {
    if (!this.adapter) this.adapter = new ToneLooperAdapter();
    await this.adapter.init();
    this.adapter.configure(this.session.bpm, this.session.timeSignature, this.session.clickVolume);
    this.adapter.setTracks(this.session.tracks, this.getLoopDuration());
    this.initialized = true;
    if (requestMicrophone) {
      if (!this.recorder) this.recorder = new MicrophoneRecorder(this.adapter.audioContext);
      await this.recorder.open();
    }
    this.#notify();
  }

  setBpm(value) {
    if (this.session.tracks.length || this.state === 'recording' || this.state === 'counting-in') return;
    const bpm = clamp(Math.round(Number(value) || this.session.bpm), MIN_BPM, MAX_BPM);
    this.session = { ...this.session, bpm };
    this.adapter?.configure(bpm, this.session.timeSignature, this.session.clickVolume);
    this.#touchAndSave();
    this.#notify();
  }

  setTimeSignature(numerator, denominator) {
    if (this.session.tracks.length || this.state === 'recording' || this.state === 'counting-in') return;
    const allowed = new Set(['4/4', '3/4', '6/8']);
    const signature = `${numerator}/${denominator}`;
    if (!allowed.has(signature)) return;
    this.session = { ...this.session, timeSignature: [numerator, denominator] };
    this.adapter?.configure(this.session.bpm, this.session.timeSignature, this.session.clickVolume);
    this.#touchAndSave();
    this.#notify();
  }

  setCountInBars(value) {
    const countInBars = clamp(Math.round(Number(value) || 0), 0, 2);
    this.session = { ...this.session, countInBars };
    this.#touchAndSave();
    this.#notify();
  }

  setClickVolume(value) {
    const clickVolume = clamp(Number(value), 0, 1);
    this.session = { ...this.session, clickVolume };
    this.adapter?.configure(this.session.bpm, this.session.timeSignature, clickVolume);
    this.#touchAndSave();
    this.#notify();
  }

  tapTempo() {
    const now = performance.now();
    if (this.tapTimes.length && now - this.tapTimes.at(-1) > 2000) this.tapTimes = [];
    this.tapTimes.push(now);
    this.tapTimes = this.tapTimes.slice(-5);
    if (this.tapTimes.length < 2) return this.session.bpm;
    const intervals = [];
    for (let i = 1; i < this.tapTimes.length; i += 1) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }
    const recent = intervals.slice(-4);
    const average = recent.reduce((sum, interval) => sum + interval, 0) / recent.length;
    const bpm = clamp(Math.round(60000 / average), MIN_BPM, MAX_BPM);
    this.setBpm(bpm);
    return bpm;
  }

  getLoopDuration() {
    return this.session.tracks[0]?.audioData?.duration
      || (this.session.loopLengthBars * this.#barDuration());
  }

  #barDuration() {
    const [numerator, denominator] = this.session.timeSignature;
    return (60 / this.session.bpm) * numerator * (4 / denominator);
  }

  async play() {
    if (!this.session.tracks.length) return;
    await this.init();
    this.adapter.play();
    this.state = 'playing';
    this.#notify();
  }

  stop() {
    if (this.state === 'recording') {
      this.stopRecordingTrack(this.activeRecordingTrackId).catch(() => {});
      return;
    }
    if (this.state === 'counting-in') {
      this.#cancelPendingRecording();
      return;
    }
    this.adapter?.stop();
    this.state = this.session.tracks.length ? 'stopped' : 'idle';
    this.#notify();
  }

  async startRecordingTrack(trackId) {
    if (this.state === 'counting-in' || this.state === 'recording' || this.finalizing) return;
    const existing = this.session.tracks.find((track) => track.id === trackId);
    if (!existing && this.session.tracks.length >= MAX_TRACKS) {
      throw new Error(`אפשר להקליט עד ${MAX_TRACKS} שכבות בסשן.`);
    }

    await this.init({ requestMicrophone: true });
    const id = trackId || globalThis.crypto?.randomUUID?.() || `track-${Date.now()}`;
    const countInDuration = this.session.countInBars * this.#barDuration();
    const startTime = this.adapter.now + countInDuration + this.adapter.startSafetySeconds;
    const loopDuration = this.getLoopDuration();

    this.adapter.stop();
    this.recorder.begin(startTime);
    this.adapter.scheduleCountIn(startTime, this.session.countInBars);
    this.adapter.startTransportAt(startTime);

    this.activeRecordingTrackId = id;
    this.recordingStartedAt = startTime;
    this.recordingTargetDuration = loopDuration;
    this.state = this.session.countInBars ? 'counting-in' : 'recording';
    this.finalizing = false;
    this.#clearRecordingTimers();

    const untilStartMs = Math.max(0, (startTime - this.adapter.now) * 1000);
    this.stateTimer = window.setTimeout(() => {
      if (this.activeRecordingTrackId === id && this.state === 'counting-in') {
        this.state = 'recording';
        this.#notify();
      }
    }, untilStartMs);

    const maxDuration = loopDuration || (MAX_LOOP_BARS * this.#barDuration());
    this.autoStopTimer = window.setTimeout(() => {
      this.stopRecordingTrack(id, true).catch(() => {});
    }, Math.max(0, (startTime + maxDuration - this.adapter.now) * 1000));

    this.#notify();
  }

  async stopRecordingTrack(trackId, reachedBoundary = false) {
    if (trackId !== this.activeRecordingTrackId || this.finalizing) return;
    if (this.state === 'counting-in') {
      this.#cancelPendingRecording();
      return;
    }
    this.finalizing = true;
    this.#clearRecordingTimers();

    const existingLoopDuration = this.getLoopDuration();
    let targetDuration;
    let loopBars = this.session.loopLengthBars;
    if (existingLoopDuration) {
      targetDuration = existingLoopDuration;
    } else {
      const elapsed = Math.max(0, this.adapter.now - this.recordingStartedAt);
      const rawBars = reachedBoundary
        ? MAX_LOOP_BARS
        : Math.round(elapsed / this.#barDuration());
      loopBars = clamp(rawBars || 1, 1, MAX_LOOP_BARS);
      targetDuration = loopBars * this.#barDuration();
    }

    const endTime = this.recordingStartedAt + targetDuration;
    this.adapter.stop(endTime > this.adapter.now ? endTime : undefined);

    try {
      const audioData = await this.recorder.stopAt(endTime, targetDuration);
      const existingIndex = this.session.tracks.findIndex((track) => track.id === trackId);
      const previousTrack = existingIndex >= 0 ? cloneTrack(this.session.tracks[existingIndex]) : null;
      const baseTrack = previousTrack || createTrack(trackId, this.session.tracks.length);
      const completedTrack = {
        ...baseTrack,
        id: trackId,
        audioData,
        waveformPeaks: calculateWaveformPeaks(audioData),
      };

      const tracks = [...this.session.tracks];
      if (existingIndex >= 0) tracks[existingIndex] = completedTrack;
      else tracks.push(completedTrack);
      tracks.sort((a, b) => a.order - b.order);

      this.undoEntry = { type: 'recording', trackId, previousTrack };
      this.session = { ...this.session, loopLengthBars: loopBars, tracks };
      this.#touchAndSave();
      this.adapter.setTracks(tracks, targetDuration);
      this.adapter.play();
      this.state = 'playing';
    } catch (error) {
      this.adapter?.stop();
      this.state = this.session.tracks.length ? 'stopped' : 'idle';
      throw error;
    } finally {
      this.activeRecordingTrackId = null;
      this.recordingStartedAt = 0;
      this.recordingTargetDuration = 0;
      this.finalizing = false;
      this.#notify();
    }
  }

  #cancelPendingRecording() {
    this.#clearRecordingTimers();
    this.recorder?.cancel();
    this.adapter?.stop();
    this.activeRecordingTrackId = null;
    this.recordingStartedAt = 0;
    this.recordingTargetDuration = 0;
    this.finalizing = false;
    this.state = this.session.tracks.length ? 'stopped' : 'idle';
    this.#notify();
  }

  #clearRecordingTimers() {
    if (this.stateTimer) window.clearTimeout(this.stateTimer);
    if (this.autoStopTimer) window.clearTimeout(this.autoStopTimer);
    this.stateTimer = null;
    this.autoStopTimer = null;
  }

  setTrackVolume(trackId, value) {
    this.#updateTrack(trackId, { volume: clamp(Number(value), 0, 1) });
  }

  setTrackPan(trackId, value) {
    this.#updateTrack(trackId, { pan: clamp(Number(value), -1, 1) });
  }

  setTrackMute(trackId, muted) {
    this.#updateTrack(trackId, { muted: Boolean(muted) });
  }

  setTrackSolo(trackId, soloed) {
    this.#updateTrack(trackId, { soloed: Boolean(soloed) });
  }

  renameTrack(trackId, label) {
    const cleanLabel = String(label || '').trim().slice(0, 32) || 'שכבה';
    this.#updateTrack(trackId, { label: cleanLabel });
  }

  #updateTrack(trackId, patch) {
    let updated = null;
    const tracks = this.session.tracks.map((track) => {
      if (track.id !== trackId) return track;
      updated = { ...track, ...patch };
      return updated;
    });
    if (!updated) return;
    this.session = { ...this.session, tracks };
    this.adapter?.updateTrack(updated);
    this.#touchAndSave();
    this.#notify();
  }

  deleteTrack(trackId) {
    const deleted = this.session.tracks.find((track) => track.id === trackId);
    if (!deleted) return;
    this.undoEntry = {
      type: 'delete',
      track: cloneTrack(deleted),
      loopLengthBars: this.session.loopLengthBars,
    };
    const tracks = this.session.tracks.filter((track) => track.id !== trackId);
    this.session = {
      ...this.session,
      tracks,
      loopLengthBars: entry.type === 'delete' && tracks.length
        ? entry.loopLengthBars
        : (tracks.length ? this.session.loopLengthBars : 0),
    };
    this.adapter?.removeTrack(trackId);
    if (!tracks.length) {
      this.adapter?.stop();
      this.state = 'idle';
    }
    this.#touchAndSave();
    this.#notify();
  }

  undoLastRecording() {
    const entry = this.undoEntry;
    if (!entry) return;
    let tracks = [...this.session.tracks];
    if (entry.type === 'recording') {
      if (entry.previousTrack) {
        tracks = tracks.map((track) => track.id === entry.trackId ? entry.previousTrack : track);
      } else {
        tracks = tracks.filter((track) => track.id !== entry.trackId);
      }
    } else if (entry.type === 'delete') {
      tracks.push(entry.track);
      tracks.sort((a, b) => a.order - b.order);
    }
    this.undoEntry = null;
    this.session = {
      ...this.session,
      tracks,
      loopLengthBars: tracks.length ? this.session.loopLengthBars : 0,
    };
    this.adapter?.setTracks(tracks, this.getLoopDuration());
    if (tracks.length && this.initialized) {
      this.adapter.play();
      this.state = 'playing';
    } else {
      this.state = 'idle';
    }
    this.#touchAndSave();
    this.#notify();
  }

  async exportMix({ format = 'wav', excludeTrackIds = [] } = {}) {
    if (format !== 'wav') throw new Error('בגרסה זו הייצוא זמין בפורמט WAV.');
    const duration = this.getLoopDuration();
    if (!duration) throw new Error('אין שכבות לייצוא.');
    return renderMix(this.session.tracks, duration, excludeTrackIds);
  }

  getPlaybackPosition() {
    return this.adapter?.getPlaybackPosition() || 0;
  }

  getBeatIndex() {
    if (this.state === 'counting-in' && this.recordingStartedAt) {
      const beatDuration = this.adapter?.getBeatDuration() || 1;
      const totalBeats = this.session.countInBars * this.session.timeSignature[0];
      const firstBeat = this.recordingStartedAt - (totalBeats * beatDuration);
      const beat = Math.floor((this.adapter.now - firstBeat) / beatDuration);
      return clamp(beat, 0, Math.max(0, totalBeats - 1)) % this.session.timeSignature[0];
    }
    return this.adapter?.getBeatIndex() ?? -1;
  }

  getRecordingElapsed() {
    if (!this.recordingStartedAt || !this.adapter) return 0;
    return Math.max(0, this.adapter.now - this.recordingStartedAt);
  }

  getInputLevel() {
    return this.recorder?.getInputLevel() || 0;
  }

  async resetSession() {
    this.#cancelPendingRecording();
    this.adapter?.setTracks([], 0);
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.undoEntry = null;
    this.session = createSession();
    this.state = 'idle';
    await clearStoredSession().catch(() => {});
    this.#notify();
  }

  getEngineState() {
    return this.state;
  }

  getTrackWaveformData(trackId) {
    return this.session.tracks.find((track) => track.id === trackId)?.waveformPeaks || [];
  }

  dispose() {
    this.#clearRecordingTimers();
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      saveSession(this.session).catch(() => {});
    }
    this.saveTimer = null;
    this.recorder?.dispose();
    this.adapter?.dispose();
    this.recorder = null;
    this.adapter = null;
    this.initialized = false;
    this.activeRecordingTrackId = null;
    this.recordingStartedAt = 0;
    this.finalizing = false;
    this.state = this.session.tracks.length ? 'stopped' : 'idle';
  }
}

export const audioEngine = new LooperEngine();
export { MAX_TRACKS, MAX_LOOP_BARS } from './types';
