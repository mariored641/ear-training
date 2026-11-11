# Device state audit — Task 5

Storage keys below omit the `et.state.v1.` prefix. Every new record is `{v: 1, data: {...}}`. `.field` means a separately debounced field record. Existing named preset stores are neither migrated nor rewritten. Legacy `ear-training:last-state:<tool>` records are read as a migration fallback and left intact.

## Findings from the previous fix

Commit `b34302ac5c7df98eae85eeb12ec2f30f19174f05` already persisted backing chords to localStorage. It was **not** merely an in-memory cache. The new backing progression browser regression also passes on the untouched baseline `5d138bb` (including section navigation, reload, Cache Storage clearing, and reopening with the same browser storage). Consequently, the reported ordinary chord reset could not be reproduced on that baseline; there is no evidence to claim a preset-clobbering or initialization race as its root cause.

Confirmed gaps in the previous implementation:

* Live fretboard filters, library tab/search/filter, H3/M3 chip pools, H4 base type/tensions, F2 sequence length, F3 meter, dictation calibration, preset-name drafts and tuner mode were component memory and reset on unmount.
* Backing restoration and replacement used chord-array length as bar count. Two half-bar chords are two entries but one bar. Baseline reproduction: four visible bars with a split first bar were saved as `barCount: 5` / five chord entries (`beats: [2, 2]` for the split). The bar count is now preserved on restoration and calculated using durations on edits. Evidence: `/workspace/codex-night-11-12/screens/t5-baseline-evidence.json`.
* Stored object fields were spread over defaults without type checking; malformed JSON-shaped values could reach render/audio code. The shared store now validates against defaults; backing chord objects also receive domain validation.
* Several exercises generated **and played** their initial question during mount. Mount now prepares a question silently; explicit replay/answer-driven progression still plays.
* `Storage.clearAll()` previously called `localStorage.clear()`, which could erase presets and state if invoked. It now clears only exercise progress. No SW/update path clears localStorage.
* Writes were synchronous on every render/edit. The shared hook now debounces for 180 ms and flushes on unmount, pagehide and backgrounding so a quick route switch/close does not lose the pending edit.

## Tool audit

| Tool / tab | Durable state | Persisted before? | Fixed / retained now? | Storage key suffix |
|---|---|---|---|---|
| Backing Tracks | Complete chord objects, split durations, slash bass, key/mode, tempo, genre, bar count, mixer, repeats | Yes; bar-count/schema gaps | Yes | `backing-tracks` |
| Backing practice | Tempo/transpose practice configuration | Yes | Yes | `backing-practice` |
| Backing polyscale | Enabled, per-chord root/scale map | Yes | Yes | `backing-polyscale` |
| Backing live fretboard | Root, scale, display, fret range, string Set, standalone polyscale | No | Yes; Set serialized as an array | `backing-fretboard.<field>`, `backing-fretboard-strings` |
| Backing templates/library | Standards/My Progressions tab, library, search, favorites filter, name draft | Favorites only | Yes | `backing-ui.tab`, `backing-library.<field>`, `backing-saved-draft.saveName` |
| Rhythm Training parent | Selected tab, tempo, sound | Yes | Yes | `rhythm` |
| Rhythm Explorer | Beats, subdivision, meter, full editable grid, preset-name draft | Pattern yes; draft no | Yes | `rhythm-explorer`, `rhythm-explorer.presetName` |
| Polyrhythm | Every row, division and cell | Yes | Yes | `rhythm-polyrhythm` |
| Advanced Subdivisions | Every beat/tuplet/cell, preset-name draft | Pattern yes; draft no | Yes | `rhythm-advanced`, `rhythm-advanced.presetName` |
| Positions | Root, major/minor, positions, display, pentatonic, note language, selected tab | Yes | Yes | `positions` |
| Arpeggios | Selected arpeggios, hide roots, shared root/display | Yes | Yes | `positions` |
| All Scales | Root/scale, selected notes, highlights, overlays, display/language, fret range/strings | Yes | Yes | `positions-all-scales` |
| Partial Chords | Complete working progression and selected card; builder, display, fret, width; name draft | Yes, except name draft | Yes; old working payload is read, not overwritten | `positions-partial-sequence`, `positions-partial-builder`, `partial-preset-draft.presetName` |
| M1 | Level, instrument, reference, question count, note-name mode, chips | Yes | Yes; silent initialization | `exercise-m1`, `ear-settings.<legacy-setting>`, `levels.<legacy-level>` |
| M2 | Level, instrument, advancement, question count | Yes | Yes; silent initialization | `exercise-M2.numQuestions`, `ear-settings.<legacy-setting>`, `levels.<legacy-level>` |
| M3 | Level, instrument, advancement, reference, count, per-level chips | Chips no | Yes | `exercise-m3.chipsByLevel`, `exercise-M3.numQuestions`, shared settings/levels |
| H1 | Level, voicing, instrument, terminology, count | Yes | Yes; silent initialization | `exercise-h1`, shared settings/levels |
| H2 | Level, instrument, voicing, count | Yes | Yes; silent initialization | `exercise-H2.numQuestions`, shared settings/levels |
| H3 | Level, instrument, terminology, advancement, count, chip pool | Chips no | Yes | `exercise-h3.chipsByLevel`, `exercise-H3.numQuestions`, shared settings/levels |
| H4 | Level, instrument, count, base chord type, tension pool | Type/pool no | Yes; silent initialization | `exercise-h4`, `exercise-h4.<field>`, shared settings/levels |
| F0 | Level, key, instrument, advancement, count | Yes | Yes | `exercise-f0`, `exercise-F0.numQuestions`, shared settings/levels |
| F1 | Level, tonic, instrument, advancement, count | Yes | Yes | `exercise-f1`, `exercise-F1.numQuestions`, shared settings/levels |
| F2 | Level, key, display, instrument/reference, count, sequence length | Length no | Yes; silent initialization | `exercise-f2`, `exercise-f2.seqLength`, shared settings/levels |
| F3 | Level, meter, count | Meter no | Yes; silent initialization | `exercise-f3`, `exercise-f3.meter`, shared levels |
| F4 | Level, key, display, count, instrument/reference | Yes | Yes | `exercise-f4`, shared settings/levels |
| V1 | Level, count, instrument/reference | Yes | Yes; silent initialization | `exercise-v1`, shared settings/levels |
| V2 | Level, count, instrument, advancement/reference | Yes | Yes; silent initialization | `exercise-V2.numQuestions`, shared settings/levels |
| S1 | Level, count, instrument | Yes | Yes | `exercise-s1`, shared settings/levels |
| S2 | Level, count, reference | Yes | Yes; silent initialization | `exercise-S2.numQuestions`, shared settings/levels |
| G1 | Level, count, melody source, notation mode | Yes | Yes; silent initialization | `exercise-g1`, shared levels |
| R1 / R2 | Level, sound, chord duration, session duration, key, auto-reveal | Yes | Yes | `exercise-R1`, `exercise-R2`, shared levels; `reactive.autoReveal` (legacy fallback retained) |
| Legacy exercises 1 / 2 / 3 | All existing settings and custom level | Yes, unguarded JSON | Yes; safe migration; mount silent | `legacy-1`, `legacy-2`, `legacy-3` |
| Legacy exercises 4a / 4b / 4c | All settings and custom level | Yes | Yes; mount silent | `exercise-4a`, `exercise-4b`, `exercise-4c` |
| Rhythmic Dictation / Call & Response | Selected tab, all settings, level, device calibration | Settings yes; calibration no | Yes | `rhythm-training`, `rhythm-dictation.calibration` |
| Feedback | YouTube URL, diagram URL/tab, attached image/PDF draft | URLs only | Yes; attachment stored as data URL | `feedback-prep`, `feedback-prep.attachment` |
| Feedback recording | Recorded video draft; restored to a paused preview, never capture | No | Yes, periodic snapshots and completed take | `feedback-recording` |
| Floating recorder | Audio draft and duration; restored ready, microphone off | In memory during navigation only | Yes | `global-recording` |
| Looper | Tempo, meter, count-in, click volume, session metadata | IndexedDB only | Local settings added; existing audio/session IndexedDB retained | `looper`; IndexedDB `ear-training-looper` for binary tracks |
| Floating metronome | Tempo, beats/bar, keep-alive preference | Tempo/keep-alive only | Yes; running remains false | `global-tools.<field>` |
| Floating tuner | Chromatic/guitar mode | No | Yes; microphone not reopened by restoration | `tuner.mode` |
| Floating toolbar | Dock position | Yes | Retained | `global-tools.position` (legacy `globalTools.position.v1` retained) |
| Language | Hebrew/English text preference | Yes | Retained; layout remains LTR | Existing `ear-training:language` |
| SF2 comparison lab (diagnostic) | Per-library ratings and notes | Yes | Retained | Existing `sf2-lab:ratings:<id>`, `sf2-lab:notes:<id>` |
| Home / category hubs | Navigation links; no editable tool state | N/A | N/A | None |

Shared setting suffixes are `ear-settings.ear-training:<exercise>:<setting>` and `levels.ear-training:<exercise>:level`. Existing named stores remain `bt_my_progressions`, `bt_preset_favorites`, `rhythm_explorer_presets_local`, `advanced_subdivisions_presets_local`, and `partial_chords_presets_local`.

## Boundaries and verification

Playback/recording execution, microphone permissions, open modal overlays and generated quiz attempts are not resumed. Fretboard orientation and musical layout are unchanged. Feedback video and floating-recorder audio drafts are stored as base64 with MIME metadata in localStorage; periodic recording snapshots can recover the last completed chunk after interruption (up to about one second may be lost). They restore paused, without requesting microphone/camera permissions. Large media drafts can exceed localStorage quota; failed writes keep the live recording usable and never evict saved presets. Explicit device export remains available. Looper binary audio remains in its existing IndexedDB store because localStorage is not suitable for audio buffers. Browser quota/disabled storage is handled without crashing, but cannot promise durable writes when the browser rejects them.

Regression coverage includes unit round trips/migration, media bytes/MIME restoration, async discard safety, debounce flushing, floating metronome/tuner preferences, each ear exercise, every rhythm and positions tab, all legacy tools, rhythmic dictation, feedback draft, looper settings, corrupt state, old named presets, cache clearing, reopening, and stopped playback. The production backing regression is run separately after deployment. The final report records exact run counts and deployment evidence.
