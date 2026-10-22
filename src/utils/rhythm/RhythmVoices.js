const LEVELS = { classicClick: { accent: 0, normal: -5, soft: -12 }, drumKit: { accent: 0, normal: -3, soft: -8 } };
export const MAX_VOICES = 256;

// One owned source + gain per hit. No shared volume automation or restore timers.
export class RhythmVoices {
  constructor(context) {
    this.context = context;
    this.voices = new Set();
    this.output = context.createGain();
    this.output.gain.value = 0.35; // Headroom for coincident kick/snare/hat.
    this.output.connect(context.destination);
  }

  play({ state, time, accent }, soundSet, buffer) {
    if (state === 'mute') return;
    if (soundSet === 'drumKit' && !buffer) return;
    while (this.voices.size >= MAX_VOICES) this.finish(this.voices.values().next().value);
    const ctx = this.context;
    const source = buffer ? ctx.createBufferSource() : ctx.createOscillator();
    const gain = ctx.createGain();
    const level = 10 ** ((LEVELS[soundSet][state] + (accent ? 3 : 0)) / 20);
    const start = Math.max(ctx.currentTime, time);
    const duration = buffer ? buffer.duration : 0.12;
    if (buffer) {
      source.buffer = buffer;
      gain.gain.setValueAtTime(level, start);
    } else {
      source.type = 'sine';
      source.frequency.setValueAtTime(1046.5, start);
      source.frequency.exponentialRampToValueAtTime(261.625, start + 0.01);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
      gain.gain.setValueAtTime(0, start + duration);
    }
    source.connect(gain);
    gain.connect(this.output);
    const voice = { source, gain, start };
    this.voices.add(voice);
    source.onended = () => this.finish(voice, false);
    source.start(start);
    source.stop(start + duration);
  }

  finish(voice, stop = true) {
    if (!this.voices.delete(voice)) return;
    voice.source.onended = null;
    if (stop) voice.source.stop(this.context.currentTime);
    voice.source.disconnect();
    voice.gain.disconnect();
  }

  cancelFuture(time) {
    for (const voice of this.voices) if (voice.start > time) this.finish(voice);
  }

  stop() {
    for (const voice of this.voices) this.finish(voice);
  }

  dispose() {
    this.stop();
    this.output.disconnect();
  }
}
