import * as Tone from 'tone';
import { RhythmScheduler } from './rhythm/RhythmScheduler.js';
import { RhythmVoices } from './rhythm/RhythmVoices.js';

class RhythmAudioPlayer {
  constructor() {
    this.buffers = {};
    this.soundSet = 'classicClick';
    this.generation = 0;
  }

  async init(soundSet = this.soundSet) {
    const generation = this.generation;
    await Tone.start();
    if (generation !== this.generation) return;
    if (!this.voices) {
      const context = Tone.getContext().rawContext;
      this.voices = new RhythmVoices(context);
      this.scheduler = new RhythmScheduler({
        now: () => context.currentTime,
        play: note => this.voices.play(note, this.soundSet, this.soundSet === 'drumKit' ? this.buffers[note.state] : null),
        cancelFuture: time => this.voices.cancelFuture(time),
        stopVoices: () => this.voices.stop(),
      });
    }
    if (soundSet === 'drumKit' && !this.samplesPromise) {
      this.samplesPromise = Promise.all(['kick', 'snare', 'hihat'].map(async (name, index) => {
        const audio = await Tone.ToneAudioBuffer.fromUrl(`https://tonejs.github.io/audio/drum-samples/acoustic-kit/${name}.mp3`);
        this.buffers[['accent', 'normal', 'soft'][index]] = audio.get();
        audio.dispose();
      })).catch(error => {
        this.samplesPromise = null;
        throw error;
      });
    }
    if (soundSet === 'drumKit') await this.samplesPromise;
  }

  start(pattern, bpm, soundSet) {
    this.stop();
    this.soundSet = soundSet;
    this.scheduler.start(pattern, bpm);
    // Tone's context ticker runs in a Web Worker, so it keeps firing in background tabs
    // where setInterval is throttled to ~1s and notes would be dropped.
    this.tickContext = Tone.getContext();
    this.onTick = () => this.scheduler?.tick();
    this.tickContext.on('tick', this.onTick);
  }

  update(pattern, bpm, soundSet) {
    this.soundSet = soundSet;
    this.scheduler?.update(pattern, bpm);
  }

  position() {
    return this.scheduler?.running ? this.scheduler.position() : -1;
  }

  stop() {
    if (this.onTick) this.tickContext?.off('tick', this.onTick);
    this.onTick = null;
    this.tickContext = null;
    this.scheduler?.stop();
  }

  dispose() {
    this.generation++;
    this.stop();
    this.voices?.dispose();
    this.voices = null;
    this.scheduler = null;
  }
}

export default new RhythmAudioPlayer();
