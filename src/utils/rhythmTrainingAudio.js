/**
 * Rhythm Training Audio
 *
 * Two scheduling modes — both keep the Transport running continuously
 * so the metronome never has a gap between phases.
 *
 * scheduleDictation()        — PLAYING → WAITING → RECORDING in one run
 * scheduleCallResponseRound()— schedules one round (app + student) at a
 *                              specific Transport offset; caller chains rounds
 */

import * as Tone from 'tone';

const GLEITZ_BASE =
  'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/electric_bass_finger-mp3';
const TONEJS_DRUMS =
  'https://tonejs.github.io/audio/drum-samples/acoustic-kit';

class RhythmTrainingAudio {
  constructor() {
    this._initialized = false;
    this._metronome = null;
    this._woodblock = null;
    this._bass = null;
    this._snare = null;
    this._kick = null;
    this._currentBassNote = null;
    this._currentSound = null;
  }

  // ── Init ───────────────────────────────────────────────────────
  async init() {
    await Tone.start();
    if (!this._initialized) {
      this._metronome = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.005 },
      }).toDestination();
      this._metronome.volume.value = -4;
      this._initialized = true;
    }
  }

  // ── Load pattern sounds ────────────────────────────────────────
  async loadSound(soundChoice, bassNote = 'A') {
    if (
      soundChoice === this._currentSound &&
      (soundChoice !== 'bass' || bassNote === this._currentBassNote)
    ) return;

    this._disposePatternSounds();
    this._currentSound = soundChoice;

    if (soundChoice === 'woodblock') {
      this._woodblock = new Tone.MetalSynth({
        frequency: 440,
        envelope: { attack: 0.001, decay: 0.08, release: 0.1 },
        harmonicity: 5.1,
        modulationIndex: 16,
        resonance: 3200,
        octaves: 1.5,
      }).toDestination();
      this._woodblock.volume.value = 0;
    }

    if (soundChoice === 'bass') {
      this._currentBassNote = bassNote;
      const enharmonic = {
        'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      };
      const toUrl = (note) => {
        const base = note.slice(0, -1);
        const oct  = note.slice(-1);
        return `${GLEITZ_BASE}/${(enharmonic[base] || base)}${oct}.mp3`;
      };
      const oct2 = `${bassNote}2`;
      const oct3 = `${bassNote}3`;
      this._bass = new Tone.Sampler({
        urls: { [oct2]: toUrl(oct2), [oct3]: toUrl(oct3) },
        release: 1,
      }).toDestination();
      this._bass.volume.value = -2;
      await Tone.loaded();
    }

    if (soundChoice === 'drums') {
      this._snare = new Tone.Player({ url: `${TONEJS_DRUMS}/snare.mp3`, volume: -2 }).toDestination();
      this._kick  = new Tone.Player({ url: `${TONEJS_DRUMS}/kick.mp3`,  volume: -4 }).toDestination();
      await Tone.loaded();
    }
  }

  _disposePatternSounds() {
    if (this._woodblock) { this._woodblock.dispose(); this._woodblock = null; }
    if (this._bass)      { this._bass.dispose();      this._bass = null; }
    if (this._snare)     { this._snare.dispose();     this._snare = null; }
    if (this._kick)      { this._kick.dispose();      this._kick = null; }
    this._currentSound = null;
    this._currentBassNote = null;
  }

  // ── Low-level sound triggers ───────────────────────────────────
  _click(audioTime) {
    if (!this._metronome) return;
    try { this._metronome.triggerAttackRelease('A4', '32n', audioTime); } catch {}
  }

  _patternNote(audioTime, dur, soundChoice, drumSlot, bassNoteOct) {
    try {
      if (soundChoice === 'woodblock' && this._woodblock) {
        this._woodblock.triggerAttackRelease('C5', dur, audioTime);
      } else if (soundChoice === 'bass' && this._bass) {
        this._bass.triggerAttackRelease(bassNoteOct, dur, audioTime);
      } else if (soundChoice === 'drums') {
        if (drumSlot === 'snare' && this._snare) this._snare.start(audioTime);
        else if (drumSlot === 'kick' && this._kick) this._kick.start(audioTime);
      }
    } catch {}
  }

  // ── Helper: schedule pattern events at a transport offset ──────
  _schedulePattern(pattern, offsetSec, beatSec, soundChoice, bassNote) {
    if (!pattern) return;
    const octaves = ['2', '3'];
    const drumSlots  = pattern.map(() => Math.random() < 0.5 ? 'snare' : 'kick');
    const bassNoteOcts = pattern.map(() => bassNote + octaves[Math.floor(Math.random() * 2)]);

    let beat = 0;
    pattern.forEach((block, bi) => {
      block.events.forEach((ev) => {
        if (!ev.isNote || ev.tied) return;
        const t   = offsetSec + (beat + ev.time) * beatSec;
        const dur = Math.max(0.05, ev.duration * beatSec * 0.9);
        Tone.Transport.schedule((at) => {
          this._patternNote(at, dur, soundChoice, drumSlots[bi], bassNoteOcts[bi]);
        }, t);
      });
      beat += block.duration;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Dictation: one continuous Transport run covering all phases
  //
  // Timeline (in beats from Transport start):
  //   [0 … playBeats)          ← PLAYING   (metronome + pattern)
  //   [playBeats … +4)         ← WAITING   (metronome only, 1-bar count-in)
  //   [playBeats+4 … +playBeats)← RECORDING (metronome only)
  //
  // Callbacks (fired via Tone.Draw — i.e. on the next animation frame):
  //   onBeat(phase, beatIdxInPhase)
  //   onWaiting()   — start of waiting bar
  //   onRecording() — start of recording bars
  //   onComplete()  — end of recording
  // ══════════════════════════════════════════════════════════════
  async scheduleDictation({
    pattern, numBars, bpm, soundChoice, bassNote = 'A',
    onBeat, onWaiting, onRecording, onComplete,
  }) {
    await this.init();
    await this.loadSound(soundChoice, bassNote);

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    const beatSec     = 60 / bpm;
    const playBeats   = numBars * 4;
    const waitBeats   = 4;               // 1 bar count-in
    const recBeats    = numBars * 4;
    const totalBeats  = playBeats + waitBeats + recBeats;

    // ── Metronome: playing + waiting phases only (silent during recording) ──
    for (let b = 0; b < playBeats + waitBeats; b++) {
      Tone.Transport.schedule((at) => this._click(at), b * beatSec);
    }

    // ── Pattern: playing phase only ───────────────────────────
    this._schedulePattern(pattern, 0, beatSec, soundChoice, bassNote);

    // ── Beat UI callbacks ──────────────────────────────────────
    for (let b = 0; b < totalBeats; b++) {
      let phase, idx;
      if (b < playBeats) {
        phase = 'playing';  idx = b;
      } else if (b < playBeats + waitBeats) {
        phase = 'waiting';  idx = b - playBeats;
      } else {
        phase = 'recording'; idx = b - playBeats - waitBeats;
      }
      const _phase = phase, _idx = idx;
      Tone.Transport.schedule((at) => {
        Tone.Draw.schedule(() => onBeat?.(_phase, _idx), at);
      }, b * beatSec);
    }

    // ── Phase transitions ──────────────────────────────────────
    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onWaiting?.(), at);
    }, playBeats * beatSec);

    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onRecording?.(), at);
    }, (playBeats + waitBeats) * beatSec);

    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onComplete?.(), at);
    }, totalBeats * beatSec + 0.05);

    Tone.Transport.start();
  }

  // ══════════════════════════════════════════════════════════════
  // Call & Response: schedule one round at a given Transport offset.
  //
  //   startSec       — Transport time (seconds) at which this round begins
  //   Returns nextStartSec (= startSec + roundDurationSec)
  //
  // Callbacks:
  //   onBeat(phase, beatIdx)  — 'app' | 'student', beat within phase (0-based)
  //   onStudentTurn()         — fired 1 beat before student turn starts (lead time)
  //   onRoundEnd(nextStartSec)— fired at end of round; schedule next round here
  // ══════════════════════════════════════════════════════════════
  scheduleCallResponseRound({
    pattern, numBars, bpm, soundChoice, bassNote = 'A',
    startSec,
    onBeat, onStudentTurn, onRoundEnd,
  }) {
    const beatSec    = 60 / bpm;
    const appBeats   = numBars * 4;
    const stuBeats   = numBars * 4;
    const roundEnd   = startSec + (appBeats + stuBeats) * beatSec;

    // Metronome for entire round
    for (let b = 0; b < appBeats + stuBeats; b++) {
      Tone.Transport.schedule((at) => this._click(at), startSec + b * beatSec);
    }

    // Pattern: app turn only
    this._schedulePattern(pattern, startSec, beatSec, soundChoice, bassNote);

    // Beat UI callbacks
    for (let b = 0; b < appBeats + stuBeats; b++) {
      const phase = b < appBeats ? 'app' : 'student';
      const idx   = b < appBeats ? b : b - appBeats;
      const _p = phase, _i = idx;
      Tone.Transport.schedule((at) => {
        Tone.Draw.schedule(() => onBeat?.(_p, _i), at);
      }, startSec + b * beatSec);
    }

    // Student turn notification (1 beat early so component can update state)
    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onStudentTurn?.(), at);
    }, startSec + appBeats * beatSec);

    // Round end — 1 beat early so caller can schedule next round in time
    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onRoundEnd?.(roundEnd), at);
    }, roundEnd - beatSec);

    return roundEnd;
  }

  // ══════════════════════════════════════════════════════════════
  // Calibration: simple metronome-only sequence for auto-calibration.
  //
  // Plays numBeats clicks, then calls onComplete() after one extra beat
  // of silence so the last tap can be captured.
  //
  // Callbacks:
  //   onBeat(beatIndex)  — fired on each metronome click (0-based)
  //   onComplete()       — fired after the capture window ends
  //
  // Returns expected beat times in ms: [0, beatMs, 2*beatMs, ...]
  // ══════════════════════════════════════════════════════════════
  async scheduleCalibration({ bpm, numBeats, onBeat, onComplete }) {
    await this.init();

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;

    const beatSec = 60 / bpm;

    for (let b = 0; b < numBeats; b++) {
      Tone.Transport.schedule((at) => this._click(at), b * beatSec);
      const _b = b;
      Tone.Transport.schedule((at) => {
        Tone.Draw.schedule(() => onBeat?.(_b), at);
      }, b * beatSec);
    }

    // Complete one beat after last click so the last tap can be captured
    Tone.Transport.schedule((at) => {
      Tone.Draw.schedule(() => onComplete?.(), at);
    }, numBeats * beatSec);

    Tone.Transport.start();

    return Array.from({ length: numBeats }, (_, i) => i * (beatSec * 1000));
  }

  // ── Ensure Transport is running (for Call & Response start) ───
  async startTransport(bpm, soundChoice, bassNote) {
    await this.init();
    await this.loadSound(soundChoice, bassNote);
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.start();
  }

  // ── Stop everything ────────────────────────────────────────────
  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }

  dispose() {
    this.stop();
    if (this._metronome) { this._metronome.dispose(); this._metronome = null; }
    this._disposePatternSounds();
    this._initialized = false;
  }
}

export default new RhythmTrainingAudio();
