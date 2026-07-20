import * as Tone from 'tone';

const START_SAFETY_SECONDS = 0.08;

function gainToDb(gain) {
  if (gain <= 0.0001) return -80;
  return 20 * Math.log10(gain);
}

export class ToneLooperAdapter {
  constructor() {
    this.initialized = false;
    this.transport = null;
    this.audioContext = null;
    this.rawContext = null;
    this.clickSynth = null;
    this.clickGain = null;
    this.metronomeEventId = null;
    this.players = new Map();
    this.bpm = 92;
    this.timeSignature = [4, 4];
    this.clickVolume = 0.65;
    this.loopDuration = 0;
  }

  async init() {
    if (this.initialized) {
      await Tone.start();
      return;
    }
    // Must remain in the direct call chain of the user's button press.
    await Tone.start();
    this.transport = Tone.getTransport();
    this.audioContext = Tone.getContext();
    this.rawContext = this.audioContext.rawContext;
    this.clickGain = new Tone.Gain(this.clickVolume).toDestination();
    this.clickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.025 },
      volume: -8,
    }).connect(this.clickGain);
    this.initialized = true;
    this.configure(this.bpm, this.timeSignature, this.clickVolume);
  }

  configure(bpm, timeSignature, clickVolume) {
    this.bpm = bpm;
    this.timeSignature = timeSignature;
    this.clickVolume = clickVolume;
    if (!this.initialized) return;
    this.transport.bpm.value = bpm;
    this.transport.timeSignature = timeSignature[0];
    this.clickGain.gain.rampTo(clickVolume, 0.02);
    this.#scheduleMetronome();
  }

  #scheduleMetronome() {
    if (this.metronomeEventId !== null) {
      this.transport.clear(this.metronomeEventId);
      this.metronomeEventId = null;
    }
    const interval = this.timeSignature[1] === 8 ? '8n' : '4n';
    let beat = 0;
    this.metronomeEventId = this.transport.scheduleRepeat((time) => {
      const accent = beat % this.timeSignature[0] === 0;
      this.clickSynth.triggerAttackRelease(accent ? 'C6' : 'G5', '32n', time, accent ? 0.95 : 0.62);
      beat = (beat + 1) % this.timeSignature[0];
    }, interval, 0);
  }

  get now() {
    return Tone.now();
  }

  get startSafetySeconds() {
    return START_SAFETY_SECONDS;
  }

  scheduleCountIn(startTime, countInBars) {
    if (!countInBars || !this.initialized) return;
    const beatSeconds = this.getBeatDuration();
    const totalBeats = countInBars * this.timeSignature[0];
    const firstBeatTime = startTime - (totalBeats * beatSeconds);
    for (let beat = 0; beat < totalBeats; beat += 1) {
      const accent = beat % this.timeSignature[0] === 0;
      this.clickSynth.triggerAttackRelease(
        accent ? 'C6' : 'G5',
        '32n',
        firstBeatTime + (beat * beatSeconds),
        accent ? 0.95 : 0.62,
      );
    }
  }

  getBeatDuration() {
    const quarter = 60 / this.bpm;
    return this.timeSignature[1] === 8 ? quarter / 2 : quarter;
  }

  getBarDuration() {
    return this.getBeatDuration() * this.timeSignature[0];
  }

  setTracks(tracks, loopDuration) {
    if (!this.initialized) return;
    this.#disposePlayers();
    this.loopDuration = loopDuration || 0;
    tracks.forEach((track) => this.#createTrackPlayer(track));
  }

  #createTrackPlayer(track) {
    if (!track.audioData) return;
    const channel = new Tone.Channel({
      volume: gainToDb(track.volume),
      pan: track.pan,
      mute: track.muted,
      solo: track.soloed,
    }).toDestination();
    const player = new Tone.Player({
      url: track.audioData,
      loop: true,
      loopStart: 0,
      loopEnd: this.loopDuration || track.audioData.duration,
      fadeIn: 0,
      fadeOut: 0,
    }).connect(channel);
    player.sync().start(0);
    this.players.set(track.id, { player, channel });
  }

  updateTrack(track) {
    const nodes = this.players.get(track.id);
    if (!nodes) return;
    nodes.channel.volume.rampTo(gainToDb(track.volume), 0.025);
    nodes.channel.pan.rampTo(track.pan, 0.025);
    nodes.channel.mute = track.muted;
    nodes.channel.solo = track.soloed;
  }

  removeTrack(trackId) {
    const nodes = this.players.get(trackId);
    if (!nodes) return;
    try { nodes.player.unsync(); } catch {}
    nodes.player.dispose();
    nodes.channel.dispose();
    this.players.delete(trackId);
  }

  startTransportAt(time) {
    if (!this.initialized) return;
    this.transport.stop();
    this.transport.position = 0;
    this.transport.start(time, 0);
  }

  play() {
    if (!this.initialized) return;
    this.startTransportAt(this.now + START_SAFETY_SECONDS);
  }

  stop(time) {
    if (!this.initialized) return;
    this.transport.stop(time);
    if (time === undefined) this.transport.position = 0;
  }

  getTransportSeconds() {
    return this.initialized ? Math.max(0, this.transport.seconds || 0) : 0;
  }

  getPlaybackPosition() {
    if (!this.loopDuration) return 0;
    return (this.getTransportSeconds() % this.loopDuration) / this.loopDuration;
  }

  getBeatIndex() {
    if (!this.initialized || this.transport.state !== 'started') return -1;
    return Math.floor(this.getTransportSeconds() / this.getBeatDuration()) % this.timeSignature[0];
  }

  #disposePlayers() {
    for (const { player, channel } of this.players.values()) {
      try { player.unsync(); } catch {}
      player.dispose();
      channel.dispose();
    }
    this.players.clear();
  }

  dispose() {
    if (!this.initialized) return;
    this.stop();
    if (this.metronomeEventId !== null) this.transport.clear(this.metronomeEventId);
    this.metronomeEventId = null;
    this.#disposePlayers();
    this.clickSynth?.dispose();
    this.clickGain?.dispose();
    this.clickSynth = null;
    this.clickGain = null;
    this.transport = null;
    this.audioContext = null;
    this.rawContext = null;
    this.initialized = false;
  }
}
