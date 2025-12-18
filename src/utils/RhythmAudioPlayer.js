import * as Tone from 'tone';

/**
 * Audio player for Exercise 4 - Rhythm Training
 * Handles rhythm playback with different sound sets
 */
class RhythmAudioPlayer {
  constructor() {
    this.initialized = false;
    this.soundSet = 'classicClick';
    this.sounds = {};
    this.isPlaying = false;
  }

  async init() {
    if (this.initialized) return;

    await Tone.start();
    await this.loadSounds(this.soundSet);
    this.initialized = true;
  }

  /**
   * Load sounds based on sound set
   * @param {string} soundSet - 'classicClick' | 'drumKit' | 'woodblock' | 'electronicBeep'
   */
  async loadSounds(soundSet) {
    this.soundSet = soundSet;

    // Dispose old sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound && sound.dispose) sound.dispose();
    });
    this.sounds = {};

    switch (soundSet) {
      case 'classicClick':
        // Simple click sound with different volumes
        this.sounds.accent = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 2,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.accent.volume.value = 0;

        this.sounds.normal = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 2,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.normal.volume.value = -5;

        this.sounds.soft = new Tone.MembraneSynth({
          pitchDecay: 0.01,
          octaves: 2,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.soft.volume.value = -12;
        break;

      case 'drumKit':
        // Kick drum for accent
        this.sounds.accent = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();
        this.sounds.accent.volume.value = 0;

        // Snare for normal
        this.sounds.normal = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
        }).toDestination();
        this.sounds.normal.volume.value = -3;

        // Hi-hat for soft
        this.sounds.soft = new Tone.MetalSynth({
          frequency: 200,
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5
        }).toDestination();
        this.sounds.soft.volume.value = -10;
        break;

      case 'woodblock':
        // Woodblock sounds with different volumes
        this.sounds.accent = new Tone.MembraneSynth({
          pitchDecay: 0.008,
          octaves: 2,
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.accent.volume.value = 0;

        this.sounds.normal = new Tone.MembraneSynth({
          pitchDecay: 0.008,
          octaves: 2,
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.normal.volume.value = -5;

        this.sounds.soft = new Tone.MembraneSynth({
          pitchDecay: 0.008,
          octaves: 2,
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
        }).toDestination();
        this.sounds.soft.volume.value = -12;
        break;

      case 'electronicBeep':
        // Electronic beeps with different frequencies
        this.sounds.accent = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.sounds.accent.volume.value = 0;

        this.sounds.normal = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.sounds.normal.volume.value = -5;

        this.sounds.soft = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination();
        this.sounds.soft.volume.value = -12;
        break;
    }
  }

  /**
   * Change sound set
   * @param {string} soundSet - Sound set to use
   */
  async setSoundSet(soundSet) {
    await this.loadSounds(soundSet);
  }

  /**
   * Play a single cell
   * @param {string} cellState - 'accent' | 'normal' | 'soft' | 'mute'
   * @param {number} time - When to play (Tone.js time)
   * @param {boolean} isBeatStart - Whether this is the first cell of a beat (adds slight emphasis)
   */
  playCell(cellState, time = undefined, isBeatStart = false) {
    if (cellState === 'mute') return;

    const sound = this.sounds[cellState];
    if (!sound) return;

    // Apply beat emphasis: +3dB for first cell of each beat
    const originalVolume = sound.volume.value;
    if (isBeatStart) {
      sound.volume.value = originalVolume + 3;
    }

    if (this.soundSet === 'drumKit') {
      // Drum kit uses different triggering
      if (cellState === 'accent') {
        sound.triggerAttackRelease('C1', '32n', time);
      } else if (cellState === 'normal') {
        sound.triggerAttackRelease('16n', time);
      } else if (cellState === 'soft') {
        sound.triggerAttackRelease('32n', time);
      }
    } else if (this.soundSet === 'electronicBeep') {
      // Electronic beep with different frequencies
      const freq = cellState === 'accent' ? '800Hz' : cellState === 'normal' ? '600Hz' : '400Hz';
      sound.triggerAttackRelease(freq, '16n', time);
    } else {
      // Classic click / woodblock
      const note = cellState === 'accent' ? 'C4' : cellState === 'normal' ? 'C4' : 'C4';
      sound.triggerAttackRelease(note, '32n', time);
    }

    // Restore original volume after a short delay
    if (isBeatStart) {
      setTimeout(() => {
        sound.volume.value = originalVolume;
      }, 50);
    }
  }

  /**
   * Stop all sounds
   */
  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.isPlaying = false;

    // Release all sounds
    Object.values(this.sounds).forEach(sound => {
      if (sound && sound.triggerRelease) {
        sound.triggerRelease();
      }
    });
  }

  /**
   * Dispose of the audio player
   */
  dispose() {
    this.stop();
    Object.values(this.sounds).forEach(sound => {
      if (sound && sound.dispose) sound.dispose();
    });
    this.sounds = {};
    this.initialized = false;
  }
}

export default new RhythmAudioPlayer();
