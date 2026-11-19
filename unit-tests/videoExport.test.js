import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSettings, sanitizeView, normalizeFretRange, viewIndexForRepetition, fretWindows,
  locateChord, estimateDurationSec, formatDuration, pickRecorderFormat, exportFileName,
  DEFAULT_SETTINGS, MAX_REPETITIONS, MAX_VIEWS, MAX_EXPORT_SEC, AUDIO_BITRATE, VIDEO_BITRATES,
  repetitionSec, repetitionsForMinutes, estimateBytes,
} from '../src/lib/video-export/exportPlan.js';
import { buildNeckModel, noteAt } from '../src/lib/video-export/neckModel.js';
import { buildScene, progressFraction } from '../src/lib/video-export/scene.js';
import { runExport, ExportCancelled } from '../src/lib/video-export/VideoExporter.js';

test('settings: corrupt / out-of-range persisted values fall back safely', () => {
  assert.deepEqual(sanitizeSettings(null), { ...DEFAULT_SETTINGS, views: [] });
  const s = sanitizeSettings({ repetitions: 999, rotateEvery: -3, resolution: 'bogus', views: 'x' });
  assert.equal(s.repetitions, MAX_REPETITIONS);
  assert.equal(s.rotateEvery, 1);
  assert.equal(s.resolution, '720p');
  assert.deepEqual(s.views, []);
  assert.equal(sanitizeSettings({ views: Array(50).fill({}) }).views.length, MAX_VIEWS);
});

test('fret range: ordered, clamped, minimum span, defaults when missing', () => {
  assert.deepEqual(normalizeFretRange(9, 5), [5, 9]);
  assert.deepEqual(normalizeFretRange(null, 5), [0, 15]);
  assert.deepEqual(normalizeFretRange(3, 4), [3, 7]);
  assert.deepEqual(normalizeFretRange(22, 40), [20, 24]);
  assert.deepEqual(normalizeFretRange('', ''), [0, 15]);
  const v = sanitizeView({ scaleId: 5, root: '', displayMode: 'x' });
  assert.equal(v.scaleId, null); assert.equal(v.root, 'auto'); assert.equal(v.displayMode, 'notes');
});

test('view rotation: changes every N repetitions and wraps around', () => {
  const at = (rep, every, n) => viewIndexForRepetition(rep, every, n);
  assert.deepEqual([0, 1, 2, 3, 4].map(r => at(r, 1, 3)), [0, 1, 2, 0, 1]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(r => at(r, 2, 2)), [0, 0, 1, 1, 0, 0]);
  assert.equal(at(7, 1, 1), 0);
  assert.equal(at(-1, 1, 3), 0);
});

test('fretWindows builds stepped positions inheriting scale settings', () => {
  const w = fretWindows({ scaleId: 'dorian', root: 'D', displayMode: 'degrees' });
  assert.ok(w.length >= 4);
  assert.equal(w[0].fretStart, 0);
  assert.ok(w.every(v => v.scaleId === 'dorian' && v.root === 'D' && v.displayMode === 'degrees'));
  assert.ok(w.every(v => v.fretEnd - v.fretStart >= 4 && v.fretEnd <= 15));
  assert.equal(w.at(-1).fretEnd, 15);
});

test('locateChord handles whole-bar and split-bar chords', () => {
  const chords = [{ beats: 4 }, { beats: 2 }, { beats: 2 }, { beats: 4 }];
  assert.equal(locateChord(chords, 4, 0, 3).index, 0);
  assert.equal(locateChord(chords, 4, 1, 1).index, 1);
  assert.equal(locateChord(chords, 4, 1, 2).index, 2);
  assert.equal(locateChord(chords, 4, 2, 0).index, 3);
  assert.equal(locateChord(chords, 4, 2, 0).next, 0);
  assert.deepEqual(locateChord([], 4, 0, 0), { index: -1, next: -1 });
});

test('duration estimate and formatting', () => {
  const sec = estimateDurationSec({ chords: Array(4).fill({}), beatsPerBar: 4, tempo: 120, repetitions: 2 });
  assert.equal(sec, Math.round((16 * 2 + 4) * 0.5));
  assert.equal(formatDuration(75), '1:15');
});

test('recorder format prefers MP4 and falls back to WebM', () => {
  assert.equal(pickRecorderFormat(() => true).ext, 'mp4');
  assert.equal(pickRecorderFormat(m => m.startsWith('video/webm')).ext, 'webm');
  assert.equal(pickRecorderFormat(() => false), null);
  assert.equal(pickRecorderFormat(undefined), null);
  assert.match(exportFileName({ genre: 'jazz swing/x', ext: 'mp4', now: new Date(2026, 10, 3, 9, 5) }), /^backing-track-jazz-swing-x-20261103-0905\.mp4$/);
});

test('neck model: chord tones, root and scale notes inside the fret window', () => {
  assert.equal(noteAt(1, 0), 'E'); assert.equal(noteAt(6, 5), 'A'); assert.equal(noteAt(2, 1), 'C');
  const m = buildNeckModel({ scaleId: 'dorian', root: 'auto', fretStart: 5, fretEnd: 9 }, 'Dm7');
  assert.equal(m.chordRoot, 'D');
  assert.ok(m.dots.every(d => d.fret >= 5 && d.fret <= 9));
  const roleOn = (string) => Object.fromEntries(m.dots.filter(d => d.string === string).map(d => [d.note, d.role]));
  assert.equal(roleOn(5).D, 'chordRoot');      // A string, fret 5
  assert.equal(roleOn(1).C, 'chordTone');      // high E string, fret 8 = b7 of Dm7
  assert.equal(roleOn(1).B, 'scale');          // fret 7 = 6th, scale-only
  assert.ok(!m.dots.some(d => d.note === 'C#'));
  const arp = buildNeckModel({ scaleId: null, fretStart: 0, fretEnd: 12 }, 'G7');
  assert.ok(arp.dots.every(d => d.role !== 'scale'));
  assert.deepEqual([...new Set(arp.dots.map(d => d.note))].sort(), ['B', 'D', 'F', 'G']);
  const fixed = buildNeckModel({ scaleId: 'major_pentatonic', root: 'C', fretStart: 0, fretEnd: 12 }, 'Am7');
  assert.equal(fixed.scaleRoot, 'C');
});

const deps = {
  chordSymbol: c => c.sym, pretty: s => s.replace('b', '♭'), noteLabel: n => n, scaleName: id => id,
};
const labels = { chordTones: 'Chord tones', frets: 'Frets' };
const chords = [{ sym: 'Dm7' }, { sym: 'G7' }, { sym: 'Cmaj7' }, { sym: 'Bb7', beats: 4 }];
const views = [sanitizeView({ scaleId: 'dorian', fretStart: 0, fretEnd: 5 }), sanitizeView({ scaleId: 'mixolydian', fretStart: 5, fretEnd: 9 })];
const base = { settings: { repetitions: 4, rotateEvery: 2, views }, meta: { styleName: 'Swing', keyLabel: 'C', tempo: 120 }, labels, deps };
const live = (over) => ({ isPlaying: true, currentBar: 0, currentBeat: 0, loopCount: 0, playbackPhase: 'main', chords, beatsPerBar: 4, ...over });

test('scene: chord, next chord, rep, view rotation and count-in', () => {
  const a = buildScene({ ...base, live: live({ currentBar: 1, currentBeat: 2 }) });
  assert.equal(a.chordLabel, 'G7'); assert.equal(a.nextLabel, 'Cmaj7'); assert.equal(a.beat, 2);
  assert.equal(a.chips.filter(c => c.active).length, 1);
  assert.equal(a.viewIndex, 0); assert.equal(a.repIndex, 0);
  assert.equal(buildScene({ ...base, live: live({ loopCount: 1 }) }).viewIndex, 0);
  assert.equal(buildScene({ ...base, live: live({ loopCount: 2 }) }).viewIndex, 1);
  assert.equal(buildScene({ ...base, live: live({ loopCount: 4, playbackPhase: 'ending' }) }).repIndex, 3); // clamped
  const intro = buildScene({ ...base, live: live({ playbackPhase: 'intro', currentBar: 3, currentBeat: 1 }) });
  assert.equal(intro.phase, 'intro'); assert.equal(intro.chordLabel, 'Dm7');
  assert.match(a.viewCaption, /dorian/);
  assert.equal(buildScene({ ...base, settings: { ...base.settings, views: [] }, live: live() }).viewCount, 1);
});

test('progress runs 0..1 across repetitions', () => {
  const p = (o) => progressFraction({ live: live(o), repetitions: 2 });
  assert.equal(p({ playbackPhase: 'intro' }), 0);
  assert.equal(p({ currentBar: 2, currentBeat: 0 }), 0.25);
  assert.equal(p({ loopCount: 1, currentBar: 0 }), 0.5);
  assert.equal(p({ loopCount: 2 }), 1);
});

// ── exporter lifecycle with fake browser objects ──────────────────────────────
function fakeEnv({ mp4 = true } = {}) {
  const ctx = new Proxy({}, {
    get: (t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : () => {})),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const makeCanvas = () => ({ width: 0, height: 0, getContext: () => ctx, captureStream: () => ({ getVideoTracks: () => [{ stop() {} }] }) });
  class Rec {
    static isTypeSupported(m) { return mp4 || m.startsWith('video/webm'); }
    constructor(stream, opts) { this.opts = opts; this.state = 'inactive'; Rec.last = this; }
    start() { this.state = 'recording'; setTimeout(() => this.ondataavailable({ data: new Blob(['abc']) }), 5); }
    stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  }
  globalThis.MediaStream = class { constructor(t) { this.t = t; } getTracks() { return this.t; } };
  return { env: { document: { createElement: makeCanvas }, MediaRecorder: Rec }, Rec };
}

function exportOpts(env, extra = {}) {
  const state = { ...live({ isPlaying: false }) };
  const calls = [];
  return {
    state, calls,
    opts: {
      ...base, env,
      settings: { ...base.settings, resolution: '720p' },
      getLive: () => state,
      prepare: async () => { calls.push('prepare'); },
      startPlayback: async (loops) => { calls.push(`play:${loops}`); state.isPlaying = true; setTimeout(() => { state.isPlaying = false; }, 120); return true; },
      stopPlayback: (hard) => calls.push(`stop:${hard}`),
      captureAudio: () => ({ stream: { getAudioTracks: () => [{ stop() {} }] }, dispose: () => calls.push('dispose') }),
      logo: null, onProgress: () => {}, signal: new AbortController().signal,
      ...extra,
    },
  };
}

test('exporter records until playback ends, returns MP4 blob and releases the audio tap', async () => {
  const { env, Rec } = fakeEnv();
  const { opts, calls } = exportOpts(env);
  const out = await runExport(opts);
  assert.equal(out.ext, 'mp4'); assert.equal(out.blob.type, 'video/mp4'); assert.ok(out.blob.size > 0);
  assert.deepEqual(calls.filter(c => c !== 'dispose').slice(0, 2), ['prepare', 'play:4']);
  assert.ok(calls.includes('dispose'));
  assert.equal(Rec.last.opts.audioBitsPerSecond, AUDIO_BITRATE);
  assert.equal(Rec.last.opts.videoBitsPerSecond, VIDEO_BITRATES['720p']);
});

test('exporter falls back to WebM when MP4 recording is unavailable', async () => {
  const { env } = fakeEnv({ mp4: false });
  const out = await runExport(exportOpts(env).opts);
  assert.equal(out.ext, 'webm');
});

test('exporter cancel stops playback hard and rejects with ExportCancelled', async () => {
  const { env } = fakeEnv();
  const ac = new AbortController();
  const { opts, calls, state } = exportOpts(env, { signal: ac.signal });
  opts.startPlayback = async () => { state.isPlaying = true; setTimeout(() => ac.abort(), 60); return true; };
  await assert.rejects(runExport(opts), ExportCancelled);
  assert.ok(calls.includes('stop:true'));
  assert.ok(calls.includes('dispose'));
});

test('exporter surfaces playback failure and unsupported recorders', async () => {
  const { env } = fakeEnv();
  const { opts, calls } = exportOpts(env);
  opts.startPlayback = async () => false;
  await assert.rejects(runExport(opts), /playback-failed/);
  assert.ok(calls.includes('stop:true'));
  const noRec = fakeEnv();
  noRec.env.MediaRecorder.isTypeSupported = () => false;
  await assert.rejects(runExport(exportOpts(noRec.env).opts), /recording-unsupported/);
});

test('a bare video/mp4 (possibly VP9-in-MP4) is never chosen over WebM', () => {
  assert.equal(pickRecorderFormat(m => m === 'video/mp4' || m.startsWith('video/webm')).ext, 'webm');
});

// ── long (5–10 min) exports ───────────────────────────────────────────────────
test('long exports: repetition cap and length presets reach 5–10 minutes on fast short forms', () => {
  const vamp = Array(4).fill({});                       // 4-bar Am–G7 bossa at 190 BPM ≈ 5.05 s per repetition
  assert.ok(Math.abs(repetitionSec({ chords: vamp, beatsPerBar: 4, tempo: 190 }) - 5.0526) < 0.001);
  const reps10 = repetitionsForMinutes({ chords: vamp, beatsPerBar: 4, tempo: 190, minutes: 10 });
  assert.equal(reps10, 119);
  assert.ok(reps10 <= MAX_REPETITIONS);
  assert.equal(sanitizeSettings({ repetitions: reps10 }).repetitions, 119);   // not clamped any more
  const sec = estimateDurationSec({ chords: vamp, beatsPerBar: 4, tempo: 190, repetitions: reps10 });
  assert.ok(sec >= 595 && sec <= 605, `got ${sec}`);
  // even the slowest lesson form (24 bars at 60 BPM = 96 s) stays reachable
  assert.equal(repetitionsForMinutes({ chords: Array(24).fill({}), beatsPerBar: 4, tempo: 60, minutes: 5 }), 3);
  // 10 minutes of 720p stays a manageable download
  assert.ok(estimateBytes(600, '720p') < 200 * 1048576);
  assert.ok(estimateBytes(600, '1080p') > estimateBytes(600, '720p'));
});

test('exporter refuses runs longer than MAX_EXPORT_SEC before loading anything', async () => {
  const { env } = fakeEnv();
  const { opts, calls } = exportOpts(env);
  const reps = Math.ceil((MAX_EXPORT_SEC + 60) / 8);   // 4 bars at 120 BPM = 8 s per repetition
  opts.settings = { ...opts.settings, repetitions: reps };
  await assert.rejects(runExport(opts), /export-too-long/);
  assert.deepEqual(calls, []);
});

/** Deterministic virtual clock: timers fire only when the exporter "sleeps". */
function virtualClock() {
  let t = 0; let seq = 0;
  const timers = new Map();
  const advance = (ms) => {
    const end = t + ms;
    for (;;) {
      let next = null;
      for (const [id, tm] of timers) if (tm.at <= end && (!next || tm.at < next[1].at)) next = [id, tm];
      if (!next) break;
      const [id, tm] = next;
      t = tm.at;
      if (tm.every) tm.at += tm.every; else timers.delete(id);
      tm.fn();
    }
    t = end;
  };
  return {
    now: () => t,
    sleep: async (ms) => advance(ms),
    setInterval: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: t + ms, every: ms }); return id; },
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: t + ms }); return id; },
    clearInterval: (id) => timers.delete(id),
  };
}

test('a 10-minute export completes: ~600 one-second chunks, progress to 100 %, views rotate, hidden time measured', async () => {
  const clock = virtualClock();
  const listeners = {};
  const doc = {
    visibilityState: 'visible',
    createElement: fakeEnv().env.document.createElement,
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
    removeEventListener: (ev) => { delete listeners[ev]; },
  };
  const lock = { released: false, release() { this.released = true; } };
  let lockRequests = 0;
  class Rec {
    static isTypeSupported() { return true; }
    constructor(stream, opts) { this.opts = opts; this.state = 'inactive'; }
    start(slice) {
      this.state = 'recording';
      this.timer = clock.setInterval(() => this.ondataavailable({ data: new Blob([new Uint8Array(16)]) }), slice);
    }
    stop() { clock.clearInterval(this.timer); this.ondataavailable({ data: new Blob([new Uint8Array(16)]) }); this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  }
  const env = {
    document: doc, MediaRecorder: Rec, navigator: { wakeLock: { request: async () => { lockRequests++; return lock; } } },
    now: clock.now, sleep: clock.sleep, setInterval: clock.setInterval, clearInterval: clock.clearInterval,
  };
  // 4 bars at 120 BPM = 8 s per repetition → 75 repetitions = 600 s of music.
  const reps = 75;
  const { opts, state } = exportOpts(env);
  opts.settings = { ...opts.settings, repetitions: reps, rotateEvery: 5 };
  const progress = [];
  const viewIdx = new Set();
  opts.onProgress = (p) => { if (p.stage === 'recording') progress.push(p.progress); };
  const origGetLive = opts.getLive;
  opts.getLive = () => { const l = origGetLive(); viewIdx.add(buildScene({ ...base, settings: opts.settings, live: l }).viewIndex); return l; };
  opts.startPlayback = async (loops) => {
    assert.equal(loops, reps);
    state.isPlaying = true;
    const startT = clock.now();
    const tick = clock.setInterval(() => {
      const beats = Math.floor((clock.now() - startT) / 500);          // 120 BPM
      state.loopCount = Math.floor(beats / 16);
      state.currentBar = Math.floor((beats % 16) / 4);
      state.currentBeat = beats % 4;
      if (state.loopCount >= loops) { state.isPlaying = false; clock.clearInterval(tick); }
    }, 100);
    // the student switches tabs for 30 s in the middle
    clock.setTimeout(() => { doc.visibilityState = 'hidden'; listeners.visibilitychange?.(); }, 200_000);
    clock.setTimeout(() => { doc.visibilityState = 'visible'; listeners.visibilitychange?.(); }, 230_000);
    return true;
  };
  const out = await runExport(opts);
  assert.ok(out.chunkCount >= 600 && out.chunkCount <= 603, `chunks ${out.chunkCount}`);
  assert.ok(clock.now() >= 600_000 && clock.now() < 603_000, `virtual ms ${clock.now()}`);
  assert.equal(out.hiddenMs, 30_000);
  assert.ok(lockRequests >= 2, 'wake lock taken and re-taken after the tab came back');
  assert.ok(lock.released);
  assert.ok(Math.max(...progress) >= 0.99);
  for (let i = 1; i < progress.length; i++) assert.ok(progress[i] >= progress[i - 1] - 1e-9, 'progress never goes back');
  assert.deepEqual([...viewIdx].sort(), [0, 1]);                       // both neck views were shown
});

test('neck model: a lesson shape limits dots to its cells and sets the fret window', () => {
  const m = buildNeckModel(sanitizeView({ scaleId: 'aeolian', root: 'A', shapeId: 'octave_134', shapeKey: 'C' }), 'Am');
  assert.equal(m.shapeId, 'octave_134');
  assert.deepEqual([m.fretStart, m.fretEnd], [4, 14]);
  assert.equal(m.dots.length, 20);
  assert.ok(m.dots.some(d => d.string === 6 && d.fret === 5 && d.role === 'chordRoot'));
  assert.ok(!m.dots.some(d => d.string === 6 && d.fret === 10));       // in A minor but outside the box
  const g = buildNeckModel(sanitizeView({ scaleId: 'ionian', root: 'G', shapeId: 'octave_134', shapeKey: 'G' }), 'G');
  assert.equal(g.fretStart, 0);
  assert.equal(sanitizeView({ shapeId: 'bogus', shapeKey: 'H' }).shapeId, null);
  assert.equal(sanitizeView({ shapeId: 'nps3_2', shapeKey: 'Bb' }).shapeKey, 'A#');
});

test('two necks per screen: views shown in pairs, shared fret range, frames + pentatonic emphasis', () => {
  const v1 = sanitizeView({ scaleId: 'aeolian', root: 'A', shapeIds: ['caged_C', 'caged_G', 'caged_D'], shapeKey: 'C', emphasis: 'pentatonic' });
  const v2 = sanitizeView({ ...v1, shapeIds: ['caged_A', 'caged_E'] });
  const settings = { repetitions: 4, rotateEvery: 1, necksPerScreen: 2, views: [v1, v2] };
  const sc = buildScene({ ...base, settings, live: live({ chords: [{ sym: 'Am' }, { sym: 'G7' }] }) });
  assert.equal(sc.layout, 'dual');
  assert.equal(sc.necks.length, 2);
  assert.deepEqual([sc.necks[0].neck.fretStart, sc.necks[0].neck.fretEnd], [sc.necks[1].neck.fretStart, sc.necks[1].neck.fretEnd]);
  assert.deepEqual(sc.necks[0].neck.frames.map(f => f.label), ['C', 'G', 'D']);
  assert.deepEqual(sc.necks[1].neck.frames.map(f => f.label), ['A', 'E']);
  assert.equal(sc.viewCount, 1);
  // F (outside A minor pentatonic) is softened, C (in it) is not; chord tones never are.
  const dots = sc.necks[0].neck.dots;
  assert.ok(dots.some(d => d.note === 'F' && d.soft));
  assert.ok(dots.filter(d => d.note === 'C').every(d => !d.soft));
  assert.ok(dots.filter(d => d.role !== 'scale').every(d => !d.soft));
  // 4 views, 2 per screen → two screens that rotate
  const four = { ...settings, views: [v1, v2, v1, v2], rotateEvery: 2 };
  assert.equal(buildScene({ ...base, settings: four, live: live({ loopCount: 2 }) }).viewIndex, 1);
  assert.equal(sanitizeSettings({ necksPerScreen: 7 }).necksPerScreen, 1);
  assert.deepEqual(sanitizeView({ shapeId: 'octave_124' }).shapeIds, ['octave_124']);
});

test('renderer draws the two-neck layout (frames, both necks) without throwing', async () => {
  const { drawFrame, createAssets } = await import('../src/lib/video-export/renderFrame.js');
  const calls = { strokeRect: 0, fillText: [] };
  const ctx = new Proxy({}, {
    get: (t, k) => (k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 })
      : k === 'strokeRect' ? () => { calls.strokeRect++ } : k === 'fillText' ? (txt) => { calls.fillText.push(String(txt)) } : (k in t ? t[k] : () => {})),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const assets = createAssets({ makeCanvas: () => ({ getContext: () => ctx }) });
  // Several positions on a neck → each frame is tagged above the board.
  const v1 = sanitizeView({ scaleId: 'ionian', root: 'C', shapeIds: ['caged_C', 'caged_G', 'caged_D'], shapeKey: 'C' });
  const v2 = sanitizeView({ ...v1, shapeIds: ['caged_A', 'caged_E'] });
  const sc = buildScene({ ...base, settings: { repetitions: 2, rotateEvery: 1, necksPerScreen: 2, views: [v1, v2] }, live: live() });
  drawFrame(ctx, sc, assets);
  assert.equal(calls.strokeRect, 2);                        // two boards
  for (const tag of ['C', 'G', 'D', 'A', 'E']) assert.ok(calls.fillText.includes(tag), tag);
  // One position per neck → no tags (the caption already names it).
  calls.fillText.length = 0;
  const o1 = sanitizeView({ scaleId: 'ionian', root: 'C', shapeIds: ['octave_134'], shapeKey: 'C' });
  const o2 = sanitizeView({ ...o1, shapeIds: ['octave_124'] });
  drawFrame(ctx, buildScene({ ...base, settings: { repetitions: 2, rotateEvery: 1, necksPerScreen: 2, views: [o1, o2] }, live: live() }), assets);
  assert.ok(!calls.fillText.includes('1-3-4') && !calls.fillText.includes('1-2-4'));
});

test('neck notes are spelled by the track key (C blues: F7 shows E♭, not D♯)', async () => {
  const { spellingForKey } = await import('../src/lib/video-export/neckModel.js');
  assert.equal(spellingForKey({ root: 'C', type: 'major' }), 'flat');
  assert.equal(spellingForKey({ root: 'A', type: 'minor' }), 'flat');
  assert.equal(spellingForKey({ root: 'E', type: 'major' }), 'sharp');
  assert.equal(spellingForKey({ root: 'C#', type: 'minor' }), 'sharp');
  assert.equal(spellingForKey({ root: 'Bb', type: 'major' }), 'flat');
  const v = sanitizeView({ scaleId: 'ionian', root: 'C', shapeIds: ['caged_C'], shapeKey: 'C' });
  const sc = buildScene({ ...base, settings: { repetitions: 1, rotateEvery: 1, views: [v] },
    meta: { ...base.meta, key: { root: 'C', type: 'major' } }, live: live({ chords: [{ sym: 'F7' }] }) });
  const names = new Set(sc.neck.dots.filter(d => d.role !== 'scale').map(d => d.name));
  assert.ok(names.has('Eb') && !names.has('D#'));
});
