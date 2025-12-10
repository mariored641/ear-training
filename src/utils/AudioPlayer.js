import * as Tone from 'tone';

/**
 * Centralized audio management using Tone.js with high-quality samples
 * Uses gleitz/midi-js-soundfonts for realistic piano and guitar sounds
 */
class AudioPlayer {
  constructor() {
    this.sampler = null;
    this.initialized = false;
    this.currentInstrument = 'piano'; // 'piano' or 'guitar'
    this.isLoading = false;
  }

  async init() {
    if (this.initialized) return;

    await Tone.start();
    await this.createSampler(this.currentInstrument);
    this.initialized = true;
  }

  /**
   * Create sampler with high-quality samples based on instrument type
   * @param {string} instrument - 'piano' or 'guitar'
   */
  async createSampler(instrument) {
    // Dispose of old sampler if it exists
    if (this.sampler) {
      this.sampler.dispose();
    }

    this.isLoading = true;

    // Using Tone.js official Salamander piano samples
    let baseInstrumentUrl, samples;

    if (instrument === 'guitar') {
      // For guitar, using gleitz soundfonts
      baseInstrumentUrl = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/';
      samples = {
        'E2': 'E2.mp3',
        'A2': 'A2.mp3',
        'D3': 'D3.mp3',
        'G3': 'G3.mp3',
        'B3': 'B3.mp3',
        'E4': 'E4.mp3'
      };
    } else {
      // Using Tone.js Salamander piano samples (known to work)
      baseInstrumentUrl = 'https://tonejs.github.io/audio/salamander/';
      samples = {
        C3: 'C3.mp3',
        C4: 'C4.mp3',
        C5: 'C5.mp3'
      };
    }

    return new Promise((resolve, reject) => {
      try {
        this.sampler = new Tone.Sampler({
          urls: samples,
          baseUrl: baseInstrumentUrl,
          onload: () => {
            this.isLoading = false;
            console.log(`${instrument} samples loaded successfully`);
            resolve();
          },
          onerror: (error) => {
            console.error('Error loading samples:', error);
            this.isLoading = false;
            reject(error);
          }
        }).toDestination();

        // Adjust volume
        if (this.sampler) {
          this.sampler.volume.value = instrument === 'guitar' ? -3 : 0;
        }
      } catch (error) {
        console.error('Error creating sampler:', error);
        this.isLoading = false;
        reject(error);
      }
    });
  }

  /**
   * Change the instrument sound
   * @param {string} instrument - 'piano' or 'guitar'
   * @returns {Promise} Promise that resolves when instrument is set
   */
  async setInstrument(instrument) {
    this.currentInstrument = instrument;
    if (this.initialized) {
      await this.createSampler(instrument);
    } else {
      await this.init();
    }
  }

  /**
   * Get current instrument
   * @returns {string} Current instrument type
   */
  getInstrument() {
    return this.currentInstrument;
  }

  /**
   * Play a single note
   * @param {string} note - Note to play (e.g., 'C4', 'E5')
   * @param {number} duration - Duration in seconds
   */
  async playNote(note, duration = 1) {
    await this.init();

    // Wait if still loading
    while (this.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.sampler) {
      this.sampler.triggerAttackRelease(note, duration);
    }
  }

  /**
   * Play a sequence of notes
   * @param {Array<string>} notes - Array of note strings
   * @param {number} tempo - Tempo in BPM
   * @param {Function} onNoteStart - Callback called for each note with (index, time)
   */
  async playSequence(notes, tempo = 100, onNoteStart = null) {
    await this.init();

    // Wait if still loading
    while (this.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stop any currently playing sounds
    this.stop();

    const noteDuration = 60 / tempo; // Duration of each quarter note in seconds
    const now = Tone.now();

    notes.forEach((note, index) => {
      const time = now + index * noteDuration;

      if (onNoteStart) {
        // Call callback 0.2 seconds before the note
        setTimeout(() => onNoteStart(index, time), (time - now - 0.2) * 1000);
      }

      if (this.sampler) {
        this.sampler.triggerAttackRelease(note, noteDuration * 0.8, time);
      }
    });
  }

  /**
   * Stop all audio
   */
  stop() {
    if (this.sampler) {
      this.sampler.releaseAll();
    }
  }

  /**
   * Dispose of the audio player
   */
  dispose() {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
      this.initialized = false;
    }
  }
}

export default new AudioPlayer();
