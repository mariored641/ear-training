import { clampTempo } from './patterns.js';

export const LOOKAHEAD_SECONDS = 0.1;
export const POLL_MS = 25;
const EPSILON = 1e-8;

// Uses audio time, never a beat-length timer. Tempo edits preserve fractional phase.
export class RhythmScheduler {
  constructor({ now, play, cancelFuture, stopVoices }) {
    Object.assign(this, { now, play, cancelFuture, stopVoices });
    this.running = false;
  }

  position(time = this.now()) {
    return this.anchorBeat + (time - this.anchorTime) * this.bpm / 60;
  }

  start(pattern, bpm) {
    this.stop();
    this.pattern = pattern;
    this.bpm = clampTempo(bpm);
    this.anchorTime = this.now() + 0.02;
    this.anchorBeat = 0;
    this.scheduledUntil = -EPSILON;
    this.running = true;
    this.tick();
  }

  update(pattern, bpm) {
    if (!this.running) return;
    const now = this.now();
    const position = this.position(now);
    this.cancelFuture(now);
    this.anchorBeat = Math.max(0, position);
    this.anchorTime = Math.max(now, this.anchorTime);
    this.bpm = clampTempo(bpm);
    this.pattern = pattern;
    // A note at 'now' has already begun; never retrigger it on tempo edits.
    this.scheduledUntil = position < 0 ? -EPSILON : position + EPSILON;
    this.tick();
  }

  tick() {
    if (!this.running || !this.pattern.length) return;
    const now = this.now();
    const from = Math.max(this.scheduledUntil, this.position(now) - EPSILON);
    const to = this.position(now + LOOKAHEAD_SECONDS);
    const { length, events } = this.pattern;
    const notes = new Map();
    for (const event of events) {
      if (event.state === 'mute') continue;
      const firstCycle = Math.max(0, Math.ceil((from - event.beat) / length));
      for (let cycle = firstCycle; cycle * length + event.beat < to; cycle++) {
        const beat = cycle * length + event.beat;
        const time = this.anchorTime + (beat - this.anchorBeat) * 60 / this.bpm;
        // Coincident rows share one hit per instrument, with the strongest emphasis.
        const key = `${beat.toFixed(8)}:${event.state}`;
        const previous = notes.get(key);
        notes.set(key, { ...event, beat, time: Math.max(now, time), accent: event.accent || previous?.accent });
      }
    }
    [...notes.values()].sort((a, b) => a.time - b.time).forEach(note => this.play(note));
    this.scheduledUntil = to;
  }

  stop() {
    this.running = false;
    this.stopVoices();
  }
}
