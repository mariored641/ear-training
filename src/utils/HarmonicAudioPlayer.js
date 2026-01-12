import * as Tone from 'tone';

/**
 * Audio player for harmonic exercises (4A, 4B, 4C)
 * Handles chord and note playback with different instruments
 */
class HarmonicAudioPlayer {
  constructor() {
    this.initialized = false;
    this.instrument = 'piano';
    this.sampler = null; // For chords and single notes (4A, 4C)
    this.melodySampler = null; // For melody notes (4B)
    this.pianoSampler = null; // Always available for chords
  }

  async init() {
    if (this.initialized) return;

    await Tone.start();

    // Load piano sampler for chords (always available)
    await this.loadPianoSampler();

    // Load main instrument
    await this.loadInstrument(this.instrument);

    this.initialized = true;
  }

  async loadPianoSampler() {
    if (this.pianoSampler) {
      this.pianoSampler.dispose();
    }

    this.pianoSampler = new Tone.Sampler({
      urls: {
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      release: 1
    }).toDestination();

    // Reduce chord volume to let melody stand out
    this.pianoSampler.volume.value = -8;

    await Tone.loaded();
  }

  /**
   * Load instrument sampler
   * @param {string} instrument - 'piano' | 'guitar'
   */
  async loadInstrument(instrument) {
    console.log('[HarmonicAudioPlayer] Loading instrument:', instrument);
    this.instrument = instrument;

    // Dispose old sampler
    if (this.sampler) {
      console.log('[HarmonicAudioPlayer] Disposing old sampler');
      this.sampler.dispose();
      this.sampler = null;
    }

    if (instrument === 'piano') {
      console.log('[HarmonicAudioPlayer] Creating piano sampler');
      // Piano sampler with good harmonic clarity
      this.sampler = new Tone.Sampler({
        urls: {
          C4: 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          A4: 'A4.mp3',
        },
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        release: 1
      }).toDestination();

      await Tone.loaded();
      console.log('[HarmonicAudioPlayer] Piano sampler loaded');
    } else if (instrument === 'guitar') {
      console.log('[HarmonicAudioPlayer] Creating guitar sampler');
      // Guitar sampler - using gleitz soundfonts (acoustic nylon guitar)
      this.sampler = new Tone.Sampler({
        urls: {
          'E2': 'E2.mp3',
          'A2': 'A2.mp3',
          'D3': 'D3.mp3',
          'G3': 'G3.mp3',
          'B3': 'B3.mp3',
          'E4': 'E4.mp3'
        },
        baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/',
        release: 1
      }).toDestination();

      // Boost guitar volume to stand out above chords
      this.sampler.volume.value = 3;

      await Tone.loaded();
      console.log('[HarmonicAudioPlayer] Guitar sampler loaded');
    }

    // Update melody sampler reference
    this.melodySampler = this.sampler;
    console.log('[HarmonicAudioPlayer] Melody sampler updated, current instrument:', this.instrument);
  }

  /**
   * Change instrument
   * @param {string} instrument - 'piano' | 'guitar'
   */
  async setInstrument(instrument) {
    await this.loadInstrument(instrument);
  }

  /**
   * Play a single note
   * @param {string} note - Note name with octave (e.g., 'C4', 'E4')
   * @param {number} duration - Duration in seconds
   * @param {number} time - When to play (Tone.js time)
   */
  playNote(note, duration = 1.5, time = undefined) {
    if (!this.sampler) return;
    this.sampler.triggerAttackRelease(note, duration, time);
  }

  /**
   * Play a melody note (for Exercise 4B - uses melody sampler)
   * @param {string} note - Note name with octave (e.g., 'C4', 'E4')
   * @param {number} duration - Duration in seconds
   * @param {number} time - When to play (Tone.js time)
   */
  playMelodyNote(note, duration = 1.5, time = undefined) {
    // Use melody sampler if available, otherwise use main sampler
    const samplerToUse = this.melodySampler || this.sampler;
    if (!samplerToUse) return;
    samplerToUse.triggerAttackRelease(note, duration, time);
  }

  /**
   * Play a chord (always uses piano in Exercise 4B)
   * @param {Array} notes - Array of note names (e.g., ['C4', 'E4', 'G4'])
   * @param {number} duration - Duration in seconds
   * @param {string} voicing - 'strummed' | 'arpeggiated'
   * @param {number} time - When to play (Tone.js time)
   * @param {boolean} usePiano - Force using piano sampler (for Exercise 4B)
   */
  playChord(notes, duration = 1.5, voicing = 'strummed', time = undefined, usePiano = false) {
    const samplerToUse = usePiano ? this.pianoSampler : this.sampler;
    if (!samplerToUse || !notes || notes.length === 0) return;

    if (voicing === 'strummed') {
      // Play all notes simultaneously
      notes.forEach(note => {
        samplerToUse.triggerAttackRelease(note, duration, time);
      });
    } else if (voicing === 'arpeggiated') {
      // Play notes sequentially (bottom to top)
      const staggerTime = 0.08; // 80ms between notes
      notes.forEach((note, index) => {
        const noteTime = time ? time + (index * staggerTime) : `+${index * staggerTime}`;
        samplerToUse.triggerAttackRelease(note, duration * 0.9, noteTime);
      });
    }
  }

  /**
   * Adjust octave to avoid overlap with chords
   * For Exercise 4B when using piano for melody
   * @param {string} note - Note with octave (e.g., 'C4')
   * @param {Array} chordNotes - Array of chord notes
   * @returns {string} Adjusted note
   */
  adjustOctaveForSeparation(note, chordNotes) {
    // Extract note name and octave
    const noteName = note.replace(/[0-9]/g, '');
    const noteOctave = parseInt(note.replace(/[^0-9]/g, ''));

    // Get chord octaves
    const chordOctaves = chordNotes.map(cn => parseInt(cn.replace(/[^0-9]/g, '')));
    const minChordOctave = Math.min(...chordOctaves);
    const maxChordOctave = Math.max(...chordOctaves);

    // If melody note is in same octave range as chord, shift it
    if (noteOctave >= minChordOctave && noteOctave <= maxChordOctave) {
      // Shift melody up by 1 octave if it overlaps
      return `${noteName}${noteOctave + 1}`;
    }

    return note;
  }

  /**
   * Play a progression of chords
   * @param {Array} progression - Array of chord objects [{notes: ['C4', 'E4', 'G4'], bass: 'C2'}, ...]
   * @param {number} chordDuration - Duration of each chord in seconds
   * @param {string} voicing - 'strummed' | 'arpeggiated'
   * @param {boolean} withBass - Whether to include bass notes
   */
  playProgression(progression, chordDuration = 2.0, voicing = 'strummed', withBass = false) {
    if (!this.sampler || !progression || progression.length === 0) return;

    let currentTime = Tone.now();

    progression.forEach((chordObj, index) => {
      const { notes, bass } = chordObj;

      // Play bass note if requested
      if (withBass && bass) {
        this.sampler.triggerAttackRelease(bass, chordDuration, currentTime);
      }

      // Play chord
      this.playChord(notes, chordDuration, voicing, currentTime);

      // Move to next chord time
      currentTime += chordDuration + 0.2; // 200ms gap between chords
    });
  }

  /**
   * Play a melody (sequence of single notes)
   * @param {Array} melody - Array of note objects [{note: 'E4', duration: 0.5}, ...]
   * @param {number} tempo - BPM (default 100)
   */
  playMelody(melody, tempo = 100) {
    if (!this.sampler || !melody || melody.length === 0) return;

    const beatDuration = 60 / tempo; // Duration of one beat in seconds
    let currentTime = Tone.now();

    melody.forEach(({ note, duration }) => {
      const noteDuration = beatDuration * duration; // Convert beats to seconds
      this.sampler.triggerAttackRelease(note, noteDuration * 0.9, currentTime);
      currentTime += noteDuration;
    });
  }

  /**
   * Stop all sounds
   */
  stop() {
    if (this.sampler) {
      this.sampler.releaseAll();
    }
    if (this.pianoSampler) {
      this.pianoSampler.releaseAll();
    }
  }

  /**
   * Dispose of the audio player
   */
  dispose() {
    this.stop();
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
    if (this.pianoSampler) {
      this.pianoSampler.dispose();
      this.pianoSampler = null;
    }
    this.melodySampler = null;
    this.initialized = false;
  }
}

export default new HarmonicAudioPlayer();
