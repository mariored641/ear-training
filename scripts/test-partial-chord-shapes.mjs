// Validates every (cagedShape, root, quality) combination in
// src/utils/partialChordShapes.js by computing the actual note that
// lands on each declared string/fret and comparing it to the declared tone.
//
// Run: node scripts/test-partial-chord-shapes.mjs
// Exits with code 1 if any shape mis-declares a tone.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Strip Vite-style relative imports so we can load ES modules from Node.
async function importNoExt(path) {
  const url = 'file://' + resolve(root, path).replaceAll('\\', '/');
  return await import(url);
}

const positionData = await importNoExt('src/constants/positionData.js');
const shapes = await importNoExt('src/utils/partialChordShapes.js');

const { CHROMATIC_SCALE, STRING_TUNING } = positionData;
const { PARTIAL_CHORD_SHAPES, INTERVAL_SEMITONES, getBarreFret, getNoteAtFret, getNoteNameForTone } = shapes;

const ALL_ROOTS = CHROMATIC_SCALE; // all 12 roots
const QUALITIES = ['major', 'minor'];
const SHAPES = ['C', 'A', 'G', 'E', 'D'];

const errors = [];

function validate(cagedLetter, root, quality) {
  const shape = PARTIAL_CHORD_SHAPES[quality][cagedLetter];
  const barre = getBarreFret(cagedLetter, root);

  shape.forEach((entry, i) => {
    if (!entry) return;
    const stringNum = 6 - i;                 // index 0 = S6
    const absFret = barre + entry.fretOffset;
    const actualNote = getNoteAtFret(stringNum, absFret);
    const expectedNote = getNoteNameForTone(root, entry.tone);
    if (actualNote !== expectedNote) {
      errors.push(
        `${root}${quality === 'minor' ? 'm' : ''}  ${cagedLetter}-shape  S${stringNum}: ` +
        `declared tone "${entry.tone}" (=${expectedNote})  →  actual note at ` +
        `fret ${absFret} is ${actualNote}`
      );
    }
  });
}

// Barre-fret sanity checks (hand-verified standard barre positions)
const BARRE_FRET_CASES = [
  { caged: 'E', root: 'A', expected: 5 },  // Am E-shape barred at fret 5
  { caged: 'A', root: 'A', expected: 0 },  // Open A
  { caged: 'A', root: 'D', expected: 5 },  // D using A-shape, barre fret 5
  { caged: 'E', root: 'G', expected: 3 },  // G using E-shape, barre fret 3
  { caged: 'D', root: 'A', expected: 7 },  // A using D-shape, root on S4 fret 7
  { caged: 'G', root: 'C', expected: 5 },  // C using G-shape: root on S6 fret 8 - 3 = 5
  { caged: 'G', root: 'G', expected: 0 },  // Open G
  { caged: 'C', root: 'D', expected: 2 },  // D using C-shape, root on S5 fret 5 - 3 = 2
];

let barreErrors = 0;
for (const c of BARRE_FRET_CASES) {
  const got = getBarreFret(c.caged, c.root);
  if (got !== c.expected) {
    barreErrors++;
    console.log(`BARRE FAIL: ${c.caged}-shape of ${c.root}: expected fret ${c.expected}, got ${got}`);
  }
}

for (const root of ALL_ROOTS) {
  for (const quality of QUALITIES) {
    for (const caged of SHAPES) {
      validate(caged, root, quality);
    }
  }
}

if (errors.length === 0 && barreErrors === 0) {
  console.log(`OK: all ${ALL_ROOTS.length * QUALITIES.length * SHAPES.length} shape variants validate; all barre-fret cases pass.`);
  process.exit(0);
} else {
  console.log(`\n${errors.length} tone error(s), ${barreErrors} barre error(s):`);
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
