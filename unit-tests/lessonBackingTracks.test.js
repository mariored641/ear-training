import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { execFileSync } from 'child_process';
import {
  LESSONS, TRACKS, TRACK_TYPES, trackBars, trackChords, lessonPreset, exportPlanFor, chord, barsToChords,
  MIN_SEC, MAX_SEC, INTRO_ENDING_ALLOWANCE_SEC,
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
      const plan = exportPlanFor(t, item.neck);
      assert.ok(plan.musicSec >= MIN_SEC && plan.musicSec + INTRO_ENDING_ALLOWANCE_SEC <= MAX_SEC, `L${l.n} ${t.id}: ${plan.musicSec}`);
      assert.ok(plan.dialogEstimateSec >= MIN_SEC && plan.dialogEstimateSec <= MAX_SEC && plan.dialogEstimateSec <= MAX_EXPORT_SEC);
      assert.ok(plan.repetitions <= MAX_REPETITIONS && plan.rotateEvery <= MAX_ROTATE_EVERY);
      assert.ok(plan.views.length >= 2 && plan.views.every(v => isShapeId(v.shapeId)));
    }
  }
});

test('lesson preset = backing state + export settings that survive sanitising', () => {
  const p = lessonPreset(1, 'amg7-bossa');
  assert.equal(p.id, 'L1-amg7-bossa');
  assert.deepEqual(p.key, { root: 'A', type: 'minor' });
  assert.equal(p.genre, 'latin_fastbossa'); assert.equal(p.tempo, 190);
  assert.deepEqual(p.chords.map(c => c.root), ['A', 'G', 'A', 'G']);
  assert.deepEqual(p.export.views.map(v => v.shapeId), ['octave_134', 'octave_124', 'octave_hybrid']);
  const s = sanitizeSettings({ resolution: '720p', ...p.export });
  assert.equal(s.repetitions, p.export.repetitions);
  assert.equal(s.rotateEvery, p.export.rotateEvery);
  assert.deepEqual(s.views, p.export.views);
  const blues = lessonPreset(4, 'blues-Bm');
  assert.equal(blues.export.views[0].shapeKey, 'D');                 // B minor → D major shapes
  assert.equal(blues.export.views[0].scaleId, 'minor_pent');
  assert.equal(lessonPreset(1, 'nope'), null);
  assert.equal(lessonPreset(99, 'amg7-bossa'), null);
});

test('the committed spec is generated from the data file (no drift)', () => {
  execFileSync(process.execPath, ['scripts/gen-lesson-spec.mjs', '--check'], { stdio: 'pipe' });
});
