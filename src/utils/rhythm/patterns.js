import { BPM_MIN, BPM_MAX, BPM_DEFAULT } from '../../constants/exercise4Defaults.js';

export function clampTempo(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(number))) : BPM_DEFAULT;
}

// Keep four taps, allowing even a full minute between taps (1 BPM).
export function tapTempo(previous, now) {
  const taps = [...previous.filter(time => now - time <= 180001), now].slice(-4);
  const interval = (taps.at(-1) - taps[0]) / (taps.length - 1);
  const bpm = Math.round(60000 / interval);
  return { taps, bpm: bpm >= BPM_MIN && bpm <= BPM_MAX ? bpm : null };
}

export function resizeRow(row, count) {
  const size = Math.max(1, Math.min(16, Math.round(Number(count) || 1)));
  return { ...row, cells: Array.from({ length: size }, (_, i) => row.cells[i] ?? 'normal') };
}

export function createRow(id, count = 4) {
  return resizeRow({ id, cells: [] }, count);
}

export function polyrhythmPattern(rows) {
  return {
    length: 1,
    events: rows.flatMap(row => row.cells.map((state, cell) => ({
      beat: cell / row.cells.length, duration: 1 / row.cells.length,
      row: row.id, cell, state, accent: cell === 0,
    }))),
  };
}

export function sequentialPattern(beats) {
  let position = 0;
  const events = beats.flatMap((beat, row) => {
    const duration = beat.length / beat.cells.length;
    const cells = beat.cells.map((state, cell) => ({
      beat: position + cell * duration, duration, row, cell, state, accent: cell === 0,
    }));
    position += beat.length;
    return cells;
  });
  return { length: position, events };
}

export function activeCells(pattern, position) {
  if (!pattern.length || position < 0) return {};
  const phase = position % pattern.length;
  return Object.fromEntries(pattern.events
    .filter(event => phase >= event.beat && phase < event.beat + event.duration)
    .map(event => [event.row, event.cell]));
}
