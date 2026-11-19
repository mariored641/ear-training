import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shapeCells, shapeSet, parseShapeIds, majorRootOf, SHAPE_IDS, isShapeId, shapeShortLabel } from '../src/constants/neckShapes.js';
import { C_AM_POSITION_RANGES } from '../src/constants/positionData.js';
import { noteAt } from '../src/lib/video-export/neckModel.js';

const C_MAJOR = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
const cells = (id, key) => shapeCells(id, key).list;

test('octave positions match Mario\'s diagram (A minor / C major) cell for cell', () => {
  // guitarscientist.com/diagrams/poo7u47 — "1-3-4" board, low E string first.
  const b134 = cells('octave_134', 'C').map(([s, f]) => `${s}:${f}`);
  assert.deepEqual(b134, ['6:5', '6:7', '6:8', '5:5', '5:7', '5:8', '4:5', '4:7', '4:9', '4:10', '3:7', '3:9', '3:10',
    '2:8', '2:10', '2:12', '2:13', '1:10', '1:12', '1:13']);
  assert.equal(cells('octave_124', 'C').length, 20);
  assert.equal(cells('octave_hybrid', 'C').length, 26);
  for (const id of ['octave_134', 'octave_124', 'octave_hybrid']) {
    for (const [s, f] of cells(id, 'C')) assert.ok(C_MAJOR.has(noteAt(s, f)), `${id} ${s}:${f} = ${noteAt(s, f)}`);
  }
});

test('the 2-string boxes repeat: +2 frets per string pair, +1 more across the B string', () => {
  const on = (s) => cells('octave_134', 'C').filter(([x]) => x === s).map(([, f]) => f);
  assert.deepEqual(on(5).map(f => f + 2), on(3));                     // strings 6-5 → 4-3
  assert.deepEqual(on(3).map(f => f + 3), on(1));                     // strings 4-3 → 2-1 (B-string shift)
});

test('shapes transpose with the key and always stay on the neck', () => {
  assert.equal(majorRootOf('A', 'minor'), 'C');
  assert.equal(majorRootOf('Eb', 'minor'), 'F#');
  assert.equal(majorRootOf('Bb', 'major'), 'A#');
  const g = cells('octave_134', 'G');
  assert.deepEqual(g[0], [6, 0]);                                      // E minor box at the nut
  for (const id of SHAPE_IDS) {
    for (const key of ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
      const r = shapeCells(id, key);
      assert.ok(r.fretStart >= 0 && r.fretEnd <= 24, `${id} in ${key}: ${r.fretStart}-${r.fretEnd}`);
    }
  }
});

test('3 notes per string: 18 scale notes, 3 per string, ascending in pitch', () => {
  const OPEN = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
  for (let d = 1; d <= 7; d++) {
    const list = cells(`nps3_${d}`, 'C');
    assert.equal(list.length, 18);
    for (let s = 1; s <= 6; s++) assert.equal(list.filter(([x]) => x === s).length, 3);
    const pitches = list.map(([s, f]) => OPEN[s] + f);
    for (let i = 1; i < pitches.length; i++) assert.ok(pitches[i] > pitches[i - 1]);
    for (const [s, f] of list) assert.ok(C_MAJOR.has(noteAt(s, f)));
    assert.ok(shapeCells(`nps3_${d}`, 'C').fretEnd - shapeCells(`nps3_${d}`, 'C').fretStart <= 6);
  }
  assert.deepEqual(cells('nps3_6', 'C').slice(0, 3), [[6, 5], [6, 7], [6, 8]]);  // starts on A
});

test('CAGED shapes reuse the Positions-tab windows', () => {
  for (const [pos, r] of Object.entries(C_AM_POSITION_RANGES)) {
    const c = shapeCells(`caged_${pos}`, 'C');
    assert.deepEqual([c.fretStart, c.fretEnd], [r.fretStart, r.fretEnd]);
  }
  assert.deepEqual([shapeCells('caged_E', 'D').fretStart, shapeCells('caged_E', 'D').fretEnd], [9, 12]);
  assert.equal(isShapeId('octave_134'), true);
  assert.equal(isShapeId('X'), false);
  assert.equal(shapeShortLabel('octave_hybrid'), '1-3-4/1-2-4');
  assert.equal(shapeCells('nope', 'C'), null);
});

test('two-neck combos: C·G·D and A·E never overlap and stay close to each other in every key', () => {
  for (const key of ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
    const a = shapeSet(['caged_C', 'caged_G', 'caged_D'], key);
    const b = shapeSet(['caged_A', 'caged_E'], key, { near: (a.fretStart + a.fretEnd) / 2 });
    for (const set of [a, b]) {
      const fr = [...set.frames].sort((x, y) => x.fretStart - y.fretStart);
      for (let i = 1; i < fr.length; i++) assert.ok(fr[i].fretStart > fr[i - 1].fretEnd, `${key} ${fr[i - 1].label}/${fr[i].label}`);
      assert.ok(set.fretStart >= 0 && set.fretEnd <= 24);
    }
    const span = Math.max(a.fretEnd, b.fretEnd) - Math.min(a.fretStart, b.fretStart);
    assert.ok(span <= 15, `${key}: shared range ${span}`);
  }
  const c = shapeSet('caged_C,caged_G,caged_D', 'C');
  assert.deepEqual(c.frames.map(f => [f.label, f.fretStart, f.fretEnd]), [['C', 0, 3], ['G', 4, 8], ['D', 9, 13]]);
});

test('octave frames: one box per string pair, labelled once', () => {
  const s = shapeSet(['octave_134'], 'C');
  assert.equal(s.frames.length, 3);
  assert.deepEqual(s.frames.map(f => [f.stringFrom, f.stringTo]), [[5, 6], [3, 4], [1, 2]]);
  assert.deepEqual(s.frames.map(f => f.label), ['1-3-4', '', '']);
  assert.deepEqual(parseShapeIds('caged_A, bogus,caged_A'), ['caged_A']);
  assert.equal(shapeSet([], 'C'), null);
});
