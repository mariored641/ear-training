// Keep complete chord objects (including half-bar durations, slash bass and extensions).
export function validProgression(chords) {
  return Array.isArray(chords) && chords.length > 0 && chords.every(chord =>
    chord && typeof chord === 'object' && /^[A-G](?:#|b)?$/.test(chord.root)
    && typeof chord.quality === 'string'
    && (chord.extensions === undefined || (Array.isArray(chord.extensions) && chord.extensions.every(ext => typeof ext === 'string')))
    && (chord.beats === undefined || (Number.isFinite(chord.beats) && chord.beats > 0))
  );
}

export function progressionBarCount(chords, beatsPerBar = 4) {
  return Math.max(1, Math.ceil(chords.reduce((sum, chord) => sum + (chord.beats ?? beatsPerBar), 0) / beatsPerBar));
}
