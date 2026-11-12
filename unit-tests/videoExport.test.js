import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeSettings, sanitizeView, normalizeFretRange, viewIndexForRepetition, fretWindows,
  locateChord, estimateDurationSec, formatDuration, pickRecorderFormat, exportFileName,
  DEFAULT_SETTINGS, MAX_REPETITIONS, MAX_VIEWS,
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
  assert.equal(Rec.last.opts.audioBitsPerSecond, 192000);
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
