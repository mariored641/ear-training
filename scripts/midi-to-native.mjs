#!/usr/bin/env node
/**
 * midi-to-native.mjs — Package a folder of per-part MIDI files (composed in
 * Ableton or any DAW) into our native JSON style format.
 *
 * Used by the `genre-style-builder` skill after the user has composed Main_A,
 * Main_B, Fill_In_AA, Intro_A, Ending_A as MIDI files. Combines the composed
 * notes with CTAB defaults from a genre profile to produce a valid native
 * style JSON.
 *
 * Usage:
 *   node scripts/midi-to-native.mjs <midi-folder> \
 *     --profile <jazz|latin|blues|rock|country> \
 *     --id <styleId> \
 *     --label "<displayName>" \
 *     --category <jazz|latin|blues|rock|country> \
 *     --tempo <bpm>
 *
 * Expected folder layout:
 *   <midi-folder>/
 *     Main_A.mid       (multi-track MIDI; track N → channel N from profile)
 *     Main_B.mid
 *     Fill_In_AA.mid
 *     Intro_A.mid
 *     Ending_A.mid
 *
 * STATUS: NOT YET IMPLEMENTED. This is a stub. When the user first triggers
 * the genre-style-builder skill and reaches step 5, ask for confirmation
 * before writing the parser. Estimate: ~250 lines + tests.
 *
 * The implementation will need:
 *   - A MIDI parser (e.g., 'midi-parser-js' npm package, or hand-rolled
 *     reusing MidiTrack-parsing logic from src/lib/style-engine/StyleParser.js)
 *   - ticksPerQuarter → beats conversion
 *   - Per-channel grouping (MIDI track → channel → notes[])
 *   - Mapping of channel → AccType via the profile's `channels[]`
 *   - Synthesizing the `ctab` block from `profile.channels[i].ctabDefault`
 *     plus source chord
 */

console.error('midi-to-native.mjs is not yet implemented.')
console.error('')
console.error('When you reach this step in the genre-style-builder workflow,')
console.error('ask Claude to implement the script. It needs:')
console.error('  - MIDI parsing (npm install midi-parser-js or similar)')
console.error('  - Profile-driven ctab assembly')
console.error('  - Output: public/styles-native/<category>/<id>.json + index update')
console.error('')
console.error('Until then, you can manually compose a style by:')
console.error('  1. Cloning the closest existing style with `sty-clone` skill,')
console.error('  2. Editing the resulting JSON\'s `parts[X].channels[Y].notes` arrays.')
process.exit(2)
