import * as Tone from 'tone';

/**
 * Centralized audio management using Tone.js
 */
class AudioPlayer {
  constructor() {
    this.synth = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    await Tone.start();
    this.synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.3,
        release: 0.5
      }
    }).toDestination();

    this.initialized = true;
  }

  /**
   * Play a single note
   * @param {string} note - Note to play (e.g., 'C4', 'E5')
   * @param {number} duration - Duration in seconds
   */
  async playNote(note, duration = 1) {
    await this.init();
    this.synth.triggerAttackRelease(note, duration);
  }

  /**
   * Play a sequence of notes
   * @param {Array<string>} notes - Array of note strings
   * @param {number} tempo - Tempo in BPM
   * @param {Function} onNoteStart - Callback called for each note with (index, time)
   */
  async playSequence(notes, tempo = 100, onNoteStart = null) {
    await this.init();

    const noteDuration = 60 / tempo; // Duration of each quarter note in seconds
    const now = Tone.now();

    notes.forEach((note, index) => {
      const time = now + index * noteDuration;

      if (onNoteStart) {
        // Call callback 0.2 seconds before the note
        setTimeout(() => onNoteStart(index, time), (time - now - 0.2) * 1000);
      }

      this.synth.triggerAttackRelease(note, noteDuration * 0.8, time);
    });
  }

  /**
   * Stop all audio
   */
  stop() {
    if (this.synth) {
      this.synth.triggerRelease();
    }
  }

  /**
   * Dispose of the audio player
   */
  dispose() {
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
      this.initialized = false;
    }
  }
}

export default new AudioPlayer();
