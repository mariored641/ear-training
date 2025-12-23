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
        // Real drum samples - using CDN hosted samples
        try {
          // Kick drum for accent
          this.sounds.accent = new Tone.Player({
            url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/kick.mp3',
            volume: 0
          }).toDestination();

          // Snare for normal
          this.sounds.normal = new Tone.Player({
            url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/snare.mp3',
            volume: -3
          }).toDestination();

          // Hi-hat for soft
          this.sounds.soft = new Tone.Player({
            url: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/hihat.mp3',
            volume: -8
          }).toDestination();

          // Wait for all samples to load
          await Tone.loaded();
        } catch (error) {
          console.error('Error loading drum samples:', error);
        }
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
      // Drum kit - real samples with Tone.Player
      sound.start(time);
    } else {
      // Classic click - simple metronome
      const note = 'C4';
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
