import { CHORD_QUALITIES } from './partialChordShapes.js';

const record = value => value && typeof value === 'object' && !Array.isArray(value);
const cells = value => Array.isArray(value) && value.length > 0 && value.every(cell => typeof cell === 'string' || Number.isFinite(cell));
const positive = value => Number.isFinite(value) && value > 0;

// Empty-array defaults cannot describe the shape of their entries. Validate
// editable records here before any renderer or audio scheduler consumes them.
export function validateToolState(id, value) {
  if (!record(value)) return value;
  const data = { ...value };
  if (id === 'positions-partial-sequence' && Array.isArray(data.progression)) {
    data.progression = data.progression.filter(chord => record(chord)
      && /^[A-G](?:#|b)?$/.test(chord.root) && Object.hasOwn(CHORD_QUALITIES, chord.quality)
      && Number.isInteger(chord.cagedIdx) && chord.cagedIdx >= 0 && chord.cagedIdx < 5
      && Number.isInteger(chord.setIdx) && chord.setIdx >= 0 && chord.setIdx < 10);
    data.activeIdx = Math.max(0, Math.min(Number(data.activeIdx) || 0, data.progression.length - 1));
  }
  if (id === 'rhythm-advanced' && Array.isArray(data.beats)) {
    data.beats = data.beats.filter(beat => record(beat) && positive(beat.length) && positive(beat.division) && cells(beat.cells));
  }
  if (id === 'rhythm-polyrhythm' && Array.isArray(data.rows)) {
    data.rows = data.rows.filter(row => record(row) && cells(row.cells));
  }
  if (id === 'rhythm-explorer' && Array.isArray(data.grid) && !data.grid.every(cells)) data.grid = [];
  if (id === 'positions-all-scales' && Array.isArray(data.overlays)) {
    data.overlays = data.overlays.filter(overlay => record(overlay) && typeof overlay.root === 'string' && typeof overlay.chordId === 'string');
  }
  if (id === 'looper' && (!Array.isArray(data.timeSignature) || data.timeSignature.length !== 2 || !data.timeSignature.every(positive))) data.timeSignature = [4, 4];
  return data;
}
