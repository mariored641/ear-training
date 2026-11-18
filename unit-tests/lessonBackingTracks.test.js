import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  LESSONS, TRACKS, TRACK_TYPES, NECKS, trackBars, trackChords, lessonPreset, lessonPresetVariants, exportPlanFor, chord, barsToChords,
  MIN_SEC, MAX_SEC, INTRO_ENDING_ALLOWANCE_SEC, TARGET_SEC,
} from '../src/data/lessonBackingTracks.js';
import { validProgression } from '../src/utils/backingState.js';
import { sanitizeSettings, MAX_REPETITIONS, MAX_ROTATE_EVERY, MAX_EXPORT_SEC } from '../src/lib/video-export/exportPlan.js';
import { isShapeId } from '../src/constants/neckShapes.js';

const engineSrc = fs.readFileSync(new URL('../src/components/backing-tracks/useBackingTrackEngine.js', import.meta.url), 'utf8');
const GENRES = new Set([...engineSrc.matchAll(/\{ id: '([a-z0-9_]+)',\s*label:/g)].map(m => m[1]));

test('chord parser builds app chord objects (incl. half bars)', () => {
  assert.deepEqual(chord('Am'), { root: 'A', quality: 'minor', extensions: [] });
  assert.deepEqual(chord('G7'), { root: 'G', quality: 'major', extensions: ['7'] });
  assert.deepEqual(chord('C#m7'), { root: 'C#', quality: 'minor', extensions: ['7'] });
  assert.deepEqual(barsToChords(['Am F']).map(c => c.beats), [2, 2]);
  assert.throws(() => chord('H7'));
});

test('12 lessons, every lesson has presets, every track is valid and 4/4-playable', () => {
  assert.deepEqual(LESSONS.map(l => l.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const l of LESSONS) assert.ok(l.items.length > 0, `lesson ${l.n}`);
  for (const t of TRACKS) {
    assert.ok(GENRES.has(t.genre), `${t.id}: unknown style ${t.genre}`);
    assert.ok(validProgression(trackChords(t)), t.id);
    assert.ok(t.tempo >= 40 && t.tempo <= 240, t.id);
    if (t.source.kind === 'youtube') {
      assert.equal(trackBars(t).length, t.source.measured.formBars, `${t.id} form length`);
      assert.equal(t.tempo, t.source.measured.bpm, `${t.id} tempo`);
    }
  }
  assert.equal(new Set(TRACKS.map(t => t.id)).size, TRACKS.length);
});

test('every track type has at least 5 different styles', () => {
  for (const type of Object.keys(TRACK_TYPES)) {
    const styles = new Set(TRACKS.filter(t => t.type === type).map(t => t.genre));
    assert.ok(styles.size >= 5, `${type}: ${styles.size}`);
  }
});

test('every lesson export lands in 5–10 minutes and fits the dialog limits', () => {
  for (const l of LESSONS) {
    for (const item of l.items) {
      const t = TRACKS.find(x => x.id === item.trackId);
      for (const v of NECKS[item.neck].variants) {
      const plan = exportPlanFor(t, item.neck, v.id);
      assert.ok(plan.musicSec >= MIN_SEC && plan.musicSec + INTRO_ENDING_ALLOWANCE_SEC <= MAX_SEC, `L${l.n} ${t.id}: ${plan.musicSec}`);
      assert.ok(plan.dialogEstimateSec >= MIN_SEC && plan.dialogEstimateSec <= MAX_SEC && plan.dialogEstimateSec <= MAX_EXPORT_SEC);
      assert.ok(plan.repetitions <= MAX_REPETITIONS && plan.rotateEvery <= MAX_ROTATE_EVERY);
      assert.ok(plan.views.every(x => x.shapeIds.length >= 1 && x.shapeIds.every(isShapeId)));
      assert.ok(plan.views.length >= plan.necksPerScreen);
      }
    }
  }
});

test('lesson preset = backing state + export settings that survive sanitising', () => {
  const p = lessonPreset(1, 'amg7-bossa');
  assert.equal(p.id, 'L1-amg7-bossa');
  assert.deepEqual(p.key, { root: 'A', type: 'minor' });
  assert.equal(p.genre, 'latin_fastbossa'); assert.equal(p.tempo, 190);
  assert.deepEqual(p.chords.map(c => c.root), ['A', 'G', 'A', 'G']);
  // Answer 2: octave positions on two necks by default, single shapes as extra videos.
  assert.equal(p.export.necksPerScreen, 2);
  assert.deepEqual(p.export.views.map(v => v.shapeIds), [['octave_134'], ['octave_124']]);
  assert.deepEqual(lessonPresetVariants(1, 'amg7-bossa').map(x => x.id),
    ['L1-amg7-bossa', 'L1-amg7-bossa~134', 'L1-amg7-bossa~124', 'L1-amg7-bossa~hybrid']);
  const s = sanitizeSettings({ resolution: '720p', ...p.export });
  assert.equal(s.repetitions, p.export.repetitions);
  assert.equal(s.rotateEvery, p.export.rotateEvery);
  assert.equal(s.necksPerScreen, 2);
  assert.deepEqual(s.views, p.export.views);
  const blues = lessonPreset(4, 'blues-Bm');
  assert.equal(blues.export.views[0].shapeKey, 'D');                 // B minor → D major shapes
  // Answer 6: full scale with the pentatonic highlighted; answer 8: all positions on two necks.
  assert.equal(blues.export.views[0].scaleId, 'aeolian');
  assert.equal(blues.export.views[0].emphasis, 'pentatonic');
  assert.deepEqual(blues.export.views.map(v => v.shapeIds), [['caged_C', 'caged_G', 'caged_D'], ['caged_A', 'caged_E']]);
  assert.deepEqual(lessonPreset(6, 'amdmem-blues').export.views.map(v => v.shapeIds), [['caged_G'], ['caged_E']]);
  assert.equal(lessonPreset(1, 'nope'), null);
  assert.equal(lessonPreset(99, 'amg7-bossa'), null);
});

test('the committed spec is generated from the data file (no drift)', () => {
  execFileSync(process.execPath, ['scripts/gen-lesson-spec.mjs', '--check'], { stdio: 'pipe' });
});

test('answer 5: blues styles vary and never repeat on neighbouring keys (incl. B → C)', () => {
  for (const type of ['blues-major', 'blues-minor']) {
    const ts = TRACKS.filter(t => t.type === type);
    assert.equal(ts.length, 12);
    for (let i = 0; i < ts.length; i++) assert.notEqual(ts[i].genre, ts[(i + 1) % ts.length].genre, `${ts[i].id}`);
    assert.ok(new Set(ts.map(t => t.genre)).size >= 6);
  }
});

test('answer 9: presets aim at ~8 minutes', () => {
  assert.equal(TARGET_SEC, 480);
  const lens = LESSONS.flatMap(l => l.items.map(i => exportPlanFor(TRACKS.find(t => t.id === i.trackId), i.neck).musicSec));
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  assert.ok(avg > 450 && avg < 520, `avg ${avg}`);
});

// ── Round 3 (Mario): the full working scale is always visible; highlight sits on top ──
import { buildScene } from '../src/lib/video-export/scene.js';
import { ALL_SCALES_MAP, computeNotes } from '../src/constants/allScalesData.js';

const ascii = (c) => `${c.root}${c.quality === 'minor' ? 'm' : ''}${(c.extensions || []).join('')}`;
const sceneDeps = { chordSymbol: ascii, pretty: s => s, noteLabel: n => n, scaleName: id => id };

test('every lesson view (all versions) names a full scale — never chord tones or pentatonic alone', () => {
  for (const l of LESSONS) {
    for (const item of l.items) {
      for (const p of lessonPresetVariants(l.n, item.trackId)) {
        for (const v of p.export.views) {
          assert.ok(['ionian', 'aeolian'].includes(v.scaleId), `${p.id}: ${v.scaleId}`);
          assert.ok(v.emphasis === null || v.emphasis === 'arpeggio' || v.emphasis === 'pentatonic');
        }
      }
    }
  }
  const emph = (n, id) => lessonPreset(n, id).export.views[0].emphasis;
  assert.equal(emph(5, 'cfg-rock'), 'arpeggio');
  assert.equal(emph(6, 'amdmem-blues'), 'arpeggio');
  assert.equal(emph(7, 'cam-easy'), 'arpeggio');
  assert.equal(emph(4, 'blues-C'), 'pentatonic');
});

test('rendered necks of every lesson 1–8 default preset contain all 7 scale notes, with the highlight on top', () => {
  for (const l of LESSONS.filter(x => x.n <= 8)) {
    for (const item of l.items) {
      const p = lessonPreset(l.n, item.trackId);
      const settings = sanitizeSettings({ ...p.export, resolution: '720p' });
      for (const [ci, c] of p.chords.slice(0, 4).entries()) {
        let beats = 0; for (let i = 0; i < ci; i++) beats += p.chords[i].beats ?? 4;
        const scene = buildScene({
          live: { isPlaying: true, currentBar: Math.floor(beats / 4), currentBeat: beats % 4, loopCount: 0, playbackPhase: 'main', chords: p.chords, beatsPerBar: 4 },
          settings, meta: { styleName: 's', keyLabel: 'k', tempo: p.tempo, key: p.key }, labels: {}, deps: sceneDeps,
        });
        for (const { neck, view } of scene.necks) {
          const scaleNotes = new Set(computeNotes(view.root, ALL_SCALES_MAP[view.scaleId].intervals));
          const shown = new Set(neck.dots.map(d => d.note));
          for (const n of scaleNotes) assert.ok(shown.has(n), `${p.id} ${ascii(c)}: scale note ${n} missing`);
          assert.ok(neck.dots.some(d => d.role === 'scale'), `${p.id}: no background scale notes`);
          // Highlight: chord tones are never softened; arpeggio mode softens every other scale note.
          assert.ok(neck.dots.filter(d => d.role !== 'scale').every(d => !d.soft));
          if (view.emphasis === 'arpeggio') assert.ok(neck.dots.filter(d => d.role === 'scale').every(d => d.soft));
          if (view.emphasis === 'pentatonic') assert.ok(neck.dots.some(d => d.role === 'scale' && !d.soft));
        }
      }
    }
  }
});

test('a view without a scale falls back to the track key scale (no chord-tones-only neck)', () => {
  const p = lessonPreset(5, 'cfg-rock');
  const views = p.export.views.map(v => ({ ...v, scaleId: null, root: 'auto' }));
  const scene = buildScene({
    live: { isPlaying: true, currentBar: 0, currentBeat: 0, loopCount: 0, playbackPhase: 'main', chords: p.chords, beatsPerBar: 4 },
    settings: sanitizeSettings({ ...p.export, views }), meta: { styleName: 's', keyLabel: 'C', tempo: 75, key: { root: 'C', type: 'major' } },
    labels: {}, deps: sceneDeps,
  });
  assert.equal(scene.necks[0].neck.scaleId, 'ionian');
  assert.ok(scene.necks[0].neck.dots.some(d => d.role === 'scale' && d.note === 'D'));
});
